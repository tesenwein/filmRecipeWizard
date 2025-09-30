export type ArtistStyle = {
  key: string;
  name: string;
  category: string; // Portrait, Landscape, Street, Editorial
  blurb: string;
  prompt?: string;
};

export const ARTIST_STYLES: Record<string, ArtistStyle[]> = {
  Portrait: [
    {
      key: 'leibovitz',
      name: 'Annie Leibovitz',
      category: 'Portrait',
      blurb: 'Dramatic portraiture, controlled light, rich tonal color, crisp detail.',
      prompt: 'Create dramatic portraiture with controlled lighting. Use strong contrast (contrast: +20 to +40), rich tonal color with warm highlights and deep shadows. Apply S-curve tone curves to lift shadows and compress highlights. Use color grading to enhance skin tones with warm midtones (+15 hue, +10 saturation). Add subtle clarity (+10 to +20) for crisp detail. Focus on dramatic lighting with strong directional shadows.'
    },
    {
      key: 'lindbergh',
      name: 'Peter Lindbergh',
      category: 'Portrait',
      blurb: 'Cinematic monochrome, natural light, honest texture, minimal retouching.',
      prompt: 'Create cinematic monochrome with natural lighting. Use high contrast (contrast: +30 to +50) with strong blacks and whites. Apply film grain (grain_amount: 20-40, grain_size: 15-25) for texture. Use S-curve tone curves with lifted shadows (0,0 to 30,15) and compressed highlights (200,200 to 255,230). Add subtle clarity (+5 to +15) for honest texture. Focus on natural lighting with soft shadows and minimal retouching aesthetic.'
    },
    {
      key: 'mccurry',
      name: 'Steve McCurry',
      category: 'Portrait',
      blurb: 'Vivid color portraiture, deep cultural tones, warm highlights and rich saturation.',
      prompt: 'Create vivid color portraiture with deep cultural tones. Use high saturation (saturation: +20 to +40) and warm color grading. Apply warm highlights (+20 hue, +15 saturation) and rich midtones. Use S-curve tone curves with lifted shadows (0,0 to 25,20) for detail. Add subtle vibrance (+15 to +25) for natural color enhancement. Focus on warm, golden hour lighting with rich cultural color palettes.'
    },
    {
      key: 'platon',
      name: 'Platon',
      category: 'Portrait',
      blurb: 'High-contrast black & white, powerful close-up faces, stark backgrounds.',
      prompt: 'Create high-contrast black & white portraiture. Use extreme contrast (contrast: +40 to +60) with deep blacks and bright whites. Apply S-curve tone curves with strong shadow compression (0,0 to 20,5) and highlight compression (200,200 to 255,240). Use clarity (+20 to +30) for sharp detail. Focus on powerful close-up compositions with stark, minimal backgrounds. Emphasize facial features with dramatic lighting.'
    },
    {
      key: 'penn',
      name: 'Irving Penn',
      category: 'Portrait',
      blurb: 'Minimalist studio elegance, refined tonality, subtle contrast and texture.',
      prompt: 'Create minimalist studio elegance with refined tonality. Use subtle contrast (contrast: +5 to +15) with gentle S-curve tone curves. Apply soft color grading with neutral tones (shadows: +5 hue, +5 saturation). Use clarity (+5 to +10) for refined texture. Focus on clean, minimal compositions with elegant lighting and refined tonal transitions.'
    },
    {
      key: 'sherman',
      name: 'Cindy Sherman',
      category: 'Portrait',
      blurb: 'Muted palettes, painterly tones, contemplative atmosphere with gentle contrast.',
      prompt: 'Create muted palettes with painterly tones. Use gentle contrast (contrast: +5 to +15) with soft color grading. Apply muted saturation (saturation: -10 to -20) and warm, contemplative tones (shadows: +10 hue, +5 saturation). Use soft S-curve tone curves with lifted shadows (0,0 to 30,25) for painterly effect. Add subtle grain (grain_amount: 10-20) for texture. Focus on contemplative atmosphere with gentle, dreamy lighting.'
    },
    {
      key: 'newton',
      name: 'Helmut Newton',
      category: 'Portrait',
      blurb: 'High-contrast fashion noir, glossy monochrome, bold highlights and shadows.',
      prompt: 'Create high-contrast fashion noir with glossy monochrome. Use extreme contrast (contrast: +40 to +60) with bold highlights and deep shadows. Apply S-curve tone curves with strong compression (0,0 to 15,5) and (200,200 to 255,235). Use clarity (+25 to +35) for glossy effect. Focus on dramatic fashion lighting with bold, graphic compositions and strong shadow/highlight separation.'
    },
    {
      key: 'aavedon',
      name: 'Richard Avedon',
      category: 'Portrait',
      blurb: 'Minimal backgrounds, crisp tones, expressive portraiture, high-key balance.',
      prompt: 'Create minimal backgrounds with crisp tones and high-key balance. Use moderate contrast (contrast: +15 to +25) with clean, crisp detail. Apply high-key lighting with lifted shadows (shadows: +20 to +30) and bright highlights. Use clarity (+15 to +25) for crisp tones. Focus on expressive portraiture with minimal, clean backgrounds and balanced high-key lighting.'
    },
    {
      key: 'testino',
      name: 'Mario Testino',
      category: 'Portrait',
      blurb: 'Polished color fashion, luminous skin tones, bright and energetic palette.',
      prompt: 'Create polished color fashion with luminous skin tones. Use bright, energetic palette with high saturation (saturation: +20 to +35). Apply warm color grading for skin tones (midtones: +15 hue, +10 saturation). Use moderate contrast (contrast: +15 to +25) with bright highlights (highlights: +10 to +20). Add vibrance (+20 to +30) for luminous effect. Focus on polished fashion lighting with bright, energetic compositions.'
    },
    {
      key: 'demarchelier',
      name: 'Patrick Demarchelier',
      category: 'Portrait',
      blurb: 'Elegant fashion portraiture, soft natural light, refined color and composition.',
      prompt: 'Create elegant fashion portraiture with soft natural light. Use refined color grading with gentle contrast (contrast: +10 to +20) and soft highlights (highlights: -5 to -15). Apply warm color grading (shadows: +10 hue, +5 saturation) for elegant skin tones. Use subtle clarity (+5 to +15) for refined detail. Focus on elegant compositions with soft, natural lighting and refined color harmony.'
    },
    {
      key: 'weber',
      name: 'Bruce Weber',
      category: 'Portrait',
      blurb: 'Natural outdoor portraiture, warm golden tones, romantic and nostalgic mood.',
      prompt: 'Create natural outdoor portraiture with warm golden tones. Use warm color grading (shadows: +20 hue, +15 saturation) and golden highlights (highlights: +15 hue, +10 saturation). Apply gentle contrast (contrast: +10 to +20) with lifted shadows (shadows: +15 to +25) for romantic mood. Add subtle grain (grain_amount: 10-20) for nostalgic texture. Focus on natural outdoor lighting with warm, golden hour tones and romantic atmosphere.'
    },
    {
      key: 'bailey',
      name: 'David Bailey',
      category: 'Portrait',
      blurb: 'Raw energy, high contrast, bold composition, iconic 60s fashion aesthetic.',
      prompt: 'Create raw energy with high contrast and bold composition. Use extreme contrast (contrast: +40 to +60) with bold highlights and deep shadows. Apply S-curve tone curves with strong compression (0,0 to 15,5) and (200,200 to 255,235). Use clarity (+25 to +35) for sharp detail. Focus on bold, graphic compositions with strong shadow/highlight separation and iconic 60s fashion aesthetic.'
    }
  ],
  Landscape: [
    {
      key: 'adams',
      name: 'Ansel Adams',
      category: 'Landscape',
      blurb: 'High-contrast black & white, deep dynamic range, dramatic skies.',
      prompt: 'Create high-contrast black & white landscapes with deep dynamic range. Use extreme contrast (contrast: +50 to +70) with dramatic skies and strong tonal separation. Apply S-curve tone curves with strong shadow compression (0,0 to 10,3) and highlight compression (200,200 to 255,240). Use clarity (+30 to +40) for sharp detail and micro-contrast. Focus on dramatic lighting with strong shadow/highlight separation and zone system tonal distribution.'
    },
    {
      key: 'michals',
      name: 'Michael Michals',
      category: 'Landscape',
      blurb: 'Vivid natural color, clarity, luminous twilight and alpine hues.',
      prompt: 'Create vivid natural color with clarity and luminous twilight/alpine hues. Use high saturation (saturation: +25 to +40) with enhanced clarity (+20 to +30). Apply warm color grading for twilight (shadows: +15 hue, +10 saturation) and cool alpine tones (highlights: -10 hue, +5 saturation). Use moderate contrast (contrast: +15 to +25) with lifted shadows (shadows: +10 to +20). Focus on natural outdoor lighting with vivid color and sharp detail.'
    },
    {
      key: 'sugimoto',
      name: 'Hiroshi Sugimoto',
      category: 'Landscape',
      blurb: 'Minimalist long exposures, ethereal monochrome, quiet negative space.',
      prompt: 'Create minimalist long exposure aesthetics with ethereal monochrome. Use gentle contrast (contrast: +5 to +15) with soft, ethereal tones. Apply lifted shadows (shadows: +20 to +30) and soft highlights (highlights: -10 to -20) for ethereal effect. Use subtle clarity (+5 to +10) and fine grain (grain_amount: 5-15, grain_size: 3-8). Focus on quiet negative space with minimalist compositions and ethereal, dreamy atmosphere.'
    },
    {
      key: 'burtynsky',
      name: 'Edward Burtynsky',
      category: 'Landscape',
      blurb: 'Industrial landscapes, muted palettes, environmental storytelling through color.',
      prompt: 'Create industrial landscapes with muted palettes and environmental storytelling. Use muted saturation (saturation: -10 to -20) with industrial color grading (shadows: -5 hue, +5 saturation). Apply moderate contrast (contrast: +10 to +20) with lifted shadows (shadows: +10 to +20). Use subtle clarity (+5 to +15) for industrial detail. Focus on environmental storytelling through muted color palettes and industrial subject matter.'
    },
    {
      key: 'mishkin',
      name: 'Alexey Mishkin',
      category: 'Landscape',
      blurb: 'Moody atmospheric landscapes, soft contrast, ethereal light and mist.',
      prompt: 'Create moody atmospheric landscapes with soft contrast and ethereal light. Use gentle contrast (contrast: +5 to +15) with soft, ethereal tones. Apply lifted shadows (shadows: +15 to +25) and soft highlights (highlights: -10 to -20) for ethereal effect. Use subtle clarity (+5 to +10) and fine grain (grain_amount: 10-20) for atmospheric texture. Focus on moody, atmospheric lighting with ethereal mist and soft, dreamy tones.'
    },
    {
      key: 'moon',
      name: 'Michael Moon',
      category: 'Landscape',
      blurb: 'Dramatic seascapes, high contrast, powerful waves and stormy skies.',
      prompt: 'Create dramatic seascapes with high contrast and powerful waves. Use high contrast (contrast: +30 to +50) with dramatic tonal separation. Apply S-curve tone curves with strong shadow compression (0,0 to 15,8) and highlight compression (200,200 to 255,230). Use clarity (+20 to +30) for wave detail. Focus on dramatic lighting with powerful waves and stormy skies with high contrast and dramatic atmosphere.'
    },
    {
      key: 'cornish',
      name: 'Joe Cornish',
      category: 'Landscape',
      blurb: 'Classic British landscapes, natural color, balanced composition and light.',
      prompt: 'Create classic British landscapes with natural color and balanced composition. Use natural color grading with moderate contrast (contrast: +10 to +20) and balanced exposure. Apply gentle S-curve tone curves with lifted shadows (0,0 to 25,20) and soft highlights (highlights: -5 to -10). Use subtle clarity (+5 to +15) for natural detail. Focus on balanced lighting with natural color reproduction and classic British landscape aesthetics.'
    }
  ],
  Street: [
    {
      key: 'hcb',
      name: 'Henri Cartier-Bresson',
      category: 'Street',
      blurb: 'Classic monochrome, decisive moments, gentle contrast and grain.',
      prompt: 'Create classic monochrome street photography with decisive moments. Use gentle contrast (contrast: +10 to +20) with classic black & white tones. Apply S-curve tone curves with lifted shadows (0,0 to 25,20) and soft highlights (highlights: -5 to -10). Use subtle grain (grain_amount: 10-20, grain_size: 8-15) for classic film texture. Focus on decisive moments with gentle contrast and classic street photography aesthetics.'
    },
    {
      key: 'fanho',
      name: 'Fan Ho',
      category: 'Street',
      blurb: 'Geometric light, deep shadows, sculpted contrast, poetic atmosphere.',
      prompt: 'Create geometric light with deep shadows and sculpted contrast. Use high contrast (contrast: +30 to +50) with sculpted tonal separation. Apply S-curve tone curves with strong shadow compression (0,0 to 15,8) and highlight compression (200,200 to 255,230). Use clarity (+20 to +30) for geometric detail. Focus on geometric compositions with deep shadows and sculpted contrast for poetic atmosphere.'
    },
    {
      key: 'moriyama',
      name: 'Daido Moriyama',
      category: 'Street',
      blurb: 'Gritty high-contrast monochrome, bold grain, raw urban energy.',
      prompt: 'Create gritty high-contrast monochrome with bold grain and raw urban energy. Use extreme contrast (contrast: +40 to +60) with bold grain (grain_amount: 30-50, grain_size: 20-30). Apply S-curve tone curves with strong shadow compression (0,0 to 10,5) and highlight compression (200,200 to 255,235). Use clarity (+25 to +35) for gritty detail. Focus on raw urban energy with bold grain and high-contrast monochrome aesthetics.'
    },
    {
      key: 'maier',
      name: 'Vivian Maier',
      category: 'Street',
      blurb: 'Classic candid moments, balanced tones, subtle contrast and human warmth.',
      prompt: 'Create classic candid moments with balanced tones and human warmth. Use subtle contrast (contrast: +5 to +15) with balanced exposure. Apply gentle S-curve tone curves with lifted shadows (0,0 to 30,25) and soft highlights (highlights: -5 to -10). Use subtle clarity (+5 to +15) for natural detail. Focus on candid moments with balanced tones and human warmth in classic street photography style.'
    },
    {
      key: 'meyerowitz',
      name: 'Joel Meyerowitz',
      category: 'Street',
      blurb: 'Lyrical color street, gentle contrast, ambient light and pastel nuance.',
      prompt: 'Create lyrical color street photography with gentle contrast and pastel nuance. Use gentle contrast (contrast: +5 to +15) with pastel color grading (saturation: -5 to -15). Apply soft S-curve tone curves with lifted shadows (0,0 to 30,25) and soft highlights (highlights: -5 to -10). Use subtle clarity (+5 to +15) for lyrical detail. Focus on ambient light with pastel nuance and lyrical color street photography aesthetics.'
    },
    {
      key: 'winogrand',
      name: 'Garry Winogrand',
      category: 'Street',
      blurb: 'Dynamic composition, tilted angles, high contrast, urban chaos and energy.',
      prompt: 'Create dynamic composition with tilted angles and urban chaos. Use high contrast (contrast: +30 to +50) with dynamic tonal separation. Apply S-curve tone curves with strong shadow compression (0,0 to 15,8) and highlight compression (200,200 to 255,230). Use clarity (+20 to +30) for dynamic detail. Focus on tilted angles with urban chaos and energy in dynamic street photography style.'
    },
    {
      key: 'frank',
      name: 'Robert Frank',
      category: 'Street',
      blurb: 'Raw documentary style, high grain, emotional depth, American road trip aesthetic.',
      prompt: 'Create raw documentary style with high grain and emotional depth. Use moderate contrast (contrast: +15 to +25) with prominent grain (grain_amount: 25-40, grain_size: 15-25). Apply S-curve tone curves with lifted shadows (0,0 to 25,20) and soft highlights (highlights: -5 to -15). Use subtle clarity (+10 to +20) for documentary detail. Focus on emotional depth with raw documentary aesthetics and American road trip atmosphere.'
    },
    {
      key: 'friedlander',
      name: 'Lee Friedlander',
      category: 'Street',
      blurb: 'Complex compositions, reflections, shadows, layered urban environments.',
      prompt: 'Create complex compositions with reflections and layered environments. Use moderate contrast (contrast: +15 to +25) with complex tonal separation. Apply S-curve tone curves with lifted shadows (0,0 to 25,20) and moderate highlights (highlights: -5 to -15). Use clarity (+15 to +25) for layered detail. Focus on complex compositions with reflections, shadows, and layered urban environments in street photography style.'
    },
    {
      key: 'levitt',
      name: 'Helen Levitt',
      category: 'Street',
      blurb: 'Intimate street moments, children at play, natural light, gentle contrast.',
      prompt: 'Create intimate street moments with natural light and gentle contrast. Use gentle contrast (contrast: +5 to +15) with natural exposure. Apply soft S-curve tone curves with lifted shadows (0,0 to 30,25) and soft highlights (highlights: -5 to -10). Use subtle clarity (+5 to +15) for intimate detail. Focus on natural light with intimate street moments and gentle contrast for human warmth.'
    },
    {
      key: 'parks',
      name: 'Gordon Parks',
      category: 'Street',
      blurb: 'Social documentary, powerful storytelling, balanced tones, human dignity.',
      prompt: 'Create social documentary with powerful storytelling and human dignity. Use balanced tones with moderate contrast (contrast: +10 to +20). Apply balanced S-curve tone curves with lifted shadows (0,0 to 25,20) and balanced highlights. Use clarity (+10 to +20) for documentary detail. Focus on powerful storytelling with balanced tones and social documentary aesthetics that emphasize human dignity.'
    }
  ],
  Editorial: [
    {
      key: 'timwalker',
      name: 'Tim Walker',
      category: 'Editorial',
      blurb: 'Whimsical editorial color, dreamlike palettes, saturated yet soft contrast.',
      prompt: 'Create whimsical editorial color with dreamlike palettes. Use saturated color (saturation: +25 to +40) with soft contrast (contrast: +5 to +15) for dreamlike effect. Apply whimsical color grading with pastel tones (shadows: +10 hue, +5 saturation). Use lifted shadows (shadows: +15 to +25) and soft highlights (highlights: -5 to -15) for dreamy atmosphere. Focus on whimsical compositions with dreamlike palettes and soft, ethereal lighting.'
    },
    {
      key: 'unwerth',
      name: 'Ellen von Unwerth',
      category: 'Editorial',
      blurb: 'Playful high-fashion energy, punchy contrast, sensual monochrome or vivid color.',
      prompt: 'Create playful high-fashion energy with punchy contrast. Use high contrast (contrast: +25 to +40) with punchy tonal separation. Apply S-curve tone curves with moderate compression (0,0 to 20,10) and (200,200 to 255,230). Use clarity (+20 to +30) for punchy detail. For color: use vivid saturation (+20 to +35). For monochrome: use high contrast with sculpted tones. Focus on playful compositions with punchy contrast and high-fashion energy.'
    },
    {
      key: 'meisel',
      name: 'Steven Meisel',
      category: 'Editorial',
      blurb: 'High-fashion editorial, dramatic lighting, bold composition, cinematic quality.',
      prompt: 'Create high-fashion editorial with dramatic lighting and cinematic quality. Use high contrast (contrast: +25 to +40) with dramatic tonal separation. Apply S-curve tone curves with strong shadow compression (0,0 to 15,8) and highlight compression (200,200 to 255,230). Use clarity (+20 to +30) for cinematic detail. Focus on dramatic lighting with bold composition and cinematic quality for high-fashion editorial work.'
    },
    {
      key: 'bourdin',
      name: 'Guy Bourdin',
      category: 'Editorial',
      blurb: 'Surreal fashion imagery, bold color, dramatic composition, provocative storytelling.',
      prompt: 'Create surreal fashion imagery with bold color and dramatic composition. Use high saturation (saturation: +25 to +40) with dramatic contrast (contrast: +25 to +40). Apply bold color grading with surreal tones (shadows: +15 hue, +15 saturation). Use S-curve tone curves with strong compression (0,0 to 15,8) and (200,200 to 255,230). Use clarity (+20 to +30) for dramatic detail. Focus on surreal compositions with bold color and provocative storytelling.'
    },
    {
      key: 'klein',
      name: 'William Klein',
      category: 'Editorial',
      blurb: 'Raw energy, high contrast, bold grain, dynamic composition and movement.',
      prompt: 'Create raw energy with high contrast and bold grain. Use extreme contrast (contrast: +40 to +60) with bold grain (grain_amount: 30-50, grain_size: 20-30). Apply S-curve tone curves with strong shadow compression (0,0 to 15,5) and highlight compression (200,200 to 255,235). Use clarity (+25 to +35) for dynamic detail. Focus on raw energy with dynamic composition and movement in bold, graphic style.'
    },
    {
      key: 'mccurry_editorial',
      name: 'Steve McCurry',
      category: 'Editorial',
      blurb: 'Documentary editorial style, cultural storytelling, warm tones, human connection.',
      prompt: 'Create documentary editorial style with cultural storytelling. Use warm color grading (shadows: +15 hue, +10 saturation) with moderate contrast (contrast: +15 to +25). Apply S-curve tone curves with lifted shadows (0,0 to 25,20) for human connection. Use clarity (+10 to +20) for documentary detail. Focus on cultural storytelling with warm tones and human connection in editorial photography style.'
    },
    {
      key: 'leibovitz_editorial',
      name: 'Annie Leibovitz',
      category: 'Editorial',
      blurb: 'Celebrity editorial portraiture, dramatic lighting, controlled composition, iconic moments.',
      prompt: 'Create celebrity editorial portraiture with dramatic lighting and controlled composition. Use high contrast (contrast: +25 to +40) with dramatic tonal separation. Apply S-curve tone curves with strong shadow compression (0,0 to 15,8) and highlight compression (200,200 to 255,230). Use clarity (+20 to +30) for iconic detail. Focus on dramatic lighting with controlled composition and iconic moments in editorial photography style.'
    }
  ],
  Fashion: [
    {
      key: 'demarchelier',
      name: 'Patrick Demarchelier',
      category: 'Fashion',
      blurb: 'Elegant fashion photography, soft natural light, refined color and composition.',
      prompt: 'Create elegant fashion photography with soft natural light. Use refined color grading with gentle contrast (contrast: +10 to +20) and soft highlights (highlights: -5 to -15). Apply warm color grading (shadows: +10 hue, +5 saturation) for elegant skin tones. Use subtle clarity (+5 to +15) for refined detail. Focus on elegant compositions with soft, natural lighting and refined color harmony.'
    },
    {
      key: 'weber',
      name: 'Bruce Weber',
      category: 'Fashion',
      blurb: 'Natural outdoor fashion, warm golden tones, romantic and nostalgic mood.',
      prompt: 'Create natural outdoor fashion with warm golden tones. Use warm color grading (shadows: +20 hue, +15 saturation) and golden highlights (highlights: +15 hue, +10 saturation). Apply gentle contrast (contrast: +10 to +20) with lifted shadows (shadows: +15 to +25) for romantic mood. Add subtle grain (grain_amount: 10-20) for nostalgic texture. Focus on natural outdoor lighting with warm, golden hour tones and romantic atmosphere.'
    },
    {
      key: 'bailey',
      name: 'David Bailey',
      category: 'Fashion',
      blurb: 'Raw energy, high contrast, bold composition, iconic 60s fashion aesthetic.',
      prompt: 'Create raw energy with high contrast and bold composition. Use extreme contrast (contrast: +40 to +60) with bold highlights and deep shadows. Apply S-curve tone curves with strong compression (0,0 to 15,5) and (200,200 to 255,235). Use clarity (+25 to +35) for sharp detail. Focus on bold, graphic compositions with strong shadow/highlight separation and iconic 60s fashion aesthetic.'
    },
    {
      key: 'lindbergh',
      name: 'Peter Lindbergh',
      category: 'Fashion',
      blurb: 'Cinematic monochrome fashion, natural light, honest texture, minimal retouching.',
      prompt: 'Create cinematic monochrome fashion with natural lighting. Use high contrast (contrast: +30 to +50) with strong blacks and whites. Apply film grain (grain_amount: 20-40, grain_size: 15-25) for texture. Use S-curve tone curves with lifted shadows (0,0 to 30,15) and compressed highlights (200,200 to 255,230). Add subtle clarity (+5 to +15) for honest texture. Focus on natural lighting with soft shadows and minimal retouching aesthetic.'
    },
    {
      key: 'testino',
      name: 'Mario Testino',
      category: 'Fashion',
      blurb: 'Polished color fashion, luminous skin tones, bright and energetic palette.',
      prompt: 'Create polished color fashion with luminous skin tones. Use bright, energetic palette with high saturation (saturation: +20 to +35). Apply warm color grading for skin tones (midtones: +15 hue, +10 saturation). Use moderate contrast (contrast: +15 to +25) with bright highlights (highlights: +10 to +20). Add vibrance (+20 to +30) for luminous effect. Focus on polished fashion lighting with bright, energetic compositions.'
    },
    {
      key: 'newton',
      name: 'Helmut Newton',
      category: 'Fashion',
      blurb: 'High-contrast fashion noir, glossy monochrome, bold highlights and shadows.',
      prompt: 'Create high-contrast fashion noir with glossy monochrome. Use extreme contrast (contrast: +40 to +60) with bold highlights and deep shadows. Apply S-curve tone curves with strong compression (0,0 to 15,5) and (200,200 to 255,235). Use clarity (+25 to +35) for glossy effect. Focus on dramatic fashion lighting with bold, graphic compositions and strong shadow/highlight separation.'
    },
    {
      key: 'aavedon',
      name: 'Richard Avedon',
      category: 'Fashion',
      blurb: 'Minimal backgrounds, crisp tones, expressive portraiture, high-key balance.',
      prompt: 'Create minimal backgrounds with crisp tones and high-key balance. Use moderate contrast (contrast: +15 to +25) with clean, crisp detail. Apply high-key lighting with lifted shadows (shadows: +20 to +30) and bright highlights. Use clarity (+15 to +25) for crisp tones. Focus on expressive portraiture with minimal, clean backgrounds and balanced high-key lighting.'
    },
    {
      key: 'lagerfeld',
      name: 'Karl Lagerfeld',
      category: 'Fashion',
      blurb: 'Sophisticated fashion photography, clean lines, minimalist aesthetic, refined elegance.',
      prompt: 'Create sophisticated fashion photography with clean lines and minimalist aesthetic. Use refined color grading with gentle contrast (contrast: +10 to +20) and clean highlights. Apply minimalist color grading (shadows: +5 hue, +5 saturation) for sophisticated tones. Use subtle clarity (+5 to +15) for refined detail. Focus on clean lines with minimalist compositions and sophisticated elegance in fashion photography style.'
    }
  ]
};
