# Image Match ✨

> **AI-Powered Color Matching for Professional Photo Workflows**

Transform your photo editing workflow with intelligent AI-driven color analysis and matching. Image Match helps photographers, designers, and content creators achieve consistent color grading across multiple images by analyzing reference photos and generating professional-grade Lightroom presets.

![Image Match Screenshot](docs/images/app-screenshot.png)

## 🚀 Key Features

### 🤖 **AI-Powered Analysis**
- **OpenAI Vision Integration**: Advanced computer vision for precise color analysis
- **Intelligent Color Matching**: AI understands artistic intent, not just pixel values  
- **Confidence Scoring**: Each analysis includes AI confidence ratings
- **Natural Language Reasoning**: AI explains its color decisions in plain English

### 🎨 **Professional Color Grading**
- **Complete Lightroom Integration**: Generate industry-standard XMP presets
- **Advanced HSL Controls**: Precise hue, saturation, and luminance adjustments
- **Color Grading Wheels**: Professional shadows, midtones, and highlights control
- **Tone Curve Adjustments**: Custom parametric and point curve modifications

### 📁 **Flexible Workflow**
- **Project Management**: Save, organize, and revisit your color matching sessions
- **Version Control**: Generate multiple variations with the same source images
- **Batch Processing**: Match colors across multiple images simultaneously
- **History Tracking**: Complete project history with timestamps and metadata

### 🖼️ **Universal Format Support**
- **RAW Formats**: DNG, CR2, CR3, NEF, ARW, ORF, RW2, RAF, and more
- **Standard Formats**: JPEG, PNG, TIFF, WebP
- **Smart Previews**: Automatic preview generation for unsupported display formats
- **Non-Destructive**: Original files remain untouched

## 📥 Installation

### Option 1: Download Release (Recommended)
1. Visit the [Releases page](https://github.com/your-repo/imageMatch/releases)
2. Download the latest `.dmg` file for macOS
3. Drag Image Match to your Applications folder
4. Launch and enter your OpenAI API key when prompted

### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/your-repo/imageMatch.git
cd imageMatch

# Install dependencies
npm install

# Build and run
npm run build
npm start
```

## 🔑 Setup Requirements

### OpenAI API Key (Required)
Image Match requires an OpenAI API key for AI-powered color analysis:

1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Launch Image Match and enter your key in Settings
4. Your key is stored locally and never shared

**Cost**: Typical usage costs ~$0.01-0.05 per image analysis.

## 📖 How to Use

### Quick Start Guide

1. **🏠 Launch Image Match**
   - The app opens to your project history
   - Click "Create First Project" to get started

2. **📂 Select Your Images**
   - Choose a **reference image** (the style you want to match)
   - Select **target images** (photos to apply the style to)
   - Supports drag-and-drop for easy file selection

3. **🤖 AI Analysis**
   - Click "Start Processing" to begin AI analysis
   - Watch real-time progress as AI analyzes color relationships
   - Review confidence scores and AI reasoning

4. **🎛️ Export Settings**
   - Choose which adjustments to include in your Lightroom preset
   - Options: Basic adjustments, HSL, Color Grading, Tone Curves, etc.
   - Click "Export XMP" to save your Lightroom preset

5. **📁 Project Management**
   - All projects are automatically saved
   - Generate new versions with "New Processing Session"
   - Access your history anytime from the home screen

### Advanced Workflows

#### **For Portrait Photographers**
- Use consistent studio lighting shots as references
- Match skin tones across wedding or event photo series
- Create signature color looks for your brand

#### **For Content Creators**
- Establish consistent brand colors across social media
- Match product photos to brand guidelines
- Create cohesive Instagram feed aesthetics

#### **For Wedding Photographers**
- Match ceremony and reception lighting conditions
- Create consistent albums across different venues
- Develop signature wedding color grades

## 🛠️ Technical Architecture

### Built With Modern Technologies
- **Electron**: Cross-platform desktop application framework
- **TypeScript**: Full type safety and modern JavaScript features
- **React**: Component-based UI with Material-UI components
- **Sharp**: High-performance image processing
- **OpenAI GPT-4 Vision**: State-of-the-art computer vision API

### Project Structure
```
src/
├── main/                    # Electron main process
│   ├── main.ts             # Application entry point
│   ├── image-processor.ts  # AI-powered image analysis
│   ├── settings-service.ts # Persistent settings management
│   └── storage-service.ts  # Project data persistence
├── renderer/               # React UI components
│   ├── components/         # Reusable UI components
│   ├── styles/            # CSS styling
│   └── index.tsx          # UI entry point
├── services/              # Shared business logic
│   └── openai-color-analyzer.ts # OpenAI API integration
└── shared/               # Type definitions and utilities
    └── types.ts          # TypeScript interfaces
```

## 🔧 Development

### Prerequisites
- **Node.js** 18 or higher
- **npm** 8 or higher
- **OpenAI API Key**

### Development Scripts
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint and fix code
npm run lint

# Type checking
npm run typecheck

# Check for unused dependencies
npm run knip

# Package for distribution
npm run package:mac:dmg
```

### Code Quality Standards
- **ESLint**: Enforced code style and best practices
- **TypeScript**: Strict type checking enabled
- **Prettier**: Consistent code formatting
- **Knip**: Unused dependency detection

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and ensure all tests pass
4. Commit with conventional commits: `git commit -m 'feat: add amazing feature'`
5. Push to your fork: `git push origin feature/amazing-feature`
6. Submit a Pull Request

## 🎯 Roadmap

### Planned Features
- [ ] **Batch Preset Application**: Apply saved presets to new image batches
- [ ] **Advanced AI Models**: Support for specialized photography AI models
- [ ] **Color Palette Extraction**: Generate brand color palettes from images
- [ ] **Video Color Matching**: Extend color matching to video files
- [ ] **Cloud Sync**: Sync projects across devices
- [ ] **Collaborative Features**: Share projects with team members

### Performance Improvements
- [ ] **GPU Acceleration**: Leverage Metal/CUDA for faster processing
- [ ] **Streaming Processing**: Handle large image batches more efficiently
- [ ] **Caching**: Intelligent caching for faster re-processing

## 🐛 Troubleshooting

### Common Issues

**"API key not configured" error**
- Ensure you've entered a valid OpenAI API key in Settings
- Check your API key has sufficient credits
- Verify internet connection for API calls

**Slow processing times**
- Processing time depends on image size and complexity
- Typical processing: 10-30 seconds per image
- RAW files may take longer than JPEG

**Preview not showing**
- Some RAW formats require conversion for preview
- Original processing is unaffected by preview issues
- Try using JPEG files to test the workflow first

**Export fails**
- Ensure you have write permissions to the export directory
- Check available disk space
- Verify Lightroom preset export options are selected

### Getting Help
- **GitHub Issues**: [Report bugs or request features](https://github.com/your-repo/imageMatch/issues)
- **Documentation**: Check the `/docs` folder for detailed guides
- **Community**: Join discussions in GitHub Discussions

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the GPT-4 Vision API that powers our AI analysis
- **Sharp** library for high-performance image processing
- **Electron** team for the excellent desktop app framework
- **Material-UI** for beautiful, accessible UI components
- Photography community for feedback and feature suggestions

## 🌟 Star History

If you find Image Match helpful, please consider giving it a star on GitHub!

[![Star History Chart](https://api.star-history.com/svg?repos=your-repo/imageMatch&type=Date)](https://star-history.com/#your-repo/imageMatch&Date)

---

**Made with ❤️ for photographers, by photographers**

*Transform your photo editing workflow with AI-powered color intelligence.*