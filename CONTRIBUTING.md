# Contributing to Film Recipe Wizard

Thank you for your interest in contributing to Film Recipe Wizard! We welcome contributions from photographers, developers, and anyone passionate about improving AI-powered photo editing workflows.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

### Local Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/filmRecipeWizard.git
   cd filmRecipeWizard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your OpenAI API key**
   - Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Add it through the app's Settings interface after running

4. **Start development**
   ```bash
   npm run dev
   ```

## 📋 Development Workflow

### Branch Strategy

We use a two-branch workflow:
- `master`: Production-ready code
- `develop`: Integration branch for new features

### Making Changes

1. **Create a feature branch from `develop`**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style and patterns
   - Write clear, descriptive commit messages
   - Keep commits focused and atomic

3. **Test your changes**
   ```bash
   npm run lint        # Check code style
   npm run typecheck   # Verify TypeScript
   npm run build       # Ensure it builds
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: descriptive commit message"
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Target the `develop` branch
   - Provide a clear description of changes
   - Link any related issues

## 🛠️ Code Standards

### Code Style

- **TypeScript**: All new code should be written in TypeScript
- **ESLint**: Follow the project's ESLint configuration
- **Formatting**: Code is automatically formatted on commit

### Architecture Guidelines

- **Main Process** (`src/main/`): Electron main process, file operations, system integration
- **Renderer Process** (`src/renderer/`): React UI components and user interactions
- **Services** (`src/services/`): Shared business logic and API integrations

### Commit Messages

Follow conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## 🎯 Contribution Areas

### High-Priority Areas

1. **AI Model Integration**
   - Support for additional AI models
   - Improved color analysis algorithms
   - Better prompt engineering

2. **Export Formats**
   - Additional LUT formats
   - More RAW processors support
   - Custom export profiles

3. **User Experience**
   - UI/UX improvements
   - Better error handling
   - Performance optimizations

4. **Testing**
   - Unit tests for core functions
   - Integration tests
   - UI automation tests

### Feature Ideas

- Batch processing capabilities
- Custom color profiles
- Integration with photo management software
- Advanced masking tools
- Mobile companion app

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment details**
   - OS version
   - App version
   - Node.js version

2. **Steps to reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior
   - Screenshots if applicable

3. **Sample files** (if relevant)
   - Non-sensitive test images
   - Error logs from Developer Console

## 🔒 Security

- **Never commit API keys** or sensitive information
- **Report security issues** privately to the maintainers
- **Follow secure coding practices** for file handling and external API calls

## 📝 Documentation

Help improve our documentation:

- **Code comments**: Document complex logic and algorithms
- **README updates**: Keep setup instructions current
- **API documentation**: Document new functions and interfaces
- **User guides**: Help with tutorials and usage examples

## 🧪 Testing

Before submitting:

```bash
# Run all quality checks
npm run lint
npm run typecheck
npm run build

# Test the application
npm run dev
# Manually test your changes
```

## 🚀 Release Process

### For Maintainers

The release process uses automated GitHub Actions with manual version control:

#### 1. Version Bumping

From the `develop` branch, bump the version locally:

```bash
# For bug fixes (2.0.7 → 2.0.8)
npm version patch

# For new features (2.0.7 → 2.1.0)
npm version minor

# For breaking changes (2.0.7 → 3.0.0)
npm version major

# For specific version (2.0.7 → 2.1.5)
npm version 2.1.5
```

This automatically:
- Updates `package.json` and `package-lock.json`
- Creates a git commit with message "v2.0.8"
- Creates a git tag "v2.0.8"

#### 2. Create Release PR

```bash
# Push to develop (if needed)
git push origin develop

# Create and merge PR to master
gh pr create --title "chore: bump version to X.X.X" --head develop --base master
gh pr merge --squash --admin
```

#### 3. Automatic Release

The GitHub Actions workflow automatically:
- Detects version bump commits (`chore: bump version to X.X.X`)
- Builds macOS DMG and Windows installer
- Creates GitHub release with downloadable assets
- Uses the version from `package.json` (no automatic calculation)

#### Release Assets

Each release includes:
- **macOS**: `.dmg` installer (unsigned, requires right-click → Open)
- **Windows**: `.exe` installer (NSIS-based)

#### Branch Strategy for Releases

- `develop`: Active development, unprotected for easy collaboration
- `master`: Protected, releases only via PR with review required
- Workflow only runs on `master` branch pushes

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and community support
- **Code Review**: Maintainers will review PRs and provide feedback

## 📄 License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

## 🙏 Recognition

All contributors will be acknowledged in our releases and documentation. We appreciate every contribution, whether it's code, documentation, bug reports, or feature suggestions!

---

*Happy coding, and thank you for helping make photo editing more accessible with AI! 📸✨*