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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private buildImagePrompt(options: RecipeImageGenerationOptions): string {
    const parts: string[] = [];

    // Base description for a film recipe image
    parts.push('A professional photography reference image that demonstrates');

    // Add recipe name context
    if (options.recipeName && options.recipeName.trim()) {
      parts.push(`the "${options.recipeName}" color grading style`);
    } else {
      parts.push('color grading and film emulation');
    }

    // Add artist style context
    if (options.artistStyle?.name) {
      parts.push(`inspired by ${options.artistStyle.name} artistic style`);
    }

    // Add film style context
    if (options.filmStyle?.name) {
      parts.push(`emulating ${options.filmStyle.name} film stock`);
    }

    // Add user prompt if provided
    if (options.prompt && options.prompt.trim()) {
      parts.push(`with the following characteristics: ${options.prompt}`);
    }

    // Add technical characteristics based on user options
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

    // Add final descriptive elements
    parts.push('showing a well-composed photograph with good lighting, suitable for color grading reference');

    return parts.join(' ');
  }
}
