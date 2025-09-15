// Build the multimodal user content for the OpenAI request
// Emphasizes auto-recognition masks (Subject/People, Background, Sky) over geometric masks for humans

export function buildUserContentForAnalysis(
  baseImageB64: string | string[] | undefined,
  targetImageB64: string,
  hint?: string,
  opts?: { preserveSkinTones?: boolean; lightroomProfile?: string }
): any[] {
  const content: any[] = [];
  if (hint) {
    content.push({ type: 'text' as const, text: `Hint: ${hint}` });
  }

  const sharedInstructions = `You are a professional photo editor. Create Lightroom/Camera Raw adjustments to achieve the target look.

Call functions to:
1. Report global adjustments with confidence and reasoning
2. Create masks when needed (max 3 masks)` +
    (opts?.preserveSkinTones ? `\n3. Preserve natural skin tones in Subject masks` : '') +
    (opts?.lightroomProfile ? `\n\nIMPORTANT: Use "${opts.lightroomProfile}" as the base camera profile in your adjustments. This profile determines the baseline color rendition and contrast.` : '') +
    `
3. For portraits, ensure a match in skin tone and backdrop
4. For landscapes, ensure sky/foliage mood and lighting alignment

Include a short preset_name (2-4 words, Title Case).`;

  if (baseImageB64) {
    const bases = Array.isArray(baseImageB64) ? baseImageB64 : [baseImageB64];
    content.push(
      {
        type: 'text' as const,
        text:
          (bases.length === 1
            ? `I have two images:\n\n`
            : `I have multiple REFERENCE images and one TARGET image:\n\n`) +
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
      { type: 'text' as const, text: bases.length === 1 ? 'BASE IMAGE (reference style):' : `BASE IMAGES (${bases.length}) (reference styles):` },
      ...bases.flatMap((b64, idx) => [
        { type: 'text' as const, text: bases.length > 1 ? `REFERENCE ${idx + 1}:` : 'BASE IMAGE:' },
        { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${b64}` } },
      ]),
      { type: 'text' as const, text: 'TARGET IMAGE (to be adjusted):' },
      { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${targetImageB64}` } }
    );
  } else {
    content.push(
      {
        type: 'text' as const,
        text:
          `I have one image to edit. Apply adjustments to achieve the following style description.\n\n` +
          sharedInstructions,
      },
      { type: 'text' as const, text: 'TARGET IMAGE:' },
      { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${targetImageB64}` } }
    );
  }

  return content;
}
