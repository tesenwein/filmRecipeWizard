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
        // Enforce single target image
        const first = Array.from(files)[0];
        if (first) this.handleTargetImagesSelection([first]);
      }, false);
    }

    // Target remove button
    const removeTargetImageBtn = document.getElementById('removeTargetImage');
    removeTargetImageBtn?.addEventListener('click', () => this.removeCurrentTargetImage());

    // Action buttons
    document.getElementById('analyzeButton')?.addEventListener('click', () => this.analyzeColors());
    document.getElementById('processButton')?.addEventListener('click', () => this.processImages());
  }

  private setupElectronListeners(): void {
    if (window.electronAPI) {
      console.log('[UI] Setting up Electron IPC listeners');
      // Ensure we don't accumulate duplicate listeners across reloads
      window.electronAPI.removeAllListeners('base-image-selected');
      window.electronAPI.removeAllListeners('target-images-selected');
      window.electronAPI.onBaseImageSelected((filePath) => {
        console.log('[IPC] Base image selected from menu:', filePath);
        this.handleBaseImagePath(filePath);
      });

      window.electronAPI.onTargetImagesSelected((filePaths) => {
        console.log('[IPC] Target images selected from menu:', filePaths.length, 'files');
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
    console.log('[UI] Setting up drop zone for:', dropZone.id);
    
    // Click to select files (debounced to avoid duplicate dialogs)
    let opening = false;
    dropZone.addEventListener('click', () => {
      if (opening) {
        console.log('[UI] Ignoring duplicate click while dialog is opening');
        return;
      }
      opening = true;
      console.log('[UI] Drop zone clicked, opening file picker');
      input.click();
      // Reset guard after a short delay
      setTimeout(() => { opening = false; }, 500);
    });
    // Prevent programmatic input.click() from bubbling back to the drop zone
    input.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Handle file input change
    input.addEventListener('change', (e) => {
      console.log('[UI] File input changed');
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        console.log(`[UI] Selected ${target.files.length} files via input`);
        onFilesSelected(target.files);
        // Clear the input to allow selecting the same file again
        target.value = '';
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
        console.log(`[UI] Dropped ${files.length} files`);
        if (multiple) {
          onFilesSelected(files);
        } else {
          onFilesSelected([files[0]]);
        }
      }
    });
  }

  private async handleBaseImageSelection(file: File): Promise<void> {
    console.log('[UI] Handling base image selection:', file.name);
    if (this.isValidImageFile(file)) {
      // In Electron, File objects have a path property, but we need to handle both cases
      const newPath = (file as any).path || URL.createObjectURL(file);
      
      // Prevent duplicate selections
      if (this.baseImagePath === newPath) {
        console.log('[UI] Base image already selected, skipping duplicate');
        return;
      }
      
      this.baseImagePath = newPath;
      console.log('[UI] Base image path set to:', this.baseImagePath);
      await this.displayBaseImage(file);
      this.updateUI();
    } else {
      this.showError('Invalid file format. Please select a supported image file.');
    }
  }

  private async handleBaseImagePath(filePath: string): Promise<void> {
    console.log('[UI] Handling base image path from menu:', filePath);
    
    // Prevent duplicate selections
    if (this.baseImagePath === filePath) {
      console.log('[UI] Base image path already set, skipping duplicate');
      return;
    }
    
    this.baseImagePath = filePath;
    await this.displayBaseImageFromPath(filePath);
    this.updateUI();
  }

  private async handleTargetImagesSelection(files: File[]): Promise<void> {
    console.log('[UI] Handling target images selection:', files.length, 'files');
    const validFiles = files.filter(file => this.isValidImageFile(file));
    
    if (validFiles.length === 0) {
      this.showError('No valid image files selected.');
      return;
    }

    // Only keep the first valid file
    this.targetImagePaths = [];
    const targetPreview = document.getElementById('targetImagePreview');
    const targetDrop = document.getElementById('targetImagesDropZone');
    if (targetPreview && targetDrop) {
      targetPreview.style.display = 'none';
      targetDrop.style.display = 'block';
    }

    let addedCount = 0;
    for (const file of validFiles.slice(0, 1)) {
      // In Electron, File objects have a path property, but we need to handle both cases
      const path = (file as any).path || URL.createObjectURL(file);
      if (!this.targetImagePaths.includes(path)) {
        this.targetImagePaths.push(path);
        await this.displayTargetImage(file);
        addedCount++;
        console.log('[UI] Added target image:', file.name);
      } else {
        console.log('[UI] Skipping duplicate target image:', file.name);
      }
    }

    console.log(`[UI] Added ${addedCount} new target images, total: ${this.targetImagePaths.length}`);
    this.updateUI();
  }

  private async handleTargetImagePaths(filePaths: string[]): Promise<void> {
    console.log('[UI] Handling target image paths from menu:', filePaths.length, 'paths');
    // Only keep one target
    this.targetImagePaths = [];
    const targetPreview2 = document.getElementById('targetImagePreview');
    const targetDrop2 = document.getElementById('targetImagesDropZone');
    if (targetPreview2 && targetDrop2) {
      targetPreview2.style.display = 'none';
      targetDrop2.style.display = 'block';
    }

    let addedCount = 0;
    const first = filePaths[0];
    if (first && !this.targetImagePaths.includes(first)) {
      this.targetImagePaths.push(first);
      await this.displayTargetImageFromPath(first);
      addedCount++;
      console.log('[UI] Added target image path:', first.split('/').pop());
    }

    console.log(`[UI] Added ${addedCount} new target images, total: ${this.targetImagePaths.length}`);
    this.updateUI();
  }

  private isValidImageFile(file: File): boolean {
    const validExtensions = ['.dng', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.cr2', '.nef', '.arw', '.heic', '.heif', '.avif'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  }

  private async displayBaseImage(file: File): Promise<void> {
    const preview = document.getElementById('baseImagePreview');
    const image = document.getElementById('baseImage') as HTMLImageElement;
    const nameSpan = document.getElementById('baseImageName');
    const dropZone = document.getElementById('baseImageDropZone');

    if (preview && image && nameSpan && dropZone) {
      const previewPath = await this.generatePreviewForFile(file);
      image.src = `file://${previewPath}`;
      nameSpan.textContent = file.name;
      
      dropZone.style.display = 'none';
      preview.style.display = 'block';
    }
  }

  private async displayBaseImageFromPath(filePath: string): Promise<void> {
    const preview = document.getElementById('baseImagePreview');
    const image = document.getElementById('baseImage') as HTMLImageElement;
    const nameSpan = document.getElementById('baseImageName');
    const dropZone = document.getElementById('baseImageDropZone');

    if (preview && image && nameSpan && dropZone) {
      const previewPath = await this.generatePreviewFromPath(filePath);
      image.src = `file://${previewPath}`;
      nameSpan.textContent = filePath.split('/').pop() || 'Unknown';
      
      dropZone.style.display = 'none';
      preview.style.display = 'block';
    }
  }

  private async displayTargetImage(file: File): Promise<void> {
    const preview = document.getElementById('targetImagePreview');
    const image = document.getElementById('targetImage') as HTMLImageElement;
    const nameSpan = document.getElementById('targetImageName');
    const dropZone = document.getElementById('targetImagesDropZone');

    if (preview && image && nameSpan && dropZone) {
      const previewPath = await this.generatePreviewForFile(file);
      image.src = `file://${previewPath}`;
      nameSpan.textContent = file.name;
      dropZone.style.display = 'none';
      preview.style.display = 'block';
    }
  }

  private async displayTargetImageFromPath(filePath: string): Promise<void> {
    const preview = document.getElementById('targetImagePreview');
    const image = document.getElementById('targetImage') as HTMLImageElement;
    const nameSpan = document.getElementById('targetImageName');
    const dropZone = document.getElementById('targetImagesDropZone');

    if (preview && image && nameSpan && dropZone) {
      const previewPath = await this.generatePreviewFromPath(filePath);
      image.src = `file://${previewPath}`;
      nameSpan.textContent = filePath.split('/').pop() || 'Unknown';
      dropZone.style.display = 'none';
      preview.style.display = 'block';
    }
  }

  private removeCurrentTargetImage(): void {
    this.targetImagePaths = [];
    const preview = document.getElementById('targetImagePreview');
    const dropZone = document.getElementById('targetImagesDropZone');
    if (preview && dropZone) {
      preview.style.display = 'none';
      dropZone.style.display = 'block';
    }
    this.updateUI();
  }

  private async generatePreviewFromPath(filePath: string): Promise<string> {
    const res = await window.electronAPI.generatePreview({ path: filePath });
    if (res?.success && res.previewPath) return res.previewPath;
    throw new Error(res?.error || 'Preview generation failed');
  }

  private async generatePreviewForFile(file: File): Promise<string> {
    const filePath = (file as any).path;
    if (filePath) {
      return this.generatePreviewFromPath(filePath);
    }
    // Fallback: read as data URL and send to main
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const res = await window.electronAPI.generatePreview({ dataUrl });
    if (res?.success && res.previewPath) return res.previewPath;
    throw new Error(res?.error || 'Preview generation failed');
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

    console.log('[UI] Starting color analysis for:', this.baseImagePath);
    
    // If we have both base and target images, use AI analysis for color matching recommendations
    if (this.targetImagePaths.length > 0) {
      console.log('[UI] Using AI analysis for color matching recommendations');
      this.setProcessingState(true, '🤖 Sending images to OpenAI GPT-5 for professional analysis...');
      
      try {
        // Use the first target image for AI analysis
        const result = await (window.electronAPI as any).analyzeColorMatch({
          baseImagePath: this.baseImagePath,
          targetImagePath: this.targetImagePaths[0]
        });
        
        console.log('[UI] AI color analysis completed successfully');
        this.showAIColorAnalysis(result);
      } catch (error) {
        console.error('[UI] AI color analysis failed:', error);
        this.showError(`AI analysis failed: ${error}`);
      }
    } else {
      // Basic color analysis for single image
      await this.performBasicColorAnalysis();
    }
    
    this.setProcessingState(false);
  }

  private async performBasicColorAnalysis(): Promise<void> {
    if (!this.baseImagePath) {
      console.error('[UI] No base image path available for analysis');
      return;
    }
    
    this.setProcessingState(true, 'Analyzing colors...');
    
    try {
      const result = await window.electronAPI.analyzeColors(this.baseImagePath);
      console.log('[UI] Basic color analysis completed successfully');
      this.showColorAnalysis(result);
    } catch (error) {
      console.error('[UI] Color analysis failed:', error);
      this.showError(`Error analyzing colors: ${error}`);
    }
  }

  private async processImages(): Promise<void> {
    if (!this.baseImagePath || this.targetImagePaths.length === 0 || !window.electronAPI) {
      console.warn('[UI] Cannot process images - missing requirements');
      return;
    }

    console.log(`[UI] Starting image processing: base=${this.baseImagePath}, targets=${this.targetImagePaths.length}`);
    this.setProcessingState(true, 'Processing images...');

    try {
      const options = this.getProcessingOptions();
      console.log('[UI] Processing options:', options);
      const results = [];
      const presets = [];

      for (let i = 0; i < this.targetImagePaths.length; i++) {
        const targetPath = this.targetImagePaths[i];
        
        const fileName = targetPath.split('/').pop();
        console.log(`[UI] Processing image ${i + 1}/${this.targetImagePaths.length}:`, fileName);
        
        // Step 1: Analyzing with AI
        this.updateProgress((i / this.targetImagePaths.length) * 100, 
          `🤖 Sending images to OpenAI for analysis... (${i + 1}/${this.targetImagePaths.length})`);

        const data = {
          baseImagePath: this.baseImagePath,
          targetImagePath: targetPath,
          ...options
        };

        const result = await window.electronAPI.matchStyle(data);
        
        // Step 2: Processing complete
        if (result.success) {
          this.updateProgress(((i + 0.7) / this.targetImagePaths.length) * 100, 
            `✅ AI analysis complete, applying adjustments... (${i + 1}/${this.targetImagePaths.length})`);
        }
        
        results.push(result);
        console.log(`[UI] Image ${i + 1} processed:`, result.success ? 'SUCCESS' : 'FAILED');

        // Always generate Lightroom preset
        if (result.success) {
          this.updateProgress(((i + 0.9) / this.targetImagePaths.length) * 100, 
            `📋 Generating Lightroom preset... (${i + 1}/${this.targetImagePaths.length})`);
            
          console.log(`[UI] Generating preset for image ${i + 1}`);
          const presetResult = await window.electronAPI.generatePreset({ adjustments: result.metadata?.adjustments });
          if (presetResult.success) {
            presets.push(presetResult);
            console.log('[UI] Preset generated:', presetResult.outputPath);
          }
        }
      }

      console.log('[UI] All images processed, showing results');
      this.showResults(results, presets);
      this.updateProgress(100, 'Processing complete!');
    } catch (error) {
      console.error('[UI] Processing failed:', error);
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
    console.log('Color analysis:', analysis);
    
    // Create a color analysis modal
    const modal = document.createElement('div');
    modal.className = 'color-analysis-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Color Analysis Results</h3>
          <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="analysis-grid">
            <div class="analysis-section">
              <h4>White Balance</h4>
              <p>Temperature: <strong>${analysis.temperature}K</strong></p>
              <p>Tint: <strong>${analysis.tint}</strong></p>
            </div>
            <div class="analysis-section">
              <h4>Average Color</h4>
              <div class="color-swatch" style="background-color: rgb(${analysis.averageColor.r}, ${analysis.averageColor.g}, ${analysis.averageColor.b})"></div>
              <p>RGB: ${analysis.averageColor.r}, ${analysis.averageColor.g}, ${analysis.averageColor.b}</p>
            </div>
            <div class="analysis-section">
              <h4>Dominant Colors</h4>
              <div class="dominant-colors">
                ${analysis.dominantColors.map((color: any, index: number) => `
                  <div class="dominant-color-item">
                    <div class="color-swatch" style="background-color: rgb(${color.color.r}, ${color.color.g}, ${color.color.b})"></div>
                    <span>${color.percentage.toFixed(1)}%</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  private showAIColorAnalysis(result: any): void {
    console.log('AI color analysis result:', result);
    
    const adjustments = result.metadata?.adjustments;
    const confidence = result.metadata?.confidence;
    const reasoning = result.metadata?.reasoning;
    
    if (!adjustments) {
      this.showError('AI analysis failed to provide adjustments');
      return;
    }
    
    // Create AI analysis modal
    const modal = document.createElement('div');
    modal.className = 'color-analysis-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>🤖 AI Color Analysis & Matching Recommendations</h3>
          <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="ai-analysis-header">
            <div class="confidence-badge">
              <span class="confidence-label">Confidence:</span>
              <span class="confidence-value">${Math.round(confidence * 100)}%</span>
            </div>
          </div>
          
          ${reasoning ? `
            <div class="ai-reasoning">
              <h4>AI Analysis</h4>
              <p><em>"${reasoning}"</em></p>
            </div>
          ` : ''}
          
          <div class="adjustments-grid">
            <div class="adjustment-section">
              <h4>🌡️ White Balance</h4>
              <div class="adjustment-values">
                <p>Temperature: <strong>${Math.round(adjustments.temperature)}K</strong> ${adjustments.temperature > 5500 ? '(cooler)' : '(warmer)'}</p>
                <p>Tint: <strong>${adjustments.tint > 0 ? '+' : ''}${adjustments.tint}</strong> ${adjustments.tint > 0 ? '(magenta)' : adjustments.tint < 0 ? '(green)' : '(neutral)'}</p>
              </div>
            </div>
            
            <div class="adjustment-section">
              <h4>💡 Exposure</h4>
              <div class="adjustment-values">
                <p>Exposure: <strong>${adjustments.exposure > 0 ? '+' : ''}${adjustments.exposure.toFixed(2)} stops</strong></p>
                <p>Highlights: <strong>${adjustments.highlights > 0 ? '+' : ''}${adjustments.highlights}</strong></p>
                <p>Shadows: <strong>${adjustments.shadows > 0 ? '+' : ''}${adjustments.shadows}</strong></p>
                <p>Whites: <strong>${adjustments.whites > 0 ? '+' : ''}${adjustments.whites}</strong></p>
                <p>Blacks: <strong>${adjustments.blacks > 0 ? '+' : ''}${adjustments.blacks}</strong></p>
              </div>
            </div>
            
            <div class="adjustment-section">
              <h4>🎨 Tone & Color</h4>
              <div class="adjustment-values">
                <p>Contrast: <strong>${adjustments.contrast > 0 ? '+' : ''}${adjustments.contrast}</strong></p>
                <p>Clarity: <strong>${adjustments.clarity > 0 ? '+' : ''}${adjustments.clarity}</strong></p>
                <p>Vibrance: <strong>${adjustments.vibrance > 0 ? '+' : ''}${adjustments.vibrance}</strong></p>
                <p>Saturation: <strong>${adjustments.saturation > 0 ? '+' : ''}${adjustments.saturation}</strong></p>
              </div>
            </div>
            
            ${(adjustments.hue_red || adjustments.hue_orange || adjustments.hue_yellow || 
               adjustments.hue_green || adjustments.hue_aqua || adjustments.hue_blue || 
               adjustments.hue_purple || adjustments.hue_magenta) ? `
            <div class="adjustment-section">
              <h4>🌈 Selective Color Hues</h4>
              <div class="hue-adjustments">
                ${adjustments.hue_red ? `<p>Red: <strong>${adjustments.hue_red > 0 ? '+' : ''}${adjustments.hue_red}</strong></p>` : ''}
                ${adjustments.hue_orange ? `<p>Orange: <strong>${adjustments.hue_orange > 0 ? '+' : ''}${adjustments.hue_orange}</strong></p>` : ''}
                ${adjustments.hue_yellow ? `<p>Yellow: <strong>${adjustments.hue_yellow > 0 ? '+' : ''}${adjustments.hue_yellow}</strong></p>` : ''}
                ${adjustments.hue_green ? `<p>Green: <strong>${adjustments.hue_green > 0 ? '+' : ''}${adjustments.hue_green}</strong></p>` : ''}
                ${adjustments.hue_aqua ? `<p>Aqua: <strong>${adjustments.hue_aqua > 0 ? '+' : ''}${adjustments.hue_aqua}</strong></p>` : ''}
                ${adjustments.hue_blue ? `<p>Blue: <strong>${adjustments.hue_blue > 0 ? '+' : ''}${adjustments.hue_blue}</strong></p>` : ''}
                ${adjustments.hue_purple ? `<p>Purple: <strong>${adjustments.hue_purple > 0 ? '+' : ''}${adjustments.hue_purple}</strong></p>` : ''}
                ${adjustments.hue_magenta ? `<p>Magenta: <strong>${adjustments.hue_magenta > 0 ? '+' : ''}${adjustments.hue_magenta}</strong></p>` : ''}
              </div>
            </div>
            ` : ''}
          </div>
          
          <div class="modal-footer">
            <p><small>💡 These are AI recommendations for matching your target image to the reference style. 
            Process your images to apply these adjustments automatically.</small></p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  private showResults(results: any[], presets: any[] = []): void {
    const resultsSection = document.getElementById('resultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    
    if (!resultsSection || !resultsGrid) return;

    resultsGrid.innerHTML = '';
    
    let successCount = 0;
    results.forEach((result, index) => {
      if (result.success && result.outputPath) {
        successCount++;
        const fileName = result.outputPath.split('/').pop() || `Image ${index + 1}`;
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
          <img src="file://${result.outputPath}" alt="Processed image ${index + 1}">
          <div class="result-actions">
            <button class="result-action-btn" onclick="imageMatchRenderer.downloadImage('${result.outputPath}')">
              📥 Download Image
            </button>
          </div>
          <div class="result-info">
            <h4>${fileName}</h4>
            <p>Processing: ${result.metadata ? 'Style matched successfully' : 'Basic processing applied'}</p>
            ${result.metadata?.confidence ? `
              <p><small>🤖 AI Analysis (${Math.round(result.metadata.confidence * 100)}% confidence)<br>
                        Temperature: ${Math.round(result.metadata.adjustments?.temperature || 0)}K, 
                        Exposure: ${(result.metadata.adjustments?.exposure || 0).toFixed(2)} stops</small></p>
              ${result.metadata.reasoning ? `<p class="ai-reasoning"><small><em>"${result.metadata.reasoning}"</em></small></p>` : ''}
            ` : result.metadata ? `
              <p><small>Traditional Analysis<br>
                        Temperature: ${Math.round(result.metadata.adjustments?.temperature || 0)}K, 
                        Brightness: ${(result.metadata.adjustments?.brightness || 1).toFixed(2)}x</small></p>
            ` : ''}
          </div>
        `;
        resultsGrid.appendChild(item);
      }
    });

    // Add preset downloads if any were generated
    if (presets.length > 0) {
      const presetSection = document.createElement('div');
      presetSection.className = 'preset-downloads';
      presetSection.innerHTML = `
        <h3>📷 Lightroom Presets Generated</h3>
        <div class="preset-list">
          ${presets.map((preset, index) => `
            <div class="preset-item">
              <div class="preset-info">
                <strong>${preset.metadata?.presetName || `Preset ${index + 1}`}</strong>
                <p>Apply these settings to other photos in Lightroom</p>
              </div>
              <div class="preset-actions">
                <button class="result-action-btn" onclick="imageMatchRenderer.downloadPreset('${preset.outputPath}')">
                  📥 Download Preset
                </button>
                <button class="result-action-btn secondary" onclick="imageMatchRenderer.copyPresetPath('${preset.outputPath}')">
                  Copy Path
                </button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="preset-instructions">
          <h4>How to use in Lightroom:</h4>
          <ol>
            <li>Open Lightroom and go to the Develop module</li>
            <li>In the Presets panel, right-click and choose "Import Presets..."</li>
            <li>Navigate to the preset file and import it</li>
            <li>Apply the preset to your photos with one click!</li>
          </ol>
        </div>
      `;
      resultsGrid.appendChild(presetSection);
      
      this.showToast(`Generated ${presets.length} Lightroom preset${presets.length > 1 ? 's' : ''}`, 'success');
    }

    if (successCount > 0) {
      this.showToast(`Successfully processed ${successCount} image${successCount > 1 ? 's' : ''}`, 'success');
    }

    const failedCount = results.length - successCount;
    if (failedCount > 0) {
      this.showToast(`${failedCount} image${failedCount > 1 ? 's' : ''} failed to process`, 'warning');
    }

    resultsSection.style.display = 'block';
  }

  public downloadImage(filePath: string): void {
    console.log('[UI] Downloading image:', filePath);
    const fileName = filePath.split('/').pop() || 'processed_image';
    
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = `file://${filePath}`;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showToast(`Downloading ${fileName}`, 'success');
  }

  public downloadPreset(filePath: string): void {
    console.log('[UI] Downloading preset:', filePath);
    const fileName = filePath.split('/').pop() || 'lightroom_preset.xmp';
    
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = `file://${filePath}`;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.showToast(`Downloading ${fileName}`, 'success');
  }

  public copyPresetPath(filePath: string): void {
    // Copy the file path to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(filePath).then(() => {
        this.showToast('Preset path copied to clipboard', 'success');
      }).catch(() => {
        this.showToast('Failed to copy path', 'error');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = filePath;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.showToast('Preset path copied to clipboard', 'success');
      } catch {
        this.showToast('Failed to copy path', 'error');
      }
      document.body.removeChild(textArea);
    }
  }

  private showError(message: string): void {
    this.showToast(message, 'error');
  }

  private showInfo(message: string): void {
    this.showToast(message, 'success');
  }

  private showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 4 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 4000);
  }
}

// Initialize the renderer when the DOM is loaded
let imageMatchRenderer: ImageMatchRenderer | undefined;

document.addEventListener('DOMContentLoaded', () => {
  // Avoid creating multiple instances if script is injected twice
  if ((window as any).imageMatchRenderer) {
    console.log('[UI] Renderer already initialized, skipping duplicate init');
    return;
  }
  imageMatchRenderer = new ImageMatchRenderer();
  // Make imageMatchRenderer globally available for onclick handlers
  (window as any).imageMatchRenderer = imageMatchRenderer;
});
