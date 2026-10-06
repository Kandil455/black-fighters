import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const SOURCE_ICON = path.resolve("public/icons/black-fighters-512.png");
const RES_DIR = path.resolve("android/app/src/main/res");

const TIERS = [
  { name: "mipmap-mdpi", launcher: 48, foreground: 108 },
  { name: "mipmap-hdpi", launcher: 72, foreground: 162 },
  { name: "mipmap-xhdpi", launcher: 96, foreground: 216 },
  { name: "mipmap-xxhdpi", launcher: 144, foreground: 324 },
  { name: "mipmap-xxxhdpi", launcher: 192, foreground: 432 },
];

console.log("Generating Android App Icons from:", SOURCE_ICON);

for (const tier of TIERS) {
  const dir = path.join(RES_DIR, tier.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const launcherPath = path.join(dir, "ic_launcher.png");
  const roundPath = path.join(dir, "ic_launcher_round.png");
  const fgPath = path.join(dir, "ic_launcher_foreground.png");

  // Generate standard launcher icon
  execSync(`sips -z ${tier.launcher} ${tier.launcher} "${SOURCE_ICON}" --out "${launcherPath}"`, { stdio: "ignore" });
  execSync(`sips -z ${tier.launcher} ${tier.launcher} "${SOURCE_ICON}" --out "${roundPath}"`, { stdio: "ignore" });

  // Generate adaptive foreground icon
  execSync(`sips -z ${tier.foreground} ${tier.foreground} "${SOURCE_ICON}" --out "${fgPath}"`, { stdio: "ignore" });

  console.log(`✅ Generated ${tier.name} (Launcher: ${tier.launcher}px, FG: ${tier.foreground}px)`);
}

console.log("🎉 All Android launcher icons generated successfully!");
