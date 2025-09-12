import './styles.css';

// Type declarations for Electron API
declare global {
  interface Window {
    electronAPI: {
      onBaseImageSelected: (callback: (filePath: string) => void) => void;
      onTargetImagesSelected: (callback: (filePaths: string[]) => void) => void;
      processImage: (data: any) => Promise<any>;
      analyzeColors: (imagePath: string) => Promise<any>;
      matchStyle: (data: any) => Promise<any>;
      generatePreset: (data: any) => Promise<any>;
      removeAllListeners: (channel: string) => void;
    };
  }
}

class ImageMatchRenderer {
  private baseImagePath: string | null = null;
  private targetImagePaths: string[] = [];
  private isProcessing = false;

  constructor() {
    this.initializeEventListeners();
    this.setupElectronListeners();
  }

  private initializeEventListeners(): void {
    // Base image upload
    const baseImageDropZone = document.getElementById('baseImageDropZone');
    const baseImageInput = document.getElementById('baseImageInput') as HTMLInputElement;
    const removeBaseImageBtn = document.getElementById('removeBaseImage');

    if (baseImageDropZone && baseImageInput) {
      this.setupDropZone(baseImageDropZone, baseImageInput, (files) => {
        if (files.length > 0) {
          this.handleBaseImageSelection(files[0]);
        }
      });
    }

    removeBaseImageBtn?.addEventListener('click', () => this.removeBaseImage());

    // Target images upload
    const targetImagesDropZone = document.getElementById('targetImagesDropZone');
    const targetImagesInput = document.getElementById('targetImagesInput') as HTMLInputElement;

    if (targetImagesDropZone && targetImagesInput) {
      this.setupDropZone(targetImagesDropZone, targetImagesInput, (files) => {
        this.handleTargetImagesSelection(Array.from(files));
      }, true);
    }

    // Action buttons
    document.getElementById('analyzeButton')?.addEventListener('click', () => this.analyzeColors());
    document.getElementById('processButton')?.addEventListener('click', () => this.processImages());
  }

  private setupElectronListeners(): void {
    if (window.electronAPI) {
      window.electronAPI.onBaseImageSelected((filePath) => {
        this.handleBaseImagePath(filePath);
      });

      window.electronAPI.onTargetImagesSelected((filePaths) => {
        this.handleTargetImagePaths(filePaths);
      });
    }
  }

