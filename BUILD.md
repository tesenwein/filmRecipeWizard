# Build Process Documentation

This document describes the enhanced build system for Film Recipe Wizard, an Electron application that supports Mac, Windows, and Linux platforms.

## Quick Start

### Basic Development
```bash
npm install          # Install dependencies
npm run dev         # Start development with live reload
```

### Building for Distribution
```bash
npm run prepare:build     # Clean, build, and validate
npm run package:mac      # Package for macOS
npm run package:win      # Package for Windows
npm run package:linux    # Package for Linux
```

## Build Commands

### Development Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build application (no cleaning)
- `npm run watch:main` - Watch main process TypeScript files
- `npm run watch:renderer` - Watch renderer process files

### Build Preparation
- `npm run clean` - Remove all build artifacts (dist/, build/, release/)
- `npm run prepare:build` - Clean → Build → Validate (recommended for packaging)

### Platform-Specific Packaging
- `npm run package:mac` - macOS universal binary (.dmg and .zip)
- `npm run package:mac:dmg` - macOS DMG installer only
- `npm run package:mac:universal` - macOS universal binary

- `npm run package:win` - Windows installer (.exe) and portable
- `npm run package:win:nsis` - Windows NSIS installer only
- `npm run package:win:portable` - Windows portable executable

- `npm run package:linux` - Linux packages (.AppImage and .deb)
- `npm run package:linux:appimage` - Linux AppImage only
- `npm run package:linux:deb` - Linux Debian package only

- `npm run package:all` - Build for all platforms (requires platform-specific tools)

### Validation and Quality
- `npm run validate-build` - Verify build output integrity
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - ESLint with auto-fix
- `npm run lint:check` - ESLint check-only mode

## Build Architecture

### Directory Structure
```
├── src/                    # Source code
│   ├── main/              # Electron main process
│   ├── renderer/          # React renderer process
│   ├── shared/            # Shared types and utilities
│   └── services/          # Business logic services
├── dist/                  # Compiled output
│   ├── main/              # Compiled main process
│   ├── renderer/          # Webpack bundled renderer
│   ├── services/          # Compiled services
│   └── shared/            # Compiled shared code
├── build/                 # Build resources
│   └── icons/             # Generated app icons
├── release/               # Final packaged applications
└── scripts/               # Build and maintenance scripts
```

### Build Process Flow
1. **Clean**: Remove old build artifacts
2. **Icon Generation**: Create platform-specific icons from SVG
3. **TypeScript Compilation**: Compile main process and services
4. **Webpack Build**: Bundle renderer process (React app)
5. **Validation**: Verify all required files are present
6. **Packaging**: Create platform-specific installers

## Platform-Specific Features

### macOS
- Universal binaries (Intel + Apple Silicon)
- DMG installer with drag-and-drop
- ZIP archive for alternative distribution
- No code signing (disabled for CI/open source)

### Windows
- NSIS installer with user options
- Portable executable
- Both x64 and x86 architecture support
- Desktop and Start Menu shortcuts
- Uninstaller with app data preservation option

### Linux
- AppImage for universal compatibility
- Debian package (.deb) for Ubuntu/Debian systems
- x64 architecture support

## Dependencies

### Required Dependencies
- `electron` - Electron framework
- `electron-builder` - Multi-platform packaging
- `typescript` - TypeScript compiler
- `webpack` - Module bundler for renderer
- `sharp` - Image processing for icon generation

### Optional Dependencies
- `dmg-license` - macOS DMG license support (macOS only)

### Platform-Specific Tools
The build system automatically handles platform-specific dependencies:
- macOS: Xcode Command Line Tools
- Windows: Windows SDK (for icon resources)
- Linux: Standard development tools

## Environment Variables

### Build Configuration
- `CSC_IDENTITY_AUTO_DISCOVERY=false` - Disable code signing
- `GH_TOKEN` - GitHub token for release uploads

### Development
- `NODE_ENV=development` - Development mode
- `ELECTRON_IS_DEV=true` - Electron development features

## Troubleshooting

### Common Issues

#### "dmg-license not supported on this platform"
This is expected on non-macOS systems. The dependency is optional and only needed for macOS DMG generation.

#### "Sharp installation failed"
Run `npm rebuild sharp` to rebuild for your current platform.

#### Build validation fails
- Ensure all source files are present
- Check TypeScript compilation errors
- Verify webpack bundle generation
- Run `npm run build` manually to see detailed errors

#### Icon generation fails
- Verify `assets/icons/icon.svg` exists
- Install Sharp: `npm install sharp`
- Check icon permissions and file format

### Build Optimization

#### Reducing Bundle Size
- Use production builds: `NODE_ENV=production npm run build`
- Analyze bundle: Add webpack-bundle-analyzer if needed
- Optimize images in assets/

#### Improving Build Speed
- Use incremental builds during development
- Enable TypeScript build cache
- Consider using esbuild for faster compilation

## CI/CD Integration

The build system is designed for automated CI/CD:

### GitHub Actions
- PR validation with build testing
- Multi-platform release builds
- Automatic artifact generation
- Release management

### Platform Runners
- `macos-latest` for macOS builds
- `windows-latest` for Windows builds
- `ubuntu-latest` for Linux builds and validation

## Maintenance

### Updating Dependencies
```bash
npm update                    # Update to latest compatible versions
npm audit                     # Check for security issues
npm run knip                 # Find unused dependencies
```

### Icon Updates
1. Update `assets/icons/icon.svg`
2. Run `npm run generate-icons`
3. Verify generated icons in `build/icons/`

### Build Script Maintenance
- `scripts/generate-icons.js` - Icon generation logic
- `scripts/validate-build.js` - Build validation
- Package.json scripts - Build command definitions