const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Image Match application...\n');

// Start the application
const app = spawn('npm', ['start'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

app.on('close', (code) => {
  console.log(`\n📊 Application exited with code ${code}`);
});

app.on('error', (error) => {
  console.error('❌ Failed to start application:', error.message);
});

console.log('✅ Application started successfully!');
console.log('📝 Features available:');
console.log('   • Drag & drop image upload (DNG, JPG, PNG, TIFF, CR2, NEF, ARW)');
console.log('   • Color analysis and style matching');
console.log('   • Batch processing capabilities');
console.log('   • Lightroom XMP preset generation');
console.log('   • Advanced color algorithms with LAB color space');
console.log('   • Modern responsive UI with progress tracking\n');