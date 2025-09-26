import { openai } from '@ai-sdk/openai';
import { experimental_generateImage as generateImage } from 'ai';

export interface RecipeImageGenerationOptions {
  recipeName?: string;
  prompt?: string;
  artistStyle?: { name: string; description?: string };
  filmStyle?: { name: string; description?: string };
  userOptions?: {
    contrast?: number;
    vibrance?: number;
    saturationBias?: number;
  };
}

export interface GeneratedImageResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export class AIImageGenerationService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateRecipeImage(options: RecipeImageGenerationOptions): Promise<GeneratedImageResult> {
    try {
      // Set API key for this call
      process.env.OPENAI_API_KEY = this.apiKey;

      // Build a descriptive prompt based on recipe information
      const prompt = this.buildImagePrompt(options);

      // Use AI SDK's experimental_generateImage with DALL-E 3
      const { image } = await generateImage({
        model: openai.image('gpt-image-1'),
        prompt: prompt,
        size: '1024x1024',
        providerOptions: {
          openai: {
            quality: 'low'
          },
        },
      });

      // Convert the image to a data URL for use in the application
      const imageDataUrl = `data:image/png;base64,${image.base64}`;

      return {
        success: true,
        imageUrl: imageDataUrl,
      };
    } catch (error) {
      console.error('AI image generation failed:', error);
      
      // Check for specific safety/content policy violations
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isSafetyViolation = this.isSafetyViolation(errorMessage);
      
      if (isSafetyViolation) {
        // Try with a safer fallback prompt
        try {
          console.log('Attempting retry with safer prompt...');
          const fallbackPrompt = this.buildSafeFallbackPrompt(options);
          
          const { image } = await generateImage({
            model: openai.image('gpt-image-1'),
            prompt: fallbackPrompt,
            size: '1024x1024',
            providerOptions: {
              openai: {
                quality: 'low'
              },
            },
          });

          const imageDataUrl = `data:image/png;base64,${image.base64}`;
          return {
            success: true,
            imageUrl: imageDataUrl,
          };
        } catch (retryError) {
          console.error('Retry with safe prompt also failed:', retryError);
          return {
            success: false,
            error: 'Content policy violation: The generated prompt violates OpenAI\'s safety guidelines. Please try using more neutral and professional terms in your recipe name, prompt, or style options.',
          };
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private buildImagePrompt(options: RecipeImageGenerationOptions): string {
    const parts: string[] = [];

    // Enhanced base description with more specific photography terminology
    parts.push('A stunning professional photography reference image that showcases');

    // Add recipe name context (sanitized) with more descriptive language
    if (options.recipeName && options.recipeName.trim()) {
      const sanitizedName = this.sanitizePromptText(options.recipeName);
      parts.push(`the distinctive "${sanitizedName}" color grading aesthetic`);
    } else {
      parts.push('advanced color grading and film emulation techniques');
    }

    // Add artist style context (sanitized) with more creative descriptions
    if (options.artistStyle?.name) {
      const sanitizedArtist = this.sanitizePromptText(options.artistStyle.name);
      parts.push(`inspired by the ${sanitizedArtist} artistic vision`);
    }

    // Add film style context (sanitized) with more technical language
    if (options.filmStyle?.name) {
      const sanitizedFilm = this.sanitizePromptText(options.filmStyle.name);
      parts.push(`emulating the characteristic look of ${sanitizedFilm} film stock`);
    }

    // Add user prompt if provided (sanitized) with better integration
    if (options.prompt && options.prompt.trim()) {
      const sanitizedPrompt = this.sanitizePromptText(options.prompt);
      parts.push(`with these specific visual characteristics: ${sanitizedPrompt}`);
    }

    // Enhanced technical characteristics with more descriptive language
    const technicalParts: string[] = [];
    if (options.userOptions?.contrast !== undefined) {
      const contrastLevel = this.getContrastDescription(options.userOptions.contrast);
      technicalParts.push(contrastLevel);
    }
    if (options.userOptions?.vibrance !== undefined) {
      const vibranceLevel = this.getVibranceDescription(options.userOptions.vibrance);
      technicalParts.push(vibranceLevel);
    }
    if (options.userOptions?.saturationBias !== undefined) {
      const saturationLevel = this.getSaturationDescription(options.userOptions.saturationBias);
      technicalParts.push(saturationLevel);
    }

    if (technicalParts.length > 0) {
      parts.push(`featuring ${technicalParts.join(', ')}`);
    }

    // Enhanced composition and lighting description
    parts.push('The image should display masterful composition with');
    parts.push('professional lighting that highlights the color grading potential');
    parts.push('showing a well-balanced photograph with excellent tonal range');
    parts.push('perfect for demonstrating film emulation and color correction techniques');
    
    // Add specific visual elements that work well for color grading reference
    parts.push('The scene should include varied textures, natural lighting conditions');
    parts.push('and a range of colors that showcase the grading capabilities');
    
    // Add specific scene suggestions for better results
    const sceneSuggestion = this.getSceneSuggestion();
    parts.push(`The image should depict ${sceneSuggestion}`);
    parts.push('with architectural details, natural textures, soft natural lighting');
    parts.push('and a variety of surface materials that would benefit from color grading adjustments');

    return parts.join(' ');
  }

  private getSceneSuggestion(): string {
    const scenes = [
      'a modern urban landscape with glass buildings and concrete surfaces',
      'a natural outdoor setting with trees, rocks, and organic textures',
      'an interior space with mixed lighting and various materials',
      'a street scene with architectural elements and natural lighting',
      'a landscape with varied terrain and natural lighting conditions',
      'an industrial setting with metal surfaces and dramatic lighting',
      'a residential area with diverse architectural styles and materials'
    ];
    
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  private isSafetyViolation(errorMessage: string): boolean {
    const safetyKeywords = [
      'content policy',
      'safety',
      'violation',
      'inappropriate',
      'harmful',
      'unsafe',
      'blocked',
      'filtered',
      'policy violation',
      'content filter',
      'safety guidelines',
      'community guidelines'
    ];
    
    const lowerErrorMessage = errorMessage.toLowerCase();
    return safetyKeywords.some(keyword => lowerErrorMessage.includes(keyword));
  }

  private getContrastDescription(contrast: number): string {
    if (contrast > 0.5) {
      return 'dramatic high contrast with deep shadows and bright highlights';
    } else if (contrast > 0) {
      return 'enhanced contrast with rich tonal separation';
    } else if (contrast > -0.5) {
      return 'soft, gentle contrast with smooth tonal transitions';
    } else {
      return 'low contrast with muted, flat tonal range';
    }
  }

  private getVibranceDescription(vibrance: number): string {
    if (vibrance > 0.5) {
      return 'vibrant, saturated colors with rich color depth';
    } else if (vibrance > 0) {
      return 'enhanced color vibrancy with natural saturation';
    } else if (vibrance > -0.5) {
      return 'muted, subdued colors with gentle saturation';
    } else {
      return 'desaturated, muted color palette with minimal vibrancy';
    }
  }

  private getSaturationDescription(saturationBias: number): string {
    if (saturationBias > 0.5) {
      return 'highly saturated colors with intense color richness';
    } else if (saturationBias > 0) {
      return 'enhanced color saturation with vivid tones';
    } else if (saturationBias > -0.5) {
      return 'reduced color saturation with subtle tones';
    } else {
      return 'desaturated colors with minimal saturation';
    }
  }

  private buildSafeFallbackPrompt(options: RecipeImageGenerationOptions): string {
    // Create a very safe, generic prompt that focuses on technical photography aspects
    const parts: string[] = [];
    
    parts.push('A professional photography reference image');
    parts.push('demonstrating color grading techniques');
    parts.push('with neutral lighting and composition');
    parts.push('suitable for film emulation reference');
    
    // Add only technical characteristics without any potentially problematic terms
    const technicalParts: string[] = [];
    if (options.userOptions?.contrast !== undefined) {
      const contrastLevel = options.userOptions.contrast > 0 ? 'enhanced' : 'reduced';
      technicalParts.push(`${contrastLevel} contrast`);
    }
    if (options.userOptions?.vibrance !== undefined) {
      const vibranceLevel = options.userOptions.vibrance > 0 ? 'vibrant' : 'muted';
      technicalParts.push(`${vibranceLevel} colors`);
    }
    if (options.userOptions?.saturationBias !== undefined) {
      const saturationLevel = options.userOptions.saturationBias > 0 ? 'saturated' : 'desaturated';
      technicalParts.push(`${saturationLevel} saturation`);
    }

    if (technicalParts.length > 0) {
      parts.push(`featuring ${technicalParts.join(', ')}`);
    }

    parts.push('showing a clean, professional photograph with good lighting');
    parts.push('perfect for color grading reference and film emulation');

    return parts.join(' ');
  }

  private sanitizePromptText(text: string): string {
    // Remove or replace potentially problematic terms
    const problematicTerms = [
      // Violence-related
      /\b(violent|violence|blood|bloody|gore|gory|weapon|gun|knife|sword|fight|fighting|battle|war|combat)\b/gi,
      // Adult content
      /\b(adult|sexual|nude|naked|explicit|porn|pornographic|erotic|sexy|seductive)\b/gi,
      // Harmful content
      /\b(harmful|dangerous|toxic|poison|drug|illegal|criminal|hate|hateful|offensive)\b/gi,
      // Political/sensitive
      /\b(political|controversial|sensitive|divisive|extreme|radical)\b/gi
    ];

    let sanitized = text;
    problematicTerms.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[removed]');
    });

    // Remove excessive punctuation and special characters that might trigger filters
    sanitized = sanitized.replace(/[!@#$%^&*()_+={}[\]|\\:";'<>?,./]{3,}/g, '');
    
    // Limit length to prevent overly complex prompts
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200) + '...';
    }

    return sanitized.trim();
  }
}
