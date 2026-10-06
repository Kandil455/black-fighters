import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distPackages = path.join(rootDir, 'dist-packages');

console.log('🚀 [IIIAK ECOSYSTEM] Starting unified multi-platform build...');

if (!fs.existsSync(distPackages)) {
  fs.mkdirSync(distPackages, { recursive: true });
}

// 1. Build Desktop Launcher (IIIAK_Desktop.exe)
console.log('\n🖥️ [1/3] Building Windows Executable (IIIAK_Desktop.exe)...');
const desktopSrcDir = path.join(distPackages, 'desktop-src');
if (!fs.existsSync(desktopSrcDir)) {
  fs.mkdirSync(desktopSrcDir, { recursive: true });
}

const goCode = `package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

func main() {
	targetURL := "https://blackfighters.site"

	if runtime.GOOS == "windows" {
		edgePaths := []string{
			filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"),
			filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"),
			filepath.Join(os.Getenv("LocalAppData"), "Microsoft", "Edge", "Application", "msedge.exe"),
		}

		for _, p := range edgePaths {
			if _, err := os.Stat(p); err == nil {
				cmd := exec.Command(p, fmt.Sprintf("--app=%s", targetURL), "--window-size=1280,820", "--disable-features=Translate")
				if err := cmd.Start(); err == nil {
					return
				}
			}
		}

		chromePaths := []string{
			filepath.Join(os.Getenv("ProgramFiles"), "Google", "Chrome", "Application", "chrome.exe"),
			filepath.Join(os.Getenv("ProgramFiles(x86)"), "Google", "Chrome", "Application", "chrome.exe"),
			filepath.Join(os.Getenv("LocalAppData"), "Google", "Chrome", "Application", "chrome.exe"),
		}

		for _, p := range chromePaths {
			if _, err := os.Stat(p); err == nil {
				cmd := exec.Command(p, fmt.Sprintf("--app=%s", targetURL), "--window-size=1280,820")
				if err := cmd.Start(); err == nil {
					return
				}
			}
		}

		exec.Command("rundll32", "url.dll,FileProtocolHandler", targetURL).Start()
		return
	}

	exec.Command("open", targetURL).Start()
}
`;

fs.writeFileSync(path.join(desktopSrcDir, 'main.go'), goCode);
const exeOut = path.join(distPackages, 'IIIAK_Desktop.exe');
try {
  execSync(`go build -ldflags="-s -w -H windowsgui" -o "${exeOut}" main.go`, {
    cwd: desktopSrcDir,
    env: { ...process.env, GOOS: 'windows', GOARCH: 'amd64' }
  });
  console.log('✅ IIIAK_Desktop.exe built successfully!');
} catch (e) {
  console.error('❌ Failed building IIIAK_Desktop.exe:', e.message);
}

// 2. Build iOS IPA & MobileConfig Profile
console.log('\n🍏 [2/3] Packaging iOS Artifacts (IIIAK_Study.ipa & IIIAK_Study.mobileconfig)...');
const icon512Path = path.join(rootDir, 'public/icons/aik-512.png');
const icon192Path = path.join(rootDir, 'public/icons/aik-192.png');
const iconBase64 = fs.readFileSync(icon512Path).toString('base64');

// MobileConfig
const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>Icon</key>
            <data>
${iconBase64}
            </data>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>IIIAK</string>
            <key>PayloadDescription</key>
            <string>IIIAK Study System for iOS</string>
            <key>PayloadDisplayName</key>
            <string>IIIAK WebClip</string>
            <key>PayloadIdentifier</key>
            <string>app.iiiak.study.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>${crypto.randomUUID()}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>https://blackfighters.site</string>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>IIIAK Study Ecosystem iOS Standalone App Profile</string>
    <key>PayloadDisplayName</key>
    <string>IIIAK Study</string>
    <key>PayloadIdentifier</key>
    <string>app.iiiak.study.profile</string>
    <key>PayloadOrganization</key>
    <string>IIIAK</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${crypto.randomUUID()}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

fs.writeFileSync(path.join(distPackages, 'IIIAK_Study.mobileconfig'), mobileconfig);

