// Jewelry category prompts for image generation
// Each category has multiple perspective prompts

const ETHNICITY_MODIFIERS = {
  random: '',
  tamilsk: 'The model should be of Tamil/South Indian ethnicity with warm brown skin tone.',
  caucasian: 'The model should be of Caucasian/European ethnicity.',
  norsk: 'The model should be of Norwegian/Scandinavian ethnicity with fair skin.',
  asian: 'The model should be of East Asian ethnicity.'
};

const PROMPTS = {
  ring: {
    name: 'Ringer',
    perspectives: [
      {
        id: 'liggende',
        name: 'Liggende',
        requiresModel: false,
        prompt: `Use the most recently uploaded ring image as the exact product reference.
Create a ultra-high-resolution luxury jewelry product photograph.
Preserve the exact band width, curvature, polish level, proportions, and overall craftsmanship. Do not alter the ring design in any way.
The ring should be shown as a standalone product, not worn, presented in a clean studio setup.
Image quality requirements:
– True 2k resolution
– Ultra-sharp focus
– High micro-detail visibility in metal surfaces, prongs, and stone facets
– Crisp edges, no softness, no blur
– No CGI, no painterly or artificial look
Lighting: bright, neutral, diffused studio lighting optimized for fine jewelry, with controlled highlights and smooth reflections on the polished gold.
Background: pure white or very light neutral background suitable for luxury e-commerce and catalogs.
Composition: front-facing or slight three-quarter angle, centered, clean and balanced.
Focus: sharp focus across the entire ring, with all settings clearly resolved.
Mood: refined, timeless, premium fine jewelry presentation.
Camera style: professional high-end jewelry photography, macro-level detail, ultra-realistic materials.
Do not add text, logos, watermarks, hands, additional jewelry, or props.`
      },
      {
        id: 'staaende_skraat',
        name: 'Stående skrått',
        requiresModel: false,
        prompt: `Create a ultra-high-resolution luxury jewelry product photograph. The ring must remain identical in design to the uploaded reference image Preserve the exact band width, curvature, setting height, polish level, proportions, and craftsmanship. Do not alter the ring design in any way.
The ring should be shown as a standalone product, not worn, floating or resting naturally in a clean studio setup.
Image quality requirements:
– True 2K resolution
– Ultra-sharp focus
– High micro-detail visibility in gold surface
– Crisp edges, no softness, no blur
– No CGI, no painterly look
Lighting: bright, neutral, diffused studio lighting optimized for jewelry, with precise highlights and reflections from ring.
Background: pure white or very light neutral background suitable for e-commerce and luxury catalogs.
Composition: slightly angled three-quarter view, centered, clean and balanced.
Focus: sharp focus across the entire ring.
Mood: refined, timeless, premium bridal or fine jewelry presentation.
Camera style: professional high-end jewelry photography, macro-level detail, realistic materials.
Do not add text, logos, watermarks, shadows from props, hands, or additional jewelry.`
      },
      {
        id: 'modell_1',
        name: 'Modell 1',
        requiresModel: true,
        prompt: `Create a high-end 2k resolution luxury jewelry editorial photograph. The gold ring should be worn on a finger, shown in an extreme close-up macro perspective. The band must remain identical in shape, thickness, polish, and gold tone. Lighting: soft, diffused studio lighting with gentle highlights along the curved gold surface, no harsh reflections. Focus: shallow depth of field, razor-sharp focus on the upper edge of the ring, smooth creamy bokeh background. Color palette: warm golds, beige, soft ivory, subtle skin tones.
Composition: minimalistic, elegant, refined, luxury jewelry magazine style.
Background: clean, uncluttered, softly blurred, editorial aesthetic suitable for a premium gold or fine jewelry magazine.
Mood: timeless, exclusive, sophisticated.
Camera style: macro lens, f/1.8 look, natural skin texture, realistic gold reflections.
Avoid text, logos, watermarks, or excessive props.`
      },
      {
        id: 'modell_2',
        name: 'Modell 2',
        requiresModel: true,
        prompt: `Create a ultra-high-resolution luxury jewelry editorial photograph.
The ring must remain identical in design, band thickness, height, proportions, and overall craftsmanship. Do not alter the ring design in any way.
The ring should be worn naturally on a finger with a relaxed hand pose resting gently on a soft surface.
Placement: the ring should sit correctly at the base of the finger, centered, clearly visible from a slightly angled side view.
Image quality requirements:
– True 2K resolution
– Ultra-sharp focus
– High micro-detail visibility in metal
– No softness, no blur, no painterly or CGI appearance
Lighting: soft, neutral, diffused editorial lighting with subtle highlights and smooth reflections on the metal band.
Skin: natural skin texture, realistic tone, minimal retouching, visible fine detail.
Background: soft, neutral, slightly textured fabric or surface, gently blurred.
Composition: close-up macro-style shot, shallow depth of field, focus locked precisely on the ring.
Mood: elegant, intimate, timeless, premium bridal or fine jewelry editorial.
Camera style: professional macro jewelry photography, focus precision, ultra-realistic materials.
Do not add text, logos, watermarks, extra jewelry, or distracting elements.`
      }
    ]
  },
  halskjede: {
    name: 'Halskjede',
    perspectives: [
      {
        id: 'hengende',
        name: 'Hengende',
        requiresModel: false,
        prompt: `Use the necklace image as the exact product reference.
Create a ultra-high-resolution luxury jewelry product photograph.
The necklace must remain identical in design, exact chain thickness, style, spacing, proportions, curvature, and warm gold tone. Do not alter the jewelry design in any way.
The necklace should be shown as a standalone product, not worn, hanging naturally in a aesthetic gentle curve, symmetrical and clean.
Image quality requirements:
– True 2K resolution
– Ultra-sharp focus
– High micro-detail visibility
– Crisp edges, no softness, no blur
– No CGI, no painterly or artificial look
Lighting: bright, neutral, diffused studio lighting with soft, controlled highlights and smooth reflections on polished gold.
Background: pure white or very light neutral background suitable for luxury e-commerce and catalogs.
Composition: centered, balanced, minimal, refined.
Focus: sharp focus across the entire visible length of the necklace.
Mood: minimal, elegant, timeless fine jewelry presentation.
Camera style: professional high-end jewelry photography, macro-level realism, accurate materials.
Do not add text, logos, watermarks, clasps emphasized out of scale, hands, mannequins, or additional jewelry.`
      },
      {
        id: 'paa_byste',
        name: 'På byste',
        requiresModel: false,
        prompt: `Create a high-end 2k resolution luxury jewelry editorial photograph.
The necklace must remain identical in design, chain structure, decorative gold elements, spacing, proportions, craftsmanship details, and warm yellow-gold tone. Do not alter the jewelry design in any way.
Display the necklace naturally draped on a jewelry bust, centered and symmetrical, yet not hanging too low.
The bust should be elegant and minimal, with a matte finish in a soft neutral tone (ivory or light beige), serving purely as a display form.
Background: light beige, smooth and uncluttered, consistent with a luxury jewelry magazine editorial.
Lighting: soft, warm, diffused studio lighting with controlled highlights that enhance fine gold detailing without harsh reflections.
Composition: front-facing, centered, refined and balanced.
Focus: sharp focus across the entire necklace with subtle depth separation from the background.
Mood: regal, timeless, premium craftsmanship, high-end editorial luxury.
Camera style: professional jewelry photography, ultra-realistic materials, no CGI or artificial look.
Remove all non-product elements: no ruler, no tags, no strings, no labels, no text, no logos, no props`
      },
      {
        id: 'modell_1',
        name: 'Modell 1',
        requiresModel: true,
        prompt: `Create a high-end 2k resolution luxury jewelry editorial photograph.
The necklace must remain identical in design. Do not alter the jewelry design in any way.
The necklace should be worn naturally on a model, resting elegantly along the collarbone, centered and balanced, with a refined, magazine-style drape.
Posing: classic jewelry editorial poses are allowed — relaxed shoulders, graceful neck posture, subtle angle variations. The face may be partially cropped; focus remains on the neck, collarbone, and jewelry.
Styling: the dress or top color must be picked randomly between ivory, cream, black, beige, sand, emerald green, deep burgundy, navy blue, chocolate brown, taupe, dusty rose and peach as long as it complements gold jewelry and remains elegant and understated.
Fabric should appear luxurious (silk, satin, velvet, chiffon, or similar), with clean lines and minimal distraction.
Lighting: soft, warm, diffused editorial lighting that enhances gold texture and depth while preserving natural skin tones.
Background: neutral, softly blurred, studio or editorial backdrop suitable for luxury jewelry magazines.
Composition: close-up or mid-close framing focused on the necklace and neckline, refined and balanced.
Focus: sharp focus on the necklace, fine detail clearly visible, shallow depth of field elsewhere.
Mood: regal, timeless, sophisticated, high-end jewelry magazine aesthetic.
Camera style: professional editorial jewelry photography, ultra-realistic materials, no CGI or artificial look.
Do not add text, logos, watermarks, excessive accessories, or distracting elements.`
      },
      {
        id: 'modell_2',
        name: 'Modell 2',
        requiresModel: true,
        prompt: `Create a high-end 2k resolution luxury jewelry editorial photograph.
The necklace must remain identical in design, proportions, spacing, and craftsmanship. Do not alter the jewelry design in any way.
The necklace should be worn naturally on a model, positioned close to the collarbone in a modern, minimal choker-style placement, centered and balanced on the neck area. Clean, bare-skin aesthetic without distracting clothing lines.
Posing: classic contemporary jewelry editorial pose — relaxed shoulders, elongated neck. The model's head and neck must be positioned straight and upright, facing directly forward The face may be partially cropped; focus remains on the neck and jewelry.
Styling: clothing may vary (white, ivory, black, nude, or muted tones), clean and minimal, with a simple neckline that frames the necklace.
Lighting: soft, neutral-to-warm diffused editorial lighting, smooth highlights on gold, natural shadows on skin.
Skin: natural texture, realistic tones, minimal retouching.
Background: neutral, softly blurred studio or interior backdrop suitable for luxury jewelry magazines.
Composition: close-up neckline framing, refined and balanced.
Focus: sharp focus on the necklace, subtle depth of field elsewhere.
Mood: modern, elegant, understated luxury, editorial-ready.
Camera style: professional editorial jewelry photography, ultra-realistic materials, no CGI or artificial look.
Do not add text, logos, watermarks, extra jewelry, or distracting elements.`
      }
    ]
  },
  armbaand: {
    name: 'Armbånd',
    perspectives: [
      {
        id: 'liggende_skraat',
        name: 'Liggende skrått',
        requiresModel: false,
        prompt: `create a 2k high-end luxury jewelry product photograph.
The gold bracelet must look identical to the uploaded reference image. Preserve the exact chain thickness, style, polish level, and warm gold tone.
The bracelet must be shown as a standalone product, laid flat or gently curved, not worn, not attached to skin.
Lighting: soft, even studio lighting with smooth highlights and controlled reflections, emphasizing the polished gold surface without glare.
Background: clean, minimal, warm neutral or soft beige tone, luxury jewelry magazine aesthetic.
Composition: centered, balanced, elegant, minimalistic.
Focus: sharp focus across the entire bracelet and plate, no motion blur.
Mood: timeless, refined, premium craftsmanship.
Camera style: professional studio product photography, ultra-realistic gold reflections, no CGI look.
Do not add hands, skin, additional jewelry, stones, props, logos, text overlays, or background elements.`
      },
      {
        id: 'liggende_topp_ned',
        name: 'Liggende topp-ned',
        requiresModel: false,
        prompt: `Create a high-end luxury jewelry top-down product photograph.
The bracelet in this image must remain identical in design, exact chain thickness, size, spacing, proportions, surface finish, and warm gold tone. Do not alter the jewelry design in any way and the construction of the bracelet.
The bracelet should be arranged flat in a near-perfect circle, viewed directly from above, with balanced spacing.
Image quality requirements:
– 2k resolution output
– Ultra-sharp focus
– Clear and smooth gold reflections
– Crisp edges, no blur, no painterly or CGI look
Lighting: soft, even, diffused studio lighting from above, minimizing harsh shadows while maintaining subtle depth and material definition.
Background: pure white or very light neutral background suitable for luxury e-commerce and jewelry magazine catalogs.
Composition: centered, minimal, refined, with generous negative space around the bracelet.
Focus: sharp focus across the entire bracelet, consistent clarity edge-to-edge.
Mood: clean, elegant, timeless, premium fine jewelry presentation.
Camera style: professional high-end jewelry product photography, accurate color rendering, ultra-realistic materials.
Do not add text, logos, watermarks, hands, wrists, props, or additional jewelry.`
      },
      {
        id: 'modell',
        name: 'Modell',
        requiresModel: true,
        prompt: `Create a high-end 2k resolution luxury jewelry editorial photograph.
The bracelets must appear identical in design and preserve exact thickness, texture, structure, flexibility, polish level, and warm gold tone. Do not alter the jewelry design.
The bracelets should be worn naturally on a wrist, resting loosely and elegantly, with slight overlap and organic spacing as seen in editorial lifestyle photography.
Posing: relaxed wrist and forearm, natural bend, casual yet refined placement.
Lighting: soft, bright, diffused daylight-style lighting with gentle highlights on gold and natural shadows on skin.
Skin: natural texture, realistic tone, visible fine details, minimal retouching.
Styling: light, airy clothing in neutral tones, clean and understated.
Background: bright, minimal, softly blurred, studio or lifestyle interior aesthetic typical of jewelry magazines.
Composition: close-up wrist framing, horizontal orientation, calm and elegant.
Focus: sharp focus on the bracelets, shallow depth of field elsewhere.
Mood: modern, effortless, refined everyday luxury.
Camera style: professional editorial jewelry photography, ultra-realistic materials, no CGI or artificial look.
Do not add text, logos, watermarks, additional jewelry, or distracting elements.`
      }
    ]
  },
  oredobber: {
    name: 'Øredobber',
    perspectives: [
      {
        id: 'staaende_skraat',
        name: 'Stående skrått',
        requiresModel: false,
        prompt: `Create a high-end 2k resolution luxury jewelry product photograph.
The earrings must remain identical in design and preserve the exact thickness, curvature, construction, surface polish, reflectivity, and warm gold tone. Do not alter the jewelry design in any way.
The earrings should be shown as a standalone product, not worn, presented clearly as a matching pair. One earring may be shown front-facing and the other in a slightly rotated or side view to reveal thickness and closure detail, as in professional jewelry catalogs.
Lighting: clean, soft, diffused studio lighting that creates elegant reflections and smooth gradients on the polished gold surface, without harsh highlights or glare.
Background: pure white or very light neutral background suitable for luxury e-commerce and high-end jewelry magazines.
Composition: balanced, minimal, refined, with ample negative space and precise alignment.
Focus: ultra-sharp focus across the entire surface, clearly defining edges, curvature, and reflective quality.
Mood: modern, timeless, understated luxury, premium craftsmanship.
Camera style: professional high-end product photography, ultra-realistic materials, no CGI or artificial look.
Do not add text, logos, watermarks, shadows from props, hands, ears, or additional jewelry.`
      },
      {
        id: 'forfra',
        name: 'Forfra',
        requiresModel: false,
        prompt: `Create a high-end 2k luxury jewelry product photograph.
The earrings must remain identical in design and preserve the exact shape, proportions, curvature, thickness, surface smoothness, reflectivity, smooth construction on the metal and overall form. Do not alter the design in any way.
The earrings should be shown as a standalone product, not worn, presented as a matching pair with balanced spacing and symmetrical alignment.
Lighting: clean, soft, diffused studio lighting that creates elegant reflections and smooth gradients on the polished gold metal surface, without harsh hotspots.
Background: pure white or very light neutral background suitable for luxury e-commerce and editorial catalogs.
Composition: centered, minimal, refined, with both earrings clearly separated and evenly framed.
Focus: ultra-sharp focus across the entire surface, clearly showing contours and reflective quality.
Mood: modern, sculptural, understated luxury, contemporary jewelry magazine aesthetic.
Camera style: professional product photography, ultra-realistic materials, no CGI or artificial look.
Do not add text, logos, watermarks, shadows from props, hands, ears, or additional jewelry.`
      },
      {
        id: 'liggende',
        name: 'Liggende',
        requiresModel: false,
        prompt: `Create a high-end luxury jewelry flat-lay product photograph.
The earrings must remain identical in design and preserve the exact shape, size, proportions, and overall craftsmanship. Do not alter the jewelry design in any way.
The earrings should be lying flat, side by side, slightly angled or symmetrically arranged, as in a refined jewelry catalog flat-lay presentation.
Image quality requirements:
– 2k-resolution output
– Ultra-sharp focus
– Clear surface detail on pearls and gold
– Smooth gradients, no blur, no painterly or CGI look
Lighting: soft, even, diffused studio lighting that creates gentle reflections on the gold without harsh highlights.
Background: clean white or very light neutral background suitable for luxury e-commerce and jewelry magazines.
Composition: minimal, balanced, elegant, with generous negative space.
Focus: sharp focus across both earrings, consistent clarity edge-to-edge.
Mood: timeless, refined, understated luxury.
Camera style: professional jewelry product photography, realistic materials, accurate color rendering.
Do not add text, logos, watermarks, hands, ears, shadows from props, or additional jewelry.`
      },
      {
        id: 'modell_1',
        name: 'Modell 1',
        requiresModel: true,
        prompt: `Create a high-end 2k resolution luxury jewelry editorial photograph.
The earring must remain identical in design and preserve the thickness, spacing, setting style, polish level, and warm gold tone. Do not alter the jewelry design in any way.
The earring should be worn naturally on the ear, positioned exactly in the lobe.
Framing: tight close-up of the ear and jawline only, with the face mostly cropped out. Hair may be tucked behind the ear or softly framing it, but must not obscure the earring.
Lighting: soft, controlled, diffused editorial lighting with subtle highlights on the gold, no harsh reflections.
Skin: natural texture, realistic tone, minimal retouching.
Background: dark or neutral, softly blurred, clean and unobtrusive, typical of luxury jewelry magazine close-ups.
Composition: side profile or slight angle, elegant and minimal, focus clearly on the earring.
Focus: ultra-sharp focus on the earring, shallow depth of field elsewhere.
Mood: refined, modern, understated luxury, editorial-ready.
Camera style: professional close-up jewelry photography, ultra-realistic materials, no CGI or artificial look.
Do not add text, logos, watermarks, extra jewelry, or distracting elements.`
      }
    ]
  },
  anheng: {
    name: 'Anheng',
    perspectives: [
      {
        id: 'hengende',
        name: 'Hengende',
        requiresModel: false,
        prompt: `Create a high-end luxury jewelry product photograph.
The pendant must remain identical in design and Preserve the thickness, style, pendant size, proportions, setting, attachment point, polish level, and warm gold tone.
The pendant must be clearly and naturally attached to a gold chain, hanging freely from the chain's center, aligned and balanced, as a single integrated necklace (not shown separately).
The necklace should be shown as a standalone product, not worn, arranged in a clean V-shape or gentle curve, symmetrical and elegant.
Image quality requirements:
– 2k resolution output
– Ultra-sharp focus
– Clear detail in chain links and pendant edges
– Crisp outlines, no blur, no painterly or CGI look
Lighting: soft, neutral, diffused studio lighting with controlled highlights on the gold and subtle light through the clear pendant.
Background: pure white or very light neutral background suitable for luxury e-commerce and jewelry catalogs.
Composition: centered, minimal, refined, with generous negative space.
Focus: sharp focus across the entire necklace, with the pendant clearly resolved.
Mood: modern, elegant, understated luxury.
Camera style: professional high-end jewelry product photography, realistic materials and color accuracy.
Do not add text, logos, watermarks, hands, mannequins, props, or additional jewelry.`
      },
      {
        id: 'staaende',
        name: 'Stående',
        requiresModel: false,
        prompt: `Create a high-end luxury jewelry product photograph focusing on the pendant alone.
The pendant must remain identical in design and preserve the exact pendant shape, color tone, geometry, style, gold thickness, proportions, and overall craftsmanship. Do not alter the jewelry design in any way.
The pendant should be shown without a chain, presented as a standalone piece, centered and upright.
Image quality requirements:
– 2k resolution output
– Ultra-sharp focus
– Clear visibility of stone facets and gold prongs
– Crisp edges, no blur, no painterly or CGI look
Lighting: soft, controlled, diffused studio lighting that reveals depth in the pendant and creates refined highlights on the gold without harsh reflections.
Background: pure white or very light neutral background suitable for luxury e-commerce and jewelry catalogs.
Composition: centered, minimal, clean, with generous negative space.
Focus: razor-sharp focus on the pendant, macro-level detail.
Mood: refined, elegant, premium fine jewelry presentation.
Camera style: professional high-end jewelry macro photography, ultra-realistic materials and accurate color rendering.
Do not add text, logos, watermarks, chains, hands, props, or additional jewelry.`
      },
      {
        id: 'modell',
        name: 'Modell',
        requiresModel: true,
        prompt: `Create a high-end luxury jewelry product photograph.
The pendant must remain identical in design and preserve the thickness, style, pendant size, proportions, setting, attachment point, polish level, and warm gold tone. The pendant must be clearly and naturally attached to a gold chain, hanging freely from the chain's center, aligned and balanced, as a single integrated necklace (not shown separately).
The necklace should be worn naturally on a model, resting elegantly along the collarbone, centered and balanced, with a refined, magazine-style drape.
Posing: classic jewelry editorial poses are allowed — relaxed shoulders, graceful neck posture, subtle angle variations. The face may be partially cropped; focus remains on the neck, collarbone, and jewelry.
Styling: the dress or top color must be picked randomly between ivory, cream, black, beige, sand, emerald green, deep burgundy, navy blue, chocolate brown, taupe, dusty rose and peach as long as it complements gold jewelry and remains elegant and understated.
Fabric should appear luxurious (silk, satin, velvet, chiffon, or similar), with clean lines and minimal distraction.
Lighting: soft, warm, diffused editorial lighting that enhances gold texture and depth while preserving natural skin tones.
Background: neutral, softly blurred, studio or editorial backdrop suitable for luxury jewelry magazines.
Composition: close-up or mid-close framing focused on the necklace and neckline, refined and balanced.
Focus: sharp focus on the necklace, fine detail clearly visible, shallow depth of field elsewhere.
Mood: regal, timeless, sophisticated, high-end jewelry magazine aesthetic.
Camera style: professional editorial jewelry photography, ultra-realistic materials, no CGI or artificial look.
Do not add text, logos, watermarks, excessive accessories, or distracting elements.
Image quality requirements:
– 2k resolution output
– Ultra-sharp focus
– Clear detail in chain links and pendant edges
– Crisp outlines, no blur, no painterly or CGI look`
      }
    ]
  }
};

// Build the full prompt with visual descriptor and ethnicity
function buildFullPrompt(visualDescriptor, perspectivePrompt, ethnicity, requiresModel) {
  const ethnicityModifier = requiresModel && ethnicity !== 'random'
    ? ETHNICITY_MODIFIERS[ethnicity]
    : '';

  return `Subject Definition: ${visualDescriptor}

${ethnicityModifier ? `Model Requirement: ${ethnicityModifier}\n\n` : ''}Scene & Composition / Technical Specs:
${perspectivePrompt}

Negative Prompts: No CGI, no text, no logos, no watermarks, no artificial or painterly look.`;
}

module.exports = {
  PROMPTS,
  ETHNICITY_MODIFIERS,
  buildFullPrompt
};
