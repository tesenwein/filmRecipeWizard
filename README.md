# Foto Recipe Wizard

[![Build and Release](https://github.com/tesenwein/fotoRecipeWizard/actions/workflows/build-and-release.yml/badge.svg)](https://github.com/tesenwein/fotoRecipeWizard/actions/workflows/build-and-release.yml)
[![PR Validation](https://github.com/tesenwein/fotoRecipeWizard/actions/workflows/pr-check.yml/badge.svg)](https://github.com/tesenwein/fotoRecipeWizard/actions/workflows/pr-check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/tesenwein/fotoRecipeWizard)](https://github.com/tesenwein/fotoRecipeWizard/releases)
[![Platform Support](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)](https://github.com/tesenwein/fotoRecipeWizard/releases)

> **AI-Powered Color Recipe Creation for Professional Photography**

Transform your photo editing workflow with intelligent AI-driven color recipe creation. Foto Recipe Wizard helps photographers achieve consistent, professional color grading by analyzing reference photos and generating industry-standard Lightroom presets and 3D LUTs.

![Foto Recipe Wizard Interface](https://raw.githubusercontent.com/tesenwein/fotoRecipeWizard/master/docs/images/app-overview.png)

## ✨ Key Features

### 🤖 **AI-Powered Color Intelligence**
- **OpenAI Vision Integration**: Advanced computer vision for precise color analysis
- **Intelligent Style Matching**: AI understands artistic intent beyond pixel values
- **Confidence Scoring**: Each analysis includes AI confidence ratings
- **Natural Language Reasoning**: AI explains color decisions in plain English

### 🎨 **Professional Color Grading**
- **Lightroom XMP Export**: Industry-standard preset generation
- **3D LUT Generation**: .cube, .3dl, and DaVinci .lut formats
- **Advanced HSL Controls**: Precise hue, saturation, and luminance adjustments
- **Complete Tone Control**: Exposure, highlights, shadows, whites, blacks
- **Color Grading Wheels**: Professional shadows, midtones, and highlights

### 🎭 **Artistic Style Presets**
- **Famous Photographers**: Annie Leibovitz, Ansel Adams, Henri Cartier-Bresson, and more
- **Film Stock Emulation**: Kodak Portra, Fuji Velvia, Ilford HP5, and classic cinema stocks
- **Fine-Tune Controls**: Warmth, tint, contrast, vibrance, moodiness, and film grain

### 📁 **Recipe Management**
- **Recipe History**: Save and revisit your color recipe sessions
- **Version Control**: Generate multiple variations with the same images
- **Recipe Images**: Use branding or film pack images to identify recipes
- **Metadata Preservation**: Complete recipe history with AI analysis notes

### 🖼️ **Universal Format Support**
- **RAW Formats**: DNG, CR2, CR3, NEF, ARW, ORF, RW2, RAF, and more
- **Standard Formats**: JPEG, PNG, TIFF, WebP, HEIC
- **Smart Previews**: Automatic preview generation for all formats
- **Non-Destructive**: Original files remain completely untouched

## 📦 Download & Installation

### Quick Install

Choose your platform and download the latest release:

| Platform | Download | Format |
|----------|----------|--------|
| **macOS** | [Download DMG](https://github.com/tesenwein/fotoRecipeWizard/releases/latest) | Universal (Intel + Apple Silicon) |
| **Windows** | [Download EXE](https://github.com/tesenwein/fotoRecipeWizard/releases/latest) | Installer |

### System Requirements

- **macOS**: 10.15 (Catalina) or later
- **Windows**: Windows 10 version 1903 or later
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 200MB free space
- **Internet**: Required for AI processing (OpenAI API)

## 🔑 Setup

### OpenAI API Key (Required)

1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Launch Foto Recipe Wizard → Settings → Enter API key
4. Your key is stored locally and encrypted

**Pricing**: ~$0.01-0.05 per image analysis • [OpenAI Pricing Details](https://openai.com/pricing)

## 🚀 Quick Start

### 1. Create Your First Recipe
- Launch the app and click **"Create New Recipe"**
- The AI Color Matching Studio opens with professional interface

### 2. Configure Your Style
- **Recipe Image**: Upload a branding image or film pack (optional)
- **Target Images**: Select photos to process (drag & drop supported)
- **Style Prompt**: Describe your desired look in natural language
- **Artistic Styles**: Choose from famous photographers (Leibovitz, Adams, etc.)
- **Film Styles**: Select from classic film stocks (Portra 400, Velvia 50, etc.)
- **Fine-Tune**: Adjust warmth, tint, contrast, vibrance, and moodiness

### 3. AI Processing
- Click **"Start Processing"** to begin AI analysis
- Real-time progress with status updates
- AI generates professional color adjustments

### 4. Review & Export
- **Overview Tab**: See AI analysis, confidence scores, and applied settings
- **Adjustments Tab**: Detailed breakdown of all color modifications
- **Lightroom Export**: Generate XMP sidecars for Lightroom/Photoshop
- **LUT Export**: Create 3D LUTs for DaVinci, Final Cut Pro, and other software

## 🎯 Professional Workflows

### Portrait Photography
```
Recipe Image: Studio lighting reference
Target Images: Portrait session batch
Style: "Natural skin tones, warm highlights"
Export: XMP presets for Lightroom batch processing
```

### Wedding Photography
```
Recipe Image: Film stock branding
Artistic Style: Irving Penn
Film Style: Kodak Portra 400
Fine-Tune: Warmth +20, Moodiness +15
```

### Commercial Photography
```
Style Prompt: "Brand-consistent colors, clean whites"
Export: 3D LUTs for video color grading
Target: Product photography batch
```

## 🛠️ Development

### Build from Source

```bash
# Clone repository
git clone https://github.com/tesenwein/fotoRecipeWizard.git
cd fotoRecipeWizard

# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package:mac        # macOS
npm run package            # All supported platforms
```

### Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development with hot reload |
| `npm run build` | Build for production |
| `npm run typecheck` | TypeScript validation |
| `npm run lint` | Code linting and fixes |
| `npm run knip` | Find unused dependencies |
| `npm test` | Run test suite |
| `npm run package:mac:dmg` | Create macOS DMG installer |

### Tech Stack

- **Framework**: Electron + TypeScript
- **UI**: React + Material-UI (MUI)
- **Image Processing**: Sharp (high-performance)
- **AI**: OpenAI GPT-4 Vision API
- **Build**: webpack + electron-builder

## 🔄 CI/CD Pipeline

This project uses GitHub Actions for automated building and releasing:

- **Conventional Commits**: `feat:`, `fix:`, `chore:` trigger appropriate version bumps
- **Multi-Platform Builds**: Automatic macOS and Windows builds
- **Semantic Versioning**: Automated version management
- **Release Creation**: GitHub releases with changelogs and download links
- **PR Validation**: Automated testing and code quality checks

### Commit Convention

```bash
feat: add new LUT export feature       # Minor version bump
fix: resolve blue tinting in LUTs      # Patch version bump
chore: update dependencies             # No version bump (dev build)
docs: update README                    # No version bump (dev build)

# Breaking changes trigger major version bump
feat!: redesign color processing API
```

## 📊 Project Status

### Current Version: 1.0.0
- ✅ Core AI color matching functionality
- ✅ Lightroom XMP export
- ✅ 3D LUT generation (.cube, .3dl, .lut)
- ✅ Recipe management system
- ✅ Professional artistic and film style presets
- ✅ Multi-platform support (macOS, Windows)

### Planned Features
- [ ] Batch preset application to new images
- [ ] Cloud recipe syncing
- [ ] Advanced AI model options
- [ ] Video color matching support
- [ ] Collaborative recipe sharing
- [ ] GPU acceleration for faster processing

## 🆘 Support

### Common Issues

**Installation**
- **macOS**: If blocked by Gatekeeper, right-click → Open, then click "Open" in dialog
- **Windows**: Windows Defender may flag unsigned executable - click "More info" → "Run anyway"

**API Issues**
- **"API key not configured"**: Enter valid OpenAI API key in Settings
- **"Insufficient credits"**: Check OpenAI billing and add credits
- **"Network error"**: Verify internet connection

**Performance**
- **Slow processing**: Normal processing time is 10-30 seconds per image
- **Memory issues**: Ensure 8GB+ RAM for large RAW files
- **Preview not loading**: Some formats require conversion (processing unaffected)

### Get Help

- 🐛 **[Report Issues](https://github.com/tesenwein/fotoRecipeWizard/issues/new?template=bug_report.md)**
- 💡 **[Request Features](https://github.com/tesenwein/fotoRecipeWizard/issues/new?template=feature_request.md)**
- 💬 **[GitHub Discussions](https://github.com/tesenwein/fotoRecipeWizard/discussions)**
- 📖 **[Documentation](https://github.com/tesenwein/fotoRecipeWizard/wiki)**

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Follow conventional commits: `git commit -m 'feat: add amazing feature'`
4. Push changes: `git push origin feat/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[OpenAI](https://openai.com)** for GPT-4 Vision API
- **[Sharp](https://sharp.pixelplumbing.com)** for high-performance image processing
- **[Electron](https://electronjs.org)** for cross-platform desktop framework
- **[Material-UI](https://mui.com)** for beautiful React components
- Photography community for invaluable feedback and testing

---

**Transform your photo editing workflow with AI-powered color intelligence.**

*Made with ❤️ for photographers, by photographers*