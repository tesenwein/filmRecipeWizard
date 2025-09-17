// Build the multimodal user content for the OpenAI request
// Emphasizes auto-recognition masks (Subject/People, Background, Sky) over geometric masks for humans

export function buildUserContentForAnalysis(
  baseImageB64: string | string[] | undefined,
  targetImageB64?: string,
  hint?: string,
  opts?: { preserveSkinTones?: boolean; lightroomProfile?: string }
): any[] {
  const content: any[] = [];
  if (hint) {
    content.push({ type: 'text' as const, text: `Hint: ${hint}` });
  }

  const sharedInstructions =
    `You are a professional photo editor. Create comprehensive Lightroom/Camera Raw adjustments to achieve the target look.

Call functions to:
1. Report global adjustments with confidence and reasoning - include color grading, tone curves, HSL adjustments, and other sophisticated techniques
2. Create masks when needed (max 3 masks) for local adjustments` +
    (opts?.preserveSkinTones ? `\n3. Preserve natural skin tones in Subject masks` : '') +
    (opts?.lightroomProfile
      ? `\n\nIMPORTANT: Use "${opts.lightroomProfile}" as the base camera profile in your adjustments. This profile determines the baseline color rendition and contrast.`
      : '') +
    `
3. For portraits, ensure a match in skin tone and backdrop
4. For landscapes, ensure sky/foliage mood and lighting alignment
5. Mask modifications values should be minimal and very subtle
6. Apply advanced color grading techniques including shadow/midtone/highlight color grading
7. Use HSL (hue/saturation/luminance) adjustments to fine-tune specific color ranges
8. Consider tone curve adjustments for sophisticated contrast control

Include a short preset_name (2-4 words, Title Case).
If you select a black & white/monochrome treatment, explicitly include the Black & White Mix (gray_*) values for each color channel (gray_red, gray_orange, gray_yellow, gray_green, gray_aqua, gray_blue, gray_purple, gray_magenta).
If an artist or film style is mentioned in the hint, explicitly include HSL shifts and tone curve adjustments that reflect that style's palette and contrast. Prefer calling the provided tool to report global adjustments once, including HSL fields when applicable.`;

  if (baseImageB64 && targetImageB64) {
    // Both base and target images provided - normal color matching
    const bases = Array.isArray(baseImageB64) ? baseImageB64 : [baseImageB64];
    content.push(
      {
        type: 'text' as const,
        text:
          (bases.length === 1 ? `I have two images:\n\n` : `I have multiple REFERENCE images and one TARGET image:\n\n`) +
          (bases.length === 1
            ? `1. BASE IMAGE: reference photo with the desired grading, mood, and style\n`
            : `1. BASE IMAGES (1-${bases.length}): reference photos capturing different aspects of the desired look\n`) +
          `2. TARGET IMAGE: photo to adjust to match the reference style\n` +
          `3. For portraits, ensure a match in skin tone and backdrop\n` +
          `4. For landscapes, ensure sky/foliage mood and lighting alignment\n\n` +
          (bases.length === 1
            ? `Please analyze both images and respond with the complete adjustments.\n\n`
            : `Please analyze ALL reference images jointly and synthesize a cohesive style. Use them together to derive adjustments, balancing shared characteristics (tone curve, color palette, contrast, mood). Then apply those to the TARGET image.\n\n`) +
          sharedInstructions,
      },
      {
        type: 'text' as const,
        text: bases.length === 1 ? 'BASE IMAGE (reference style):' : `BASE IMAGES (${bases.length}) (reference styles):`,
      },
      ...bases.flatMap((b64, idx) => [
        { type: 'text' as const, text: bases.length > 1 ? `REFERENCE ${idx + 1}:` : 'BASE IMAGE:' },
        { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${b64}` } },
      ]),
      { type: 'text' as const, text: 'TARGET IMAGE (to be adjusted):' },
      { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${targetImageB64}` } }
    );
  } else if (baseImageB64 && !targetImageB64) {
    // Only base image provided - analyze and create adjustments for the base image itself
    const bases = Array.isArray(baseImageB64) ? baseImageB64 : [baseImageB64];
    content.push(
      {
        type: 'text' as const,
        text:
          `I have a reference image${bases.length > 1 ? 's' : ''} to analyze and create comprehensive color grading adjustments for.\n\n` +
          `Please analyze the image${
            bases.length > 1 ? 's' : ''
          } and create sophisticated Lightroom/Camera Raw adjustments including color grading, tone curves, HSL modifications, and local adjustments to enhance its style and mood. Apply advanced techniques to achieve professional-quality results.\n\n` +
          sharedInstructions,
      },
      {
        type: 'text' as const,
        text: bases.length === 1 ? 'REFERENCE IMAGE:' : `REFERENCE IMAGES (${bases.length}):`,
      },
      ...bases.flatMap((b64, idx) => [
        { type: 'text' as const, text: bases.length > 1 ? `IMAGE ${idx + 1}:` : 'IMAGE:' },
        { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${b64}` } },
      ])
    );
  } else if (!baseImageB64 && targetImageB64) {
    // Only target image provided - apply adjustments based on hint
    content.push(
      {
        type: 'text' as const,
        text: `I have one image to edit. Apply adjustments to achieve the following style description.\n\n` + sharedInstructions,
      },
      { type: 'text' as const, text: 'TARGET IMAGE:' },
      { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${targetImageB64}` } }
    );
  } else {
    // No images provided - this shouldn't happen but handle gracefully
    content.push({
      type: 'text' as const,
      text: 'No images provided for analysis. Please provide at least one image.',
    });
  }

  return content;
}
