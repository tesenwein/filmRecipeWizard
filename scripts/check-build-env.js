const os = require('os');
const fs = require('fs');
const path = require('path');

console.log('🔍 Film Recipe Wizard - Build Environment Check\n');

const platform = os.platform();
const arch = os.arch();

console.log(`📋 System Information:`);
console.log(`   Platform: ${platform}`);
console.log(`   Architecture: ${arch}`);
console.log(`   Node.js: ${process.version}`);
console.log('');

// Check available build targets
console.log('🎯 Available Build Targets:');

const targets = {
  all: 'All supported platforms',
  mac: 'macOS (universal binary)',
  'mac:dmg': 'macOS DMG installer',
  'mac:universal': 'macOS universal binary',
  win: 'Windows (installer + portable)',
  'win:nsis': 'Windows NSIS installer',
  'win:portable': 'Windows portable executable',
  linux: 'Linux (AppImage + deb)',
  'linux:appimage': 'Linux AppImage',
  'linux:deb': 'Linux Debian package'
};

// Platform compatibility
const compatibility = {
  darwin: ['mac', 'mac:dmg', 'mac:universal', 'win', 'win:nsis', 'win:portable', 'linux', 'linux:appimage', 'linux:deb', 'all'],
  win32: ['win', 'win:nsis', 'win:portable', 'linux', 'linux:appimage', 'linux:deb'],
  linux: ['linux', 'linux:appimage', 'linux:deb', 'win', 'win:nsis', 'win:portable']
};

const availableTargets = compatibility[platform] || [];

Object.entries(targets).forEach(([target, description]) => {
  const available = availableTargets.includes(target);
  const icon = available ? '✅' : '❌';
  console.log(`   ${icon} ${target.padEnd(15)} - ${description}`);
});

console.log('');

// Check dependencies
console.log('📦 Dependencies Check:');

const packageJsonPath = path.join(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('   ✅ package.json found');
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, '../node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('   ✅ node_modules installed');
  } else {
    console.log('   ❌ node_modules not found - run "npm install"');
  }
  
  // Check for optional dependencies
  const sharpPath = path.join(__dirname, '../node_modules/sharp');
  if (fs.existsSync(sharpPath)) {
    console.log('   ✅ sharp available (for icon generation)');
  } else {
    console.log('   ⚠️  sharp not available (icon generation may use fallback)');
  }
  
  if (platform === 'darwin') {
    const dmgLicensePath = path.join(__dirname, '../node_modules/dmg-license');
    if (fs.existsSync(dmgLicensePath)) {
      console.log('   ✅ dmg-license available (for macOS builds)');
    } else {
      console.log('   ⚠️  dmg-license not available (optional for macOS)');
    }
  }
} else {
  console.log('   ❌ package.json not found');
}

console.log('');

// Recommended commands
console.log('🚀 Recommended Commands:');
console.log('   Development:');
console.log('     npm run dev                 # Start development server');
console.log('     npm run build               # Build application');
console.log('     npm run validate-build      # Validate build output');
console.log('');
console.log('   Platform-specific packaging:');

availableTargets.forEach(target => {
  if (target !== 'all') {
    console.log(`     npm run package:${target.padEnd(12)} # ${targets[target]}`);
  }
});

console.log('');
console.log('   Cross-platform (if available):');
console.log('     npm run package:all         # Build for all platforms');

console.log('');

// Build tips
console.log('💡 Build Tips:');

if (platform === 'darwin') {
  console.log('   • macOS can build for all platforms');
  console.log('   • Use npm run package:mac:universal for Intel + Apple Silicon');
} else if (platform === 'win32') {
  console.log('   • Windows can build Windows and Linux packages');
  console.log('   • macOS builds require a Mac system');
} else if (platform === 'linux') {
  console.log('   • Linux can build Linux and Windows packages');
  console.log('   • macOS builds require a Mac system');
}

console.log('   • Use npm run prepare:build for validated builds');
console.log('   • Check BUILD.md for detailed documentation');
console.log('   • Use npm run clean to remove all build artifacts');

console.log('');