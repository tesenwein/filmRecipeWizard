# Film Recipe Wizard

[![Version](https://img.shields.io/badge/version-2.2.1-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Releases](https://img.shields.io/github/v/release/tesenwein/filmRecipeWizard?include_prereleases&label=releases)](https://github.com/tesenwein/filmRecipeWizard/releases)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.9.2-blue.svg)](package.json)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Lint Status](https://img.shields.io/badge/lint-passing-brightgreen.svg)](#)

> **AI-Powered Color Recipe Creation for Professional Photography**

Transform your photo editing workflow with intelligent AI-driven color recipe creation. Film Recipe Wizard helps photographers achieve consistent, professional color grading by analyzing reference photos and generating industry-standard Lightroom presets and 3D LUTs.

## 📸 Screenshots

![Screenshot 1](assets/screenshots/screen1.png)
![Screenshot 2](assets/screenshots/screen2.png)

## 💻 Installation

### For Users (No Coding Required)

**Simply download and install the app:**

1. **Download** the latest version from [GitHub Releases](https://github.com/tesenwein/filmRecipeWizard/releases/latest)
   - **macOS**: Download the `.dmg` file (Universal - works on Intel and Apple Silicon Macs)
   - **Windows**: Download the `.exe` installer (x64)

2. **Install** the downloaded file:
   - **macOS**: Open the `.dmg` file and drag the app to your Applications folder
   - **Windows**: Run the `.exe` installer and follow the setup wizard

3. **Launch** the app and add your [OpenAI API key](https://platform.openai.com/api-keys) in Settings

## 🚀 Quick Start

1. **Setup**: Add your [OpenAI API key](https://platform.openai.com/api-keys) in Settings
2. **Create**: Upload target photos and describe your desired style
3. **Export**: Generate Lightroom XMP presets or 3D LUTs for your workflow

## ⚠️ macOS Installation Note

When installing on macOS, you may encounter a security warning that the app "cannot be opened because it is from an unidentified developer." This is because the app is not yet signed with an Apple Developer certificate.

**To install:**
1. Download the app normally
2. When you see the security warning, click "Cancel"
3. Go to **System Settings** → **Privacy & Security**
4. Find the app in the security section and click **"Open Anyway"**
5. Alternatively, right-click the app and select **"Open"** while holding the Control key

This is a standard macOS security feature for unsigned applications. The app is safe to use and open source.

## 🛠️ Development & Building

### Quick Start
```bash
git clone https://github.com/tesenwein/filmRecipeWizard.git
cd filmRecipeWizard
npm install
npm run dev  # Start development server
```

### Build Environment Check
Check what you can build on your system:
```bash
npm run check-env  # Shows available build targets for your platform
```

### Building for Distribution
```bash
npm run prepare:build    # Clean, build, and validate
npm run package:mac      # macOS (requires macOS)
npm run package:win      # Windows  
npm run package:linux    # Linux
```

📋 **For detailed build instructions, platform requirements, and troubleshooting, see [BUILD.md](BUILD.md)**

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Help Welcome

We welcome contributions, bug reports, and feature requests! Please see our [Contributing Guide](CONTRIBUTING.md) or [open an issue](https://github.com/tesenwein/filmRecipeWizard/issues).

---

*Made with ❤️ for photographers, by photographers*