  private setupDropZone(
    dropZone: HTMLElement,
    input: HTMLInputElement,
    onFilesSelected: (files: FileList | File[]) => void,
    multiple = false
  ): void {
    // Click to select files
    dropZone.addEventListener('click', () => input.click());
    
    // Handle file input change
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        onFilesSelected(target.files);
      }
    });

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (!dropZone.contains(e.relatedTarget as Node)) {
        dropZone.classList.remove('drag-over');
      }
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        if (multiple) {
          onFilesSelected(files);
        } else {
          onFilesSelected([files[0]]);
        }
      }
    });
  }

  private handleBaseImageSelection(file: File): void {
    if (this.isValidImageFile(file)) {
      // In Electron, File objects have a path property, but we need to handle both cases
      this.baseImagePath = (file as any).path || URL.createObjectURL(file);
      this.displayBaseImage(file);
      this.updateUI();
    } else {
      this.showError('Invalid file format. Please select a supported image file.');
    }
  }

  private handleBaseImagePath(filePath: string): void {
    this.baseImagePath = filePath;
    this.displayBaseImageFromPath(filePath);
    this.updateUI();
  }

  private handleTargetImagesSelection(files: File[]): void {
    const validFiles = files.filter(file => this.isValidImageFile(file));
    
    if (validFiles.length === 0) {
      this.showError('No valid image files selected.');
      return;
    }

    validFiles.forEach(file => {
      // In Electron, File objects have a path property, but we need to handle both cases
      const path = (file as any).path || URL.createObjectURL(file);
      if (!this.targetImagePaths.includes(path)) {
        this.targetImagePaths.push(path);
        this.addTargetImageToGrid(file, path);
      }
    });

    this.updateUI();
  }

  private handleTargetImagePaths(filePaths: string[]): void {
    filePaths.forEach(path => {
      if (!this.targetImagePaths.includes(path)) {
        this.targetImagePaths.push(path);
        this.addTargetImageToGridFromPath(path);
      }
    });

    this.updateUI();
  }

  private isValidImageFile(file: File): boolean {
    const validExtensions = ['.dng', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.cr2', '.nef', '.arw'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  }

  private displayBaseImage(file: File): void {
    const preview = document.getElementById('baseImagePreview');
    const image = document.getElementById('baseImage') as HTMLImageElement;
    const nameSpan = document.getElementById('baseImageName');
    const dropZone = document.getElementById('baseImageDropZone');

    if (preview && image && nameSpan && dropZone) {
      const url = URL.createObjectURL(file);
      image.src = url;
      nameSpan.textContent = file.name;
      
      dropZone.style.display = 'none';
      preview.style.display = 'block';
    }
  }

  private displayBaseImageFromPath(filePath: string): void {
    const preview = document.getElementById('baseImagePreview');
    const image = document.getElementById('baseImage') as HTMLImageElement;
    const nameSpan = document.getElementById('baseImageName');
    const dropZone = document.getElementById('baseImageDropZone');

    if (preview && image && nameSpan && dropZone) {
      image.src = `file://${filePath}`;
      nameSpan.textContent = filePath.split('/').pop() || 'Unknown';
      
      dropZone.style.display = 'none';
      preview.style.display = 'block';
    }
  }

  private addTargetImageToGrid(file: File, path: string): void {
    const grid = document.getElementById('targetImagesGrid');
    if (!grid) return;

    const item = document.createElement('div');
    item.className = 'target-image-item';
    item.innerHTML = `
      <img src="${URL.createObjectURL(file)}" alt="${file.name}">
      <button class="remove-btn" onclick="imageMatchRenderer.removeTargetImage('${path}')">×</button>
      <div class="target-image-name">${file.name}</div>
    `;

    grid.appendChild(item);
  }

  private addTargetImageToGridFromPath(filePath: string): void {
    const grid = document.getElementById('targetImagesGrid');
    if (!grid) return;

    const fileName = filePath.split('/').pop() || 'Unknown';
    const item = document.createElement('div');
    item.className = 'target-image-item';
    item.innerHTML = `
      <img src="file://${filePath}" alt="${fileName}">
      <button class="remove-btn" onclick="imageMatchRenderer.removeTargetImage('${filePath}')">×</button>
      <div class="target-image-name">${fileName}</div>
    `;

    grid.appendChild(item);
  }

  public removeTargetImage(path: string): void {
    this.targetImagePaths = this.targetImagePaths.filter(p => p !== path);
    
    const grid = document.getElementById('targetImagesGrid');
    if (grid) {
      const items = grid.querySelectorAll('.target-image-item');
      items.forEach(item => {
        const button = item.querySelector('.remove-btn') as HTMLButtonElement;
        if (button?.onclick?.toString().includes(path)) {
          item.remove();
        }
      });
    }

    this.updateUI();
  }

  private removeBaseImage(): void {
    this.baseImagePath = null;
    
    const preview = document.getElementById('baseImagePreview');
    const dropZone = document.getElementById('baseImageDropZone');
    
    if (preview && dropZone) {
      preview.style.display = 'none';
      dropZone.style.display = 'block';
    }

    this.updateUI();
  }

  private updateUI(): void {
    const hasBaseImage = this.baseImagePath !== null;
    const hasTargetImages = this.targetImagePaths.length > 0;
    const canProcess = hasBaseImage && hasTargetImages;

    // Show/hide options section
    const optionsSection = document.getElementById('optionsSection');
    if (optionsSection) {
      optionsSection.style.display = canProcess ? 'block' : 'none';
    }

    // Enable/disable process button
    const processButton = document.getElementById('processButton') as HTMLButtonElement;
    if (processButton) {
      processButton.disabled = !canProcess || this.isProcessing;
    }

    const analyzeButton = document.getElementById('analyzeButton') as HTMLButtonElement;
    if (analyzeButton) {
      analyzeButton.disabled = !hasBaseImage || this.isProcessing;
    }
  }

  private async analyzeColors(): Promise<void> {
    if (!this.baseImagePath || !window.electronAPI) return;

    this.setProcessingState(true, 'Analyzing colors...');

    try {
      const result = await window.electronAPI.analyzeColors(this.baseImagePath);
      this.showColorAnalysis(result);
    } catch (error) {
      this.showError(`Error analyzing colors: ${error}`);
    } finally {
      this.setProcessingState(false);
    }
  }

  private async processImages(): Promise<void> {
    if (!this.baseImagePath || this.targetImagePaths.length === 0 || !window.electronAPI) return;

    this.setProcessingState(true, 'Processing images...');

    try {
      const options = this.getProcessingOptions();
      const results = [];

      for (let i = 0; i < this.targetImagePaths.length; i++) {
        const targetPath = this.targetImagePaths[i];
        
        this.updateProgress((i / this.targetImagePaths.length) * 100, 
          `Processing image ${i + 1} of ${this.targetImagePaths.length}...`);

        const data = {
          baseImagePath: this.baseImagePath,
          targetImagePath: targetPath,
          ...options
        };

        const result = await window.electronAPI.matchStyle(data);
        results.push(result);

        if (options.generatePreset) {
          await window.electronAPI.generatePreset({ adjustments: result.metadata?.adjustments });
        }
      }

      this.showResults(results);
      this.updateProgress(100, 'Processing complete!');
    } catch (error) {
      this.showError(`Error processing images: ${error}`);
    } finally {
      setTimeout(() => this.setProcessingState(false), 1000);
    }
  }

  private getProcessingOptions(): any {
    return {
      matchColors: (document.getElementById('matchColors') as HTMLInputElement)?.checked || false,
      matchBrightness: (document.getElementById('matchBrightness') as HTMLInputElement)?.checked || false,
      matchContrast: (document.getElementById('matchContrast') as HTMLInputElement)?.checked || false,
      matchSaturation: (document.getElementById('matchSaturation') as HTMLInputElement)?.checked || false,
      generatePreset: (document.getElementById('generatePreset') as HTMLInputElement)?.checked || false,
      modifyDNG: (document.getElementById('modifyDNG') as HTMLInputElement)?.checked || false,
    };
  }

  private setProcessingState(processing: boolean, message?: string): void {
    this.isProcessing = processing;
    
    const progressSection = document.getElementById('progressSection');
    if (progressSection) {
      progressSection.style.display = processing ? 'block' : 'none';
    }

    if (processing && message) {
      this.updateProgress(0, message);
    }

    this.updateUI();
  }

  private updateProgress(percentage: number, message: string): void {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = message;
    }
  }

  private showColorAnalysis(analysis: any): void {
    // TODO: Implement color analysis display
    console.log('Color analysis:', analysis);
    this.showInfo(`Color analysis complete. Temperature: ${analysis.temperature}K, Tint: ${analysis.tint}`);
  }

  private showResults(results: any[]): void {
    const resultsSection = document.getElementById('resultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    
    if (!resultsSection || !resultsGrid) return;

    resultsGrid.innerHTML = '';
    
    results.forEach((result, index) => {
      if (result.success && result.outputPath) {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
          <img src="file://${result.outputPath}" alt="Processed image ${index + 1}">
          <div class="result-info">
            <h4>Processed Image ${index + 1}</h4>
            <p>Output: ${result.outputPath}</p>
          </div>
        `;
        resultsGrid.appendChild(item);
      }
    });

    resultsSection.style.display = 'block';
  }

  private showError(message: string): void {
    // Simple error display - could be improved with a toast system
    alert(`Error: ${message}`);
  }

  private showInfo(message: string): void {
    // Simple info display - could be improved with a toast system
    alert(message);
  }
}

// Initialize the renderer when the DOM is loaded
let imageMatchRenderer: ImageMatchRenderer | undefined;

document.addEventListener('DOMContentLoaded', () => {
  imageMatchRenderer = new ImageMatchRenderer();
  // Make imageMatchRenderer globally available for onclick handlers
  (window as any).imageMatchRenderer = imageMatchRenderer;
});