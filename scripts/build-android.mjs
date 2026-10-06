import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "android-twa");
const artifactsDir = path.join(root, "artifacts");
const hostPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function requiredHostName() {
  const hostName = process.env.TWA_HOST_NAME?.trim() || "iiiak-study-app.vercel.app";
  if (!hostPattern.test(hostName)) {
    throw new Error("TWA_HOST_NAME must be a hostname only (no https://, path, port, query, or fragment).");
  }
  return hostName;
}

async function requiredKeystorePath() {
  const configured = process.env.TWA_KEYSTORE_PATH?.trim()
    || path.join(os.homedir(), ".android", "iiiak-release.keystore");
  const keystorePath = path.resolve(configured);
  let details;
  try {
    details = await stat(keystorePath);
  } catch {
    throw new Error("TWA_KEYSTORE_PATH does not point to an existing keystore file.");
  }
  if (!details.isFile()) throw new Error("TWA_KEYSTORE_PATH must point to a file.");
  return keystorePath;
}

function signingPassword() {
  try {
    const password = execFileSync("security", [
      "find-generic-password",
      "-a", "iiiak",
      "-s", "IIIAK_ANDROID_KEYSTORE",
      "-w",
    ], { encoding: "utf8" }).trim();
    if (!password) throw new Error("empty password");
    return password;
  } catch {
    throw new Error(
      "IIIAK Android signing password is missing from macOS Keychain. "
      + "Add it with account iiiak and service IIIAK_ANDROID_KEYSTORE.",
    );
  }
}

const hostName = requiredHostName();
const keystorePath = await requiredKeystorePath();
const keyAlias = process.env.TWA_KEY_ALIAS?.trim() || "iiiak";
const password = signingPassword();
const buildDir = await mkdtemp(path.join(os.tmpdir(), "iiiak-android-build-"));

try {
  // Gradle/JDK cannot decode the emoji in the workspace path, so build from an
  // isolated ASCII-only path and copy only the signed artifacts back.
  await cp(androidDir, buildDir, { recursive: true });

  const origin = `https://${hostName}`;
  const manifestPath = path.join(buildDir, "twa-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.packageId = "app.iiiak.study";
  manifest.host = hostName;
  manifest.name = "IIIAK Study App";
  manifest.launcherName = "IIIAK";
  manifest.startUrl = "/";
  manifest.iconUrl = `${origin}/icons/aik-512.png`;
  manifest.maskableIconUrl = `${origin}/icons/aik-512.png`;
  manifest.webManifestUrl = `${origin}/manifest.webmanifest`;
  manifest.fullScopeUrl = `${origin}/`;
  manifest.signingKey = { path: keystorePath, alias: keyAlias };
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(manifestPath, manifestJson);
  await writeFile(
    path.join(buildDir, "manifest-checksum.txt"),
    createHash("sha1").update(manifestJson).digest("hex"),
  );

  console.log(`Building IIIAK Android package for ${hostName}`);
  const build = spawn("npx", ["--yes", "@bubblewrap/cli", "build"], {
    cwd: buildDir,
    env: {
      ...process.env,
      BUBBLEWRAP_KEYSTORE_PASSWORD: password,
      BUBBLEWRAP_KEY_PASSWORD: password,
    },
    stdio: "inherit",
  });

  const exitCode = await new Promise((resolve, reject) => {
    build.once("error", reject);
    build.once("exit", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) throw new Error(`IIIAK Android build failed with exit code ${exitCode}`);

  await mkdir(artifactsDir, { recursive: true });
  const outputs = [
    ["app-release-signed.apk", "IIIAK-v1-signed.apk"],
    ["app-release-bundle.aab", "IIIAK-v1-release.aab"],
  ];
  const checksums = [];
  for (const [sourceName, targetName] of outputs) {
    const source = path.join(buildDir, sourceName);
    const target = path.join(artifactsDir, targetName);
    await copyFile(source, target);
    const info = await stat(target);
    const digest = createHash("sha256").update(await readFile(target)).digest("hex");
    checksums.push(`${digest}  ${targetName}`);
    console.log(`IIIAK ${targetName}: ${(info.size / 1024 / 1024).toFixed(2)} MB`);
  }
  await writeFile(path.join(artifactsDir, "SHA256SUMS.txt"), `${checksums.join("\n")}\n`);
} finally {
  await rm(buildDir, { recursive: true, force: true });
}
