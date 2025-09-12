# Image Match - Todo List

## Phase 1: Project Setup
- [x] Initialize git repository and create .gitignore
- [ ] Set up Electron + TypeScript project structure
- [ ] Configure build system (webpack/vite) and development environment
- [ ] Install core dependencies (Electron, Sharp, TypeScript)
- [ ] Create basic project structure (main/renderer/workers/algorithms directories)

## Phase 2: Core Application
- [ ] Set up main Electron process with TypeScript
- [ ] Create basic renderer process with HTML/CSS/TypeScript
- [ ] Implement drag-drop interface for image upload

## Phase 3: Image Processing
- [ ] Integrate Sharp library for PNG/JPG processing
- [ ] Research and integrate LibRaw-Wasm for DNG processing
- [ ] Create WebWorker architecture for image processing
- [ ] Implement basic color analysis functions

## Phase 4: Style Matching
- [ ] Build histogram-based color matching algorithm
- [ ] Add user controls for selective style application (colors vs full)

## Phase 5: Advanced Features
- [ ] Implement DNG metadata manipulation for direct editing
- [ ] Create Lightroom XMP preset generation system
- [ ] Build batch processing capabilities

## Phase 6: UI & Polish
- [ ] Add progress tracking and UI feedback
- [ ] Create before/after comparison UI
- [ ] Implement preset management system

## Notes
- Focus on DNG processing as primary format
- Support PNG/JPG as secondary formats
- User can choose between color-only or full style transfer
- Export Lightroom presets as .xmp files
- Electron app with TypeScript for cross-platform support