// IPA
const ipaDir = path.join(distPackages, 'ios-ipa');
const payloadAppDir = path.join(ipaDir, 'Payload/IIIAK.app');
fs.rmSync(ipaDir, { recursive: true, force: true });
fs.mkdirSync(payloadAppDir, { recursive: true });

const iosEntrySrc = path.join(desktopSrcDir, 'ios_entry.c');
const iosRawBin = path.join(desktopSrcDir, 'IIIAK_ios_raw');
const iosFinalBin = path.join(payloadAppDir, 'IIIAK');

try {
  execSync(`clang -target arm64-apple-ios14.0-macabi -lobjc "${iosEntrySrc}" -o "${iosRawBin}"`);
  execSync(`vtool -set-build-version ios 14.0 16.0 -replace -output "${iosFinalBin}" "${iosRawBin}"`);
  fs.chmodSync(iosFinalBin, 0o755);

  fs.copyFileSync(icon512Path, path.join(payloadAppDir, 'AppIcon512.png'));
  fs.copyFileSync(icon192Path, path.join(payloadAppDir, 'AppIcon60x60@3x.png'));
  fs.copyFileSync(icon192Path, path.join(payloadAppDir, 'AppIcon60x60@2x.png'));

  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>IIIAK</string>
    <key>CFBundleExecutable</key>
    <string>IIIAK</string>
    <key>CFBundleIdentifier</key>
    <string>app.iiiak.study</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>IIIAK</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>MinimumOSVersion</key>
    <string>14.0</string>
    <key>UIDeviceFamily</key>
    <array>
        <integer>1</integer>
        <integer>2</integer>
    </array>
    <key>UIRequiredDeviceCapabilities</key>
    <array>
        <string>arm64</string>
    </array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>`;

  fs.writeFileSync(path.join(payloadAppDir, 'Info.plist'), infoPlist);

  const ipaOut = path.join(distPackages, 'IIIAK_Study.ipa');
  execSync(`zip -r -q "${ipaOut}" Payload/`, { cwd: ipaDir });
  console.log('✅ IIIAK_Study.ipa & IIIAK_Study.mobileconfig built successfully!');
} catch (e) {
  console.error('❌ Failed building IIIAK_Study.ipa:', e.message);
}

// 3. Build Android APK (IIIAK_Study.apk)
console.log('\n📱 [3/3] Building Android APK (IIIAK_Study.apk)...');
const androidTwaDir = path.join(rootDir, 'android-twa');
try {
  execSync('./gradlew assembleRelease --offline', {
    cwd: androidTwaDir,
    env: {
      ...process.env,
      JAVA_HOME: '/opt/homebrew/opt/openjdk@17',
      ANDROID_HOME: '/opt/homebrew/share/android-commandlinetools',
      JAVA_TOOL_OPTIONS: '-Duser.language=en -Duser.country=US'
    },
    stdio: 'inherit'
  });

  const releaseApkPath = path.join(androidTwaDir, 'app/build/outputs/apk/release/app-release.apk');
  const unsignedApkPath = path.join(androidTwaDir, 'app/build/outputs/apk/release/app-release-unsigned.apk');
  const targetApk = path.join(distPackages, 'IIIAK_Study.apk');

  if (fs.existsSync(releaseApkPath)) {
    fs.copyFileSync(releaseApkPath, targetApk);
    console.log('✅ IIIAK_Study.apk (signed release) created successfully!');
  } else if (fs.existsSync(unsignedApkPath)) {
    fs.copyFileSync(unsignedApkPath, targetApk);
    console.log('✅ IIIAK_Study.apk (release) created successfully!');
  }
} catch (e) {
  console.error('⚠️ Note on Android build:', e.message);
}

// Final Summary
console.log('\n======================================================');
console.log('🔥 [IIIAK ECOSYSTEM PACKAGES READY IN dist-packages/]');
console.log('======================================================');
const files = fs.readdirSync(distPackages).filter(f => fs.statSync(path.join(distPackages, f)).isFile());
for (const file of files) {
  const fPath = path.join(distPackages, file);
  const stat = fs.statSync(fPath);
  console.log(` 📦 ${file.padEnd(28)} ${(stat.size / 1024).toFixed(1)} KB`);
}
console.log('======================================================\n');
