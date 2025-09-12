# Image Match

A desktop application for matching image colors and style from a base image to multiple target images, with special focus on DNG RAW processing and Lightroom preset generation.

## Features

- **Multi-format Support**: DNG, JPG, PNG, TIFF, CR2, NEF, ARW
- **Color Style Matching**: Extract and match colors, brightness, contrast, and saturation
- **DNG RAW Processing**: Direct manipulation of DNG metadata for non-destructive editing
- **Lightroom Integration**: Generate XMP presets for Adobe Lightroom
- **Batch Processing**: Process multiple target images at once
- **Modern UI**: Clean, intuitive interface built with Electron and TypeScript

## Quick Start

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd imageMatch
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build and run:
   ```bash
   npm run build
   npm start
   ```

   Or for development:
   ```bash
   npm run dev
   ```

## Development

### Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # Main application entry
│   ├── preload.ts  # Preload script for secure IPC
│   └── image-processor.ts # Image processing logic
├── renderer/       # UI renderer process
│   ├── index.html  # Main HTML template
│   ├── styles.css  # Application styles
│   └── renderer.ts # Renderer logic
├── workers/        # WebWorkers for heavy processing
├── algorithms/     # Color matching and style transfer algorithms
└── utils/          # Shared utilities
```

### Available Scripts

- `npm run dev` - Start development with hot reload
- `npm run build` - Build for production
- `npm run start` - Start built application
- `npm run lint` - Run ESLint
- `npm run lint:check` - Check linting without fixing
- `npm run clean` - Clean build artifacts
- `npm run package` - Package application for distribution

### Code Style

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Run `npm run lint` to check and fix code style issues.

## Usage

### Basic Workflow

1. **Select Base Image**: Choose the reference image whose style you want to match
2. **Add Target Images**: Select one or more images to apply the style to
3. **Configure Options**: Choose what aspects to match (colors, brightness, contrast, saturation)
4. **Process**: Click "Process Images" to apply the style matching
5. **Export**: Optionally generate Lightroom presets for further editing

### Processing Options

- **Colors**: Match color temperature, tint, and color balance
- **Brightness**: Adjust overall image brightness
- **Contrast**: Match contrast levels
- **Saturation**: Adjust color saturation and vibrance

### Output Options

- **Generate Lightroom Preset**: Creates .xmp files for Adobe Lightroom
- **Modify DNG Directly**: Non-destructive editing of DNG metadata
- **Export Processed Images**: Save processed versions of target images

## Technical Details

### Color Analysis

The application analyzes images using:
- Color histograms for RGB channels
- Average color calculation
- Color temperature estimation
- Dominant color extraction

### Style Matching

Style transfer is performed using:
- Histogram-based color matching
- Tone mapping for brightness and contrast
- Selective adjustment application based on user preferences

### DNG Processing

For DNG files, the application:
- Uses LibRaw-based processing for RAW data access
- Modifies metadata non-destructively
- Preserves original image quality
- Supports batch operations

## Supported Formats

### Input Formats
- **DNG** (Digital Negative)
- **CR2** (Canon Raw v2)
- **NEF** (Nikon Electronic Format)
- **ARW** (Sony Alpha Raw)
- **JPG/JPEG** (Joint Photographic Experts Group)
- **PNG** (Portable Network Graphics)
- **TIFF** (Tagged Image File Format)

### Output Formats
- Same as input format
- XMP presets for Lightroom
- Processed versions in JPEG format

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write descriptive commit messages
- Add comments for complex algorithms
- Test your changes thoroughly

## Roadmap

### Planned Features

- [ ] Neural network-based style transfer
- [ ] OpenAI API integration for advanced analysis
- [ ] More RAW format support (RAF, RW2, etc.)
- [ ] Advanced color grading controls
- [ ] Batch preset application
- [ ] Cloud processing options
- [ ] Plugin system for custom algorithms

### Current Limitations

- Limited RAW format processing (DNG focus)
- Basic color matching algorithms
- No real-time preview during processing
- Single-threaded processing for some operations

## License

MIT License - see LICENSE file for details

## Support

For bug reports and feature requests, please use the GitHub issues tracker.

## Acknowledgments

- Built with Electron and TypeScript
- Sharp library for image processing
- LibRaw for RAW image support
- Inspired by professional color grading workflows