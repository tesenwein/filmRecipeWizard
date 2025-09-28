import { openai } from '@ai-sdk/openai';
import { experimental_generateImage as generateImage } from 'ai';

export interface RecipeImageGenerationOptions {
  recipeName?: string;
  prompt?: string;
  artistStyle?: { name: string; description?: string };
  filmStyle?: { name: string; description?: string };
  orientation?: 'portrait' | 'landscape' | 'street';
  colorAdjustments?: any; // Full color adjustments from recipe
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
        return {
          success: false,
          error: 'Content policy violation: The generated prompt violates OpenAI\'s safety guidelines. Please try using more neutral and professional terms in your recipe name, prompt, or style options.',
        };
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private buildImagePrompt(options: RecipeImageGenerationOptions): string {
    const parts: string[] = [];

    // Orientation-specific base description
    if (options.orientation === 'portrait') {
      parts.push('A stunning professional portrait photography reference image that showcases');
    } else if (options.orientation === 'landscape') {
      parts.push('A stunning professional landscape photography reference image that showcases');
    } else if (options.orientation === 'street') {
      parts.push('A stunning professional street photography reference image that showcases');
    } else {
      parts.push('A stunning professional photography reference image that showcases');
    }

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

    // Add color adjustment information to the prompt
    if (options.colorAdjustments) {
      const colorDescription = this.buildColorDescription(options.colorAdjustments);
      if (colorDescription) {
        parts.push(colorDescription);
      }
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

    // Add orientation-specific composition guidance FIRST for better AI understanding
    if (options.orientation === 'portrait') {
      parts.push('The image should be composed in portrait orientation (vertical)');
      parts.push('with a tall, vertical composition that emphasizes height and depth');
      parts.push('perfect for showcasing portrait-style color grading techniques');
      parts.push('The scene should include varied textures, natural lighting conditions');
      parts.push('and a range of colors that showcase the grading capabilities');
    } else if (options.orientation === 'landscape') {
      parts.push('The image should be composed in landscape orientation (horizontal)');
      parts.push('with a wide, expansive composition that emphasizes breadth and scope');
      parts.push('perfect for showcasing landscape-style color grading techniques');
      parts.push('The scene should include varied textures, natural lighting conditions');
      parts.push('and a range of colors that showcase the grading capabilities');
    } else if (options.orientation === 'street') {
      parts.push('The image should be composed in a dynamic street photography style');
      parts.push('with urban elements, candid moments, and authentic street scenes');
      parts.push('perfect for showcasing street photography color grading techniques');
      parts.push('The scene should include varied textures, natural lighting conditions');
      parts.push('and a range of colors that showcase the grading capabilities');
    } else {
      parts.push('The image should be composed in portrait orientation (vertical)');
      parts.push('unless the scene clearly benefits from landscape orientation');
      parts.push('as portrait format provides better reference for color grading techniques');
      parts.push('The scene should include varied textures, natural lighting conditions');
      parts.push('and a range of colors that showcase the grading capabilities');
    }
    
    // Add specific scene suggestions for better results
    const sceneSuggestion = this.getSceneSuggestion(options);
    parts.push(`The image should depict ${sceneSuggestion}`);
    parts.push('with professional lighting that highlights the color grading potential');
    parts.push('showing a well-balanced photograph with excellent tonal range');
    parts.push('perfect for demonstrating film emulation and color correction techniques');

    return parts.join(' ');
  }

  private buildColorDescription(colorAdjustments: any): string {
    const colorParts: string[] = [];
    
    // Check for monochrome/black and white treatment
    if (colorAdjustments.treatment === 'black_and_white' || colorAdjustments.monochrome === true) {
      colorParts.push('in black and white monochrome style');
      
      // Add black and white mix information if available
      const bwMix = [];
      if (colorAdjustments.gray_red !== undefined) bwMix.push(`red channel: ${colorAdjustments.gray_red}`);
      if (colorAdjustments.gray_orange !== undefined) bwMix.push(`orange channel: ${colorAdjustments.gray_orange}`);
      if (colorAdjustments.gray_yellow !== undefined) bwMix.push(`yellow channel: ${colorAdjustments.gray_yellow}`);
      if (colorAdjustments.gray_green !== undefined) bwMix.push(`green channel: ${colorAdjustments.gray_green}`);
      if (colorAdjustments.gray_blue !== undefined) bwMix.push(`blue channel: ${colorAdjustments.gray_blue}`);
      if (colorAdjustments.gray_purple !== undefined) bwMix.push(`purple channel: ${colorAdjustments.gray_purple}`);
      if (colorAdjustments.gray_magenta !== undefined) bwMix.push(`magenta channel: ${colorAdjustments.gray_magenta}`);
      
      if (bwMix.length > 0) {
        colorParts.push(`with specific black and white channel mixing: ${bwMix.join(', ')}`);
      }
    } else {
      // Color treatment - describe color characteristics
      if (colorAdjustments.saturation !== undefined) {
        const satLevel = colorAdjustments.saturation > 0 ? 'enhanced' : 'reduced';
        colorParts.push(`with ${satLevel} saturation (${colorAdjustments.saturation})`);
      }
      
      if (colorAdjustments.vibrance !== undefined) {
        const vibLevel = colorAdjustments.vibrance > 0 ? 'enhanced' : 'reduced';
        colorParts.push(`with ${vibLevel} vibrance (${colorAdjustments.vibrance})`);
      }
      
      // Color grading information
      if (colorAdjustments.color_grade_shadow_hue !== undefined || 
          colorAdjustments.color_grade_midtone_hue !== undefined || 
          colorAdjustments.color_grade_highlight_hue !== undefined) {
        colorParts.push('with color grading applied to shadows, midtones, and highlights');
      }
      
      // HSL adjustments
      const hslAdjustments = [];
      if (colorAdjustments.hue_red !== undefined) hslAdjustments.push(`red hue: ${colorAdjustments.hue_red}`);
      if (colorAdjustments.hue_orange !== undefined) hslAdjustments.push(`orange hue: ${colorAdjustments.hue_orange}`);
      if (colorAdjustments.hue_yellow !== undefined) hslAdjustments.push(`yellow hue: ${colorAdjustments.hue_yellow}`);
      if (colorAdjustments.hue_green !== undefined) hslAdjustments.push(`green hue: ${colorAdjustments.hue_green}`);
      if (colorAdjustments.hue_blue !== undefined) hslAdjustments.push(`blue hue: ${colorAdjustments.hue_blue}`);
      if (colorAdjustments.hue_purple !== undefined) hslAdjustments.push(`purple hue: ${colorAdjustments.hue_purple}`);
      if (colorAdjustments.hue_magenta !== undefined) hslAdjustments.push(`magenta hue: ${colorAdjustments.hue_magenta}`);
      
      if (hslAdjustments.length > 0) {
        colorParts.push(`with specific color channel adjustments: ${hslAdjustments.join(', ')}`);
      }
    }
    
    // Basic adjustments
    if (colorAdjustments.exposure !== undefined) {
      const expLevel = colorAdjustments.exposure > 0 ? 'brightened' : 'darkened';
      colorParts.push(`with ${expLevel} exposure (${colorAdjustments.exposure})`);
    }
    
    if (colorAdjustments.contrast !== undefined) {
      const contrastLevel = colorAdjustments.contrast > 0 ? 'enhanced' : 'reduced';
      colorParts.push(`with ${contrastLevel} contrast (${colorAdjustments.contrast})`);
    }
    
    return colorParts.length > 0 ? colorParts.join(', ') : '';
  }

  private getSceneSuggestion(options?: RecipeImageGenerationOptions): string {
    if (options?.orientation === 'portrait') {
      const portraitScenes = [
        'a tall modern building with glass facades and concrete surfaces',
        'a vertical natural setting with tall trees, rock formations, and organic textures',
        'a person in a well-lit environment with interesting background textures',
        'a vertical architectural detail with interesting lighting and materials',
        'a tall structure with varied surface materials and lighting conditions'
      ];
      return portraitScenes[Math.floor(Math.random() * portraitScenes.length)];
    } else if (options?.orientation === 'landscape') {
      const landscapeScenes = [
        'a wide natural landscape with varied terrain and lighting',
        'a horizontal cityscape with buildings and urban elements',
        'a panoramic view with mountains, water, and sky',
        'a wide architectural scene with horizontal composition',
        'an expansive outdoor setting with natural lighting variations'
      ];
      return landscapeScenes[Math.floor(Math.random() * landscapeScenes.length)];
    } else if (options?.orientation === 'street') {
      const streetScenes = [
        'a busy urban street with people, vehicles, and city architecture',
        'a candid street scene with authentic urban atmosphere',
        'a dynamic city intersection with varied lighting and textures',
        'an urban environment with street art, signs, and city life',
        'a bustling city scene with natural street lighting and movement'
      ];
      return streetScenes[Math.floor(Math.random() * streetScenes.length)];
    }
    
    const scenes = [
      'a tall modern building with glass facades and concrete surfaces',
      'a vertical natural setting with tall trees, rock formations, and organic textures',
      'an interior space with vertical elements, mixed lighting and various materials',
      'a street scene with tall architectural elements and natural lighting',
      'a vertical landscape with varied terrain and natural lighting conditions',
      'an industrial setting with vertical metal structures and dramatic lighting',
      'a residential area with tall buildings and diverse architectural styles'
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
