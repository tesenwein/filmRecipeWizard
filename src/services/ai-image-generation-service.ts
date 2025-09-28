import OpenAI from 'openai';

export interface RecipeImageGenerationOptions {
  recipeName?: string;
  prompt?: string;
  artistStyle?: { name: string; description?: string };
  filmStyle?: { name: string; description?: string };
  orientation?: 'portrait' | 'landscape' | 'street';
  colorAdjustments?: any; // Full color adjustments from recipe
}

export class AIImageGenerationService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async generateRecipeImage(options: RecipeImageGenerationOptions): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
  }> {
    try {
      // Build the prompt based on the recipe options
      const prompt = this.buildPrompt(options);
      
      // Generate image using DALL-E
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      });

      const imageUrl = response.data?.[0]?.url;
      
      if (!imageUrl) {
        return {
          success: false,
          error: 'No image URL returned from DALL-E'
        };
      }

      return {
        success: true,
        imageUrl: imageUrl
      };
    } catch (error) {
      console.error('AI Image Generation Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildPrompt(options: RecipeImageGenerationOptions): string {
    let prompt = '';

    // Add recipe name context
    if (options.recipeName) {
      prompt += `Film recipe style: ${options.recipeName}. `;
    }

    // Add custom prompt
    if (options.prompt) {
      prompt += options.prompt;
    } else {
      // Build default prompt based on style options
      if (options.artistStyle) {
        prompt += `In the style of ${options.artistStyle.name}`;
        if (options.artistStyle.description) {
          prompt += ` (${options.artistStyle.description})`;
        }
        prompt += '. ';
      }

      if (options.filmStyle) {
        prompt += `${options.filmStyle.name} film aesthetic`;
        if (options.filmStyle.description) {
          prompt += ` (${options.filmStyle.description})`;
        }
        prompt += '. ';
      }

      // Add orientation
      if (options.orientation) {
        prompt += `${options.orientation} composition. `;
      }

      // Add color context from adjustments
      if (options.colorAdjustments) {
        const colorContext = this.getColorContext(options.colorAdjustments);
        if (colorContext) {
          prompt += colorContext;
        }
      }
    }

    // Add quality and technical specifications
    prompt += 'High quality, professional photography, detailed, cinematic lighting.';

    return prompt;
  }

  private getColorContext(adjustments: any): string {
    const context: string[] = [];

    // Analyze exposure
    if (adjustments.exposure && adjustments.exposure !== 0) {
      if (adjustments.exposure > 0) {
        context.push('bright, well-exposed');
      } else {
        context.push('moody, underexposed');
      }
    }

    // Analyze contrast
    if (adjustments.contrast && adjustments.contrast !== 0) {
      if (adjustments.contrast > 0) {
        context.push('high contrast');
      } else {
        context.push('low contrast, soft');
      }
    }

    // Analyze saturation
    if (adjustments.saturation && adjustments.saturation !== 0) {
      if (adjustments.saturation > 0) {
        context.push('vibrant colors');
      } else {
        context.push('desaturated, muted colors');
      }
    }

    // Analyze vibrance
    if (adjustments.vibrance && adjustments.vibrance !== 0) {
      if (adjustments.vibrance > 0) {
        context.push('enhanced color vibrancy');
      } else {
        context.push('reduced color intensity');
      }
    }

    // Analyze highlights and shadows
    if (adjustments.highlights && adjustments.highlights < 0) {
      context.push('preserved highlights');
    }
    if (adjustments.shadows && adjustments.shadows > 0) {
      context.push('lifted shadows');
    }

    return context.length > 0 ? context.join(', ') + '. ' : '';
  }
}
