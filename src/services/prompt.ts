// Build the multimodal user content for the OpenAI request
// Emphasizes auto-recognition masks (Subject/People, Background, Sky) over geometric masks for humans

export function buildUserContentForAnalysis(
  baseImageB64: string | undefined,
  targetImageB64: string,
  hint?: string
): any[] {
  const content: any[] = [];
  if (hint) {
    content.push({ type: 'text' as const, text: `Hint: ${hint}` });
  }

  const sharedInstructions = `You are a professional photo editor and colorist.\n\nPlease provide detailed Lightroom/Camera Raw adjustments to achieve the target look, including white balance, tone, HSL, curves, and modern color grading as needed.\n\nLocal masks guidance:\n- Prefer automatic masks when applicable: use Subject/People, Background, and Sky masks.\n- Do NOT use linear or radial masks to isolate faces or human subjects — use Subject/People instead.\n- Geometric (linear/radial) masks are allowed for global scene shaping (vignettes, gradients) where appropriate.\n- Keep mask values conservative. Use normalized geometry (0..1).\n- Propose up to 3 local masks.\n\nAlso include a short preset_name:\n- 2–4 words, Title Case, descriptive of the look\n- Avoid words like “AI”, file names, or dates; only letters, numbers, spaces, hyphens.`;

  if (baseImageB64) {
    content.push(
      {
        type: 'text' as const,
        text:
          `I have two images:\n\n` +
          `1. BASE IMAGE: reference photo with the desired grading, mood, and style\n` +
          `2. TARGET IMAGE: photo to adjust to match the BASE IMAGE's color characteristics\n` +
          `3. For portraits, ensure a match in skin tone and backdrop\n` +
          `4. For landscapes, ensure sky/foliage mood and lighting alignment\n\n` +
          `Please analyze both images and respond with the complete adjustments.\n\n` +
          sharedInstructions,
      },
      { type: 'text' as const, text: 'BASE IMAGE (reference style):' },
      { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${baseImageB64}` } },
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

