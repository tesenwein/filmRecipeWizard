// Build the multimodal user content for the OpenAI request
// Emphasizes auto-recognition masks (Subject/People, Background, Sky) over geometric masks for humans

export function buildUserContentForAnalysis(
  baseImageB64: string | string[] | undefined,
  targetImageB64: string,
  hint?: string,
  opts?: { preserveSkinTones?: boolean; emphasize3DPop?: boolean }
): any[] {
  const content: any[] = [];
  if (hint) {
    content.push({ type: 'text' as const, text: `Hint: ${hint}` });
  }
  if (opts?.emphasize3DPop) {
    content.push({
      type: 'text' as const,
      text:
        'MANDATORY 3D POP: You must add two masks using tool calls: (1) add_subject_mask named "Subject Pop" and (2) add_background_mask named "Background Falloff". Use subtle, balanced Local* values to create depth. Do not omit these masks even if the face is subtle. Provide correct referenceX/referenceY for both.',
    });
  }

  const sharedInstructions = `You are a professional photo editor and colorist.\n\nPlease provide detailed Lightroom/Camera Raw adjustments to achieve the target look, including white balance, tone, HSL, curves, and modern color grading as needed.\n\nColor accuracy guidance:\n- Aim for faithful color reproduction and avoid unwanted color casts.\n- Keep hue relationships accurate; do not shift reference colors unnecessarily.\n- Match white balance closely unless a deliberate stylistic change is requested.\n\nTool usage (important):\n- First, call report_global_adjustments exactly once with all global settings and include confidence (0..1) and a short reasoning string. If you prefer, you may also include a masks array here.\n- Prefer specific mask functions (add_subject_mask, add_background_mask, add_sky_mask, add_linear_mask, add_radial_mask, add_range_color_mask, add_range_luminance_mask) — call once per mask (max 3). If unavailable, fall back to add_mask.\n- Use the correct mask type: 'subject'/'person' for people, 'background' for background, 'sky' for sky, 'linear'/'radial' for geometric, and 'range_color'/'range_luminance' for range masks.\n- Provide geometry in 0..1 normalized units.\n- Mask adjustments must be in -1..1 for Local*2012 parameters.\n\n3D pop for portraits (required when a person is present):\n- Include a Subject/People mask named 'Subject Pop' with subtle positive adjustments to make the subject stand out. Typical ranges: exposure +0.20..+0.40, shadows +0.10..+0.30, clarity +0.05..+0.15, texture +0.05..+0.15, temperature +0.02..+0.08, tint +0.02..+0.08.\n- Include a Background mask named 'Background Falloff' with a gentle falloff: exposure -0.20..-0.40, saturation -0.05..-0.15, contrast +0.05..+0.15, clarity -0.05..-0.15, temperature -0.05..0.00.\n- Choose sensible reference points (near face for Subject; background median area for Background).\n- Avoid empty masks: only emit a mask if at least one Local* parameter is non-zero.\n\nLocal masks guidance:\n- Prefer automatic masks when applicable: use Subject/People, Background, and Sky masks.\n- Do NOT use linear or radial masks to isolate faces or human subjects — use Subject/People instead.\n- Geometric (linear/radial) masks are allowed for global scene shaping (vignettes, gradients) where appropriate.\n- Keep mask values conservative. Use normalized geometry (0..1).\n- Propose up to 3 local masks.` +
    (opts?.preserveSkinTones
      ? `\n- For portraits, preserve natural skin tones using People/Subject masks; avoid over-saturation or hue shifts on skin.`
      : '') +
    `\n\nAlso include a short preset_name:\n- 2–4 words, Title Case, descriptive of the look\n- Avoid words like “AI”, file names, or dates; only letters, numbers, spaces, hyphens.`;

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
