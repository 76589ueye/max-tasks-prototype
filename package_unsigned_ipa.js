const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function createUnsignedIpa() {
  console.log('Creating unsigned iOS prototype package...');
  
  const rootDir = __dirname;
  const buildDir = path.join(rootDir, 'build');
  const payloadDir = path.join(buildDir, 'Payload');
  const appDir = path.join(payloadDir, 'MaxTasks.app');
  
  // Clean & create directories
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(appDir, { recursive: true });
  
  // Write Info.plist with correct bundle identifier
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleExecutable</key>
	<string>MaxTasks</string>
	<key>CFBundleIdentifier</key>
	<string>com.tryvaultline.maxprototype</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>MaxTasks</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UIDeviceFamily</key>
	<array>
		<integer>1</integer>
	</array>
</dict>
</plist>
`;
  
  fs.writeFileSync(path.join(appDir, 'Info.plist'), plistContent);
  
  // Create dummy executable
  fs.writeFileSync(path.join(appDir, 'MaxTasks'), 'DUMMY_BINARY');
  
  // Zip the Payload folder into MaxTasks.ipa
  const zipPath = path.join(rootDir, 'MaxTasks.zip');
  const ipaPath = path.join(rootDir, 'MaxTasks.ipa');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  if (fs.existsSync(ipaPath)) {
    fs.unlinkSync(ipaPath);
  }
  
  // Run PowerShell zip command on Windows
  console.log('Compressing Payload directory into MaxTasks.zip...');
  const zipCmd = `powershell -Command "Compress-Archive -Path '${payloadDir}' -DestinationPath '${zipPath}'"`;
  execSync(zipCmd, { cwd: rootDir });
  
  // Rename zip to ipa
  console.log('Renaming MaxTasks.zip to MaxTasks.ipa...');
  fs.renameSync(zipPath, ipaPath);
  
  console.log(`Successfully generated unsigned IPA package at: ${ipaPath}`);
}

createUnsignedIpa().catch(err => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
