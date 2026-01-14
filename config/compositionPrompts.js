// Composition reference prompts for each category and perspective
// Each perspective includes placement, lighting, styling & mood instructions

const COMPOSITION_PROMPTS = {
  ring: [
    {
      id: 'ring1',
      name: '45° Profile',
      imageFile: 'ring1.png',
      prompt: `Placement: The jewelry is positioned as the central focal point, viewed from a slightly elevated 45-degree profile angle. It is staged on a clean, solid, off-white surface that provides a subtle, soft-edged drop shadow to ground the piece and create a sense of three-dimensional depth.
Lighting: The scene features professional high-key studio lighting, primarily diffused through a large softbox from the upper-left to ensure an even distribution across the metal surfaces. This setup minimizes harsh glare while creating soft, elongated highlights that accentuate the jewelry's curvature and polish. Subtle white reflectors are positioned on the opposite side to provide a gentle fill light, preserving detail in the shadows without losing contrast.
Styling & Mood: The background is a seamless, neutral ivory-white gradient, keeping the focus entirely on the product without distractions. The overall aesthetic is clean, modern, and high-end editorial, suitable for luxury e-commerce catalogs.`
    },
    {
      id: 'ring2',
      name: 'Standing Upright',
      imageFile: 'ring2.png',
      prompt: `Placement: The jewelry is positioned as the central focal point, standing upright on its edge on a clean, solid, off-white surface. It is angled slightly to reveal both the side profile and the top face, and casts a subtle, soft-edged drop shadow directly beneath it to ground the piece.
Lighting: The scene features professional high-key studio lighting, primarily diffused through a large softbox from the upper-left to ensure an even distribution across the metal surfaces. This setup minimizes harsh glare while creating soft, elongated highlights that accentuate the jewelry's curvature and polish, and causes the gem-set areas to sparkle. Subtle white reflectors are positioned to provide a gentle fill light, preserving detail in the shadows without losing contrast.
Styling & Mood: The background is a seamless, neutral ivory-white gradient that fades into a pure white, keeping the focus entirely on the product without distractions. The overall aesthetic is clean, modern, and high-end editorial, suitable for luxury e-commerce catalogs.`
    },
    {
      id: 'ring3',
      name: 'Frontal Top View',
      imageFile: 'ring3.png',
      prompt: `Placement: The jewelry is positioned as the central focal point, viewed from a slightly elevated frontal angle that clearly showcases the top face and the curve of the band. It rests flat on a clean, solid, off-white surface. A subtle, soft-edged drop shadow is cast directly beneath the piece, grounding it and providing a sense of depth without being distracting.
Lighting: The scene features professional high-key studio lighting, creating a bright and clean aesthetic. The primary light source is diffused and positioned above and slightly to the front, generating bright, specular highlights on the polished surface. The interior of the band is illuminated to show depth and details like hallmarks.
Styling & Mood: The background is a seamless, neutral ivory-white gradient that fades into a pure white, ensuring the jewelry is the sole focus. The overall aesthetic is clean, luxurious, and highly detailed, ideal for premium e-commerce product pages where clarity and sparkle are paramount.`
    },
    {
      id: 'ring4',
      name: 'Top-Down Hero',
      imageFile: 'ring4.png',
      prompt: `Placement: The jewelry is arranged as the primary focal point, captured from a direct frontal, symmetrical "top-down" perspective.
Lighting: The scene is bathed in professional high-key studio lighting, utilizing broad diffusion to minimize harsh specular hotspots while emphasizing the natural sheen of the metal. The light source is positioned to create smooth, elegant gradients across all curved surfaces, highlighting the piece's contours and fine craftsmanship. The lighting is balanced to bring out the maximum "brilliance" and "fire" of any reflective surfaces or set materials without washing out fine textures.
Styling & Mood: The background is a seamless, minimalist ivory-to-white gradient, creating an ultra-clean "hero shot" aesthetic typical of luxury e-commerce. The mood is sophisticated, technical, and precise, focusing entirely on the structural details and material quality of the jewelry.`
    }
  ],

  halskjede: [
    {
      id: 'halskjede1',
      name: 'U-Shape Drape',
      imageFile: 'halskjede1.png',
      prompt: `Placement: The jewelry is arranged in a fluid, symmetrical "U-shaped" arc or drape, mimicking the natural hang of a piece worn around a neckline. The object is viewed from a direct top-down (90-degree) perspective, centered horizontally within the frame. The top portions of the piece exit the frame symmetrically at the upper edge, creating a clean, continuous visual flow that suggests an infinite length.
Lighting: The scene is illuminated with professional, highly diffused high-key lighting to ensure uniform brightness across the entire curved arrangement. The lighting setup is specifically designed to accentuate the three-dimensional volume of any repeating or curved components by creating soft, controlled highlights on their uppermost surfaces. All harsh glares are eliminated, leaving only smooth tonal gradients that define the material's texture.
Styling & Mood: The background is a seamless, pure white or light neutral surface, offering a high-contrast environment that emphasizes the physical details of the product. A very subtle, soft-edged drop shadow is present at the base to ground the jewelry, giving it a realistic sense of weight and presence on the surface. The mood is one of refined luxury, technical clarity, and high-end editorial precision.`
    },
    {
      id: 'halskjede2',
      name: 'Flat Lay Statement',
      imageFile: 'halskjede2.png',
      prompt: `Placement: The necklace is arranged flat on the surface in a wide, perfectly symmetrical arch or U-shape, mimicking how a statement piece would lie naturally on the décolletage. The object is captured from a direct, centered overhead perspective (flat lay), ensuring the entire silhouette, from the main body to the clasp mechanism, is clearly defined and balanced horizontally within the frame.
Lighting: The scene utilizes intensely bright, even, high-key studio illumination designed to maximize brilliance. The light is highly diffused to create smooth, polished reflections across metallic surfaces, while simultaneously generating sharp, intense specular highlights (sparkle) on any faceted gems or textured elements. The lighting is uniform across the entire breadth of the piece, ensuring every detail is equally lit without harsh shadows.
Styling & Mood: The background is a sterile, seamless pure white, providing maximum contrast to isolate the intricate details of the product. A barely perceptible, ultra-soft drop shadow directly beneath the object grounds it physically to the surface without distraction. The overall aesthetic is luxurious, expensive, and hyper-detailed, typical of high-end commercial jewelry photography.`
    },
    {
      id: 'halskjede3',
      name: 'Display Bust',
      imageFile: 'halskjede3.png',
      prompt: `Placement: The jewelry item is staged on a professional, minimalist white display bust or mannequin stand, captured from a direct frontal perspective. The piece is centered horizontally, draped naturally along the contours of the stand to accurately represent its physical hang and structural flow.
Lighting: The scene features soft, diffused studio lighting that provides uniform coverage across the entire piece. The lighting is balanced to create gentle, controlled highlights that emphasize the object's three-dimensional form and surface textures while avoiding harsh hotspots or deep, obscuring shadows. A warm color temperature is utilized to enhance the richness of the materials.
Styling & Mood: The background is a seamless, solid neutral-toned surface (such as beige or tan), providing a clean and elegant backdrop that isolates the subject. The contrast between the jewelry, the white display bust, and the warm background creates a sophisticated, high-end editorial aesthetic. The mood is refined, professional, and luxurious, typical of premium jewelry brand catalogs.`
    }
  ],

  armbaand: [
    {
      id: 'armbaand1',
      name: 'Oval Loop 3/4',
      imageFile: 'armbaand1.png',
      prompt: `Placement: The jewelry item is arranged in a relaxed, horizontal oval or circular loop, resting flat on a solid surface. It is captured from a slightly elevated three-quarter perspective, providing a sense of depth and scale. A primary focal component or charm is positioned at the bottom-center of the arrangement, oriented directly toward the viewer. A subtle fastening mechanism is visible at the rear of the loop.
Lighting: The scene utilizes professional high-key studio lighting with a large primary diffuser to create an even, soft glow across all metallic surfaces. The lighting is balanced to produce gentle specular highlights that define the polished finish and physical contours of the piece. Shadowing is kept soft and minimal, with a light drop shadow grounding the object to the surface without distracting from the fine details.
Styling & Mood: The background is a seamless, minimalist pure white, ensuring the product is isolated as the sole focus of the image. The overall aesthetic is clean, elegant, and sophisticated, mirroring the hyper-detailed "hero shots" found in luxury brand catalogs. The mood is professional and precise, emphasizing material quality and craftsmanship.`
    },
    {
      id: 'armbaand2',
      name: 'Top-Down Circle',
      imageFile: 'armbaand2.png',
      prompt: `Placement: The jewelry item is arranged in a broad, nearly perfect circular loop or ring shape, resting flat on a solid surface. It is captured from a direct top-down (90-degree) perspective, ensuring the entire circumference and structural detail of the piece is perfectly centered and visible. A primary decorative component or focal point is positioned at the bottom-most arc of the circle, oriented toward the viewer.
Lighting: The scene features professional high-key studio lighting that provides uniform, intense brightness across the entire arrangement. The light is highly diffused to eliminate harsh specular hotspots while creating smooth, elegant highlights that accentuate the polished finish and physical contours of the material. Shadowing is extremely minimal and soft, with a faint drop shadow grounding the object to the surface for a realistic sense of presence.
Styling & Mood: The background is a seamless, minimalist pure white, ensuring the product is isolated as the absolute focus. The overall aesthetic is one of extreme clarity, luxury, and modern minimalism. The mood is clinical yet premium, typical of high-resolution "hero shots" found in elite e-commerce jewelry catalogs.`
    },
    {
      id: 'armbaand3',
      name: 'Open Loop Horizontal',
      imageFile: 'armbaand3.png',
      prompt: `Placement: The jewelry item is arranged in a wide, horizontal open-loop configuration, resting naturally on a flat, solid surface. It is captured from a slightly elevated three-quarter perspective, showcasing both the breadth of the arrangement and the fine structural details along its length. One end of the piece remains unfastened, revealing the clasp mechanism positioned toward the bottom-center of the frame to show detail and scale.
Lighting: The scene utilizes professional high-key studio lighting with a large primary diffuser to create an even, soft glow across all metallic and reflective surfaces. This setup is specifically designed to accentuate the piece's contours with smooth, elongated highlights and subtle tonal gradients. Diffused reflections ensure that any set materials or polished finishes are illuminated with clarity and brilliance without harsh hotspots or deep, obscuring shadows.
Styling & Mood: The background is a seamless, minimalist pure white, creating a high-end "hero shot" aesthetic that eliminates all distractions. A soft, elongated drop shadow is cast to the side, grounding the piece and providing a realistic sense of weight and physical presence on the surface. The overall mood is sophisticated, luxurious, and technically precise, typical of premium editorial brand catalogs.`
    },
    {
      id: 'armbaand4',
      name: 'Oblong Loop Elevated',
      imageFile: 'armbaand4.png',
      prompt: `Placement: The jewelry is arranged in a narrow, horizontal oblong loop, resting flat on a solid surface. It is captured from an elevated three-quarter perspective, showcasing the full length and physical thickness of the piece from a dynamic angle. The fastening mechanism is centered at the top of the arrangement, providing a clear view of structural details while maintaining a balanced horizontal composition.
Lighting: The scene utilizes professional high-key studio lighting with broad diffusion to ensure even illumination across the entire arrangement. The light source is positioned to create sharp, elegant highlights on the uppermost edges of the material, defining its texture and polished finish. Tonal gradients are smooth and controlled, ensuring the three-dimensional form of each component is clearly visible without deep or obscuring shadows.
Styling & Mood: The background is a seamless, minimalist pure white, creating a high-contrast environment that isolates the product as the sole focus. A soft, elongated drop shadow is cast immediately beneath the loop, grounding the object and providing a realistic sense of weight and presence on the surface. The overall aesthetic is sophisticated, technical, and premium, typical of high-end luxury e-commerce catalogs.`
    },
    {
      id: 'armbaand5',
      name: 'Bangle Profile',
      imageFile: 'armbaand5.png',
      prompt: `Placement: The jewelry item is positioned as a rigid, circular or oval structure, captured from an elevated three-quarter profile angle. This perspective is designed to showcase the external surface curvature while simultaneously revealing the internal depth and structural details of the piece. The object is tilted slightly toward the viewer to create a sense of three-dimensional volume and scale.
Lighting: The scene features bright, high-key studio lighting characterized by strong overhead diffusion. This setup generates a long, clean specular highlight along the upper polished edge of the material, emphasizing a high-gloss finish. The lighting is balanced to illuminate the interior of the piece with soft, even light, ensuring that any internal textures or patterns are clearly visible without deep, obscuring shadows.
Styling & Mood: The background is a seamless, minimalist pure white, providing a high-contrast environment that focuses entirely on the product's form. A subtle, soft-edged drop shadow is cast at the bottom-left base of the piece, grounding it to the surface and providing a realistic sense of physical weight. The overall mood is luxurious, sophisticated, and technically precise, typical of flagship "hero shots" in premium jewelry catalogs.`
    },
    {
      id: 'armbaand6',
      name: 'Bangle Interior View',
      imageFile: 'armbaand6.png',
      prompt: `Placement: The jewelry item is positioned as a rigid, circular or oval structure, resting flat on a solid surface. It is captured from a slightly elevated three-quarter perspective, allowing for a clear view of the exterior surface while simultaneously revealing the interior depth and structural detailing of the piece. The object is centered horizontally to create a balanced, symmetrical composition.
Lighting: The scene features professional high-key studio lighting characterized by multi-source diffusion. This setup generates clean, elongated specular highlights along the upper polished edges, emphasizing the material's high-gloss finish and physical contours. The lighting is balanced to illuminate the interior of the piece with soft, even light, ensuring any internal patterns or textures are visible without deep, obscuring shadows.
Styling & Mood: The background is a seamless, minimalist pure white, providing a high-contrast environment that focuses entirely on the product's form. A subtle, soft-edged drop shadow is cast directly beneath the piece, grounding it to the surface and providing a realistic sense of physical weight and presence. The overall aesthetic is luxurious, professional, and technically precise, typical of high-end e-commerce "hero shots".`
    },
    {
      id: 'armbaand7',
      name: 'Bangle Top-Down',
      imageFile: 'armbaand7.png',
      prompt: `Placement: The jewelry item is arranged in a perfect, rigid circular or oval loop, resting flat on a solid surface. It is captured from a direct top-down (90-degree) overhead perspective, ensuring absolute horizontal and vertical symmetry. The piece is centered within the frame to emphasize its geometric form and structural balance.
Lighting: The scene is lit with professional high-key studio lighting, featuring strong overhead diffusion. This setup creates clean, sharp specular highlights along the uppermost edges of the material, defining its polished finish and physical contours. The lighting is uniform, ensuring that the entire circumference is clearly illuminated with smooth tonal gradients and no deep, obscuring shadows.
Styling & Mood: The background is a seamless, minimalist pure white, providing a high-contrast environment that isolates the product as the sole focus. A very subtle, soft-edged drop shadow is visible directly beneath the object, grounding it to the surface for a realistic sense of weight and physical presence. The overall mood is clinical, sophisticated, and technically precise, ideal for high-resolution e-commerce catalog "hero shots."`
    }
  ],

  oredobber: [
    {
      id: 'oredobber1',
      name: 'Dual Staggered',
      imageFile: 'oredobber1.png',
      prompt: `Placement: The jewelry is staged as a coordinated pair in a staggered, dual-perspective composition. One component is positioned vertically in the background, oriented to provide a direct frontal view of its primary decorative surface. The second component is placed in the foreground at a tilted, three-quarter angle, specifically oriented to reveal the side profile, internal depth, and any mechanical or fastening details.
Lighting: The scene utilizes professional high-key studio lighting with multi-directional diffusion. The setup is designed to create sharp, brilliant specular highlights on the uppermost polished edges of both pieces, emphasizing material quality and fine detail. The light is balanced to ensure the interior of the foreground piece is clearly illuminated, revealing structural features without deep, obscuring shadows.
Styling & Mood: The background is a seamless, minimalist pure white or ultra-light neutral gradient, ensuring the product pair is the absolute focus. Soft, subtle drop shadows are cast beneath each piece to ground them to the surface, providing a realistic sense of weight and three-dimensional presence. The overall mood is sophisticated, technical, and luxurious, typical of premium "hero shots" in high-end jewelry e-commerce catalogs.`
    },
    {
      id: 'oredobber2',
      name: 'Side-by-Side Profile',
      imageFile: 'oredobber2.png',
      prompt: `Placement: The jewelry is staged as a coordinated pair in a balanced, side-by-side composition. The left component is positioned to provide a clean, direct profile view, while the right component is rotated to a three-quarter angle, specifically oriented to reveal the internal depth, thickness, and fastening mechanism.
Lighting: The scene features professional high-key studio lighting optimized for highly reflective surfaces. The setup generates strong, elongated specular highlights that flow vertically along the contours of the material, defining its smooth volume and polished finish. The illumination is bright and uniform, ensuring that both the external surfaces and the interior structural details are clearly visible without deep or distracting shadows.
Styling & Mood: The background is a seamless, minimalist pure white, providing a sterile yet premium environment that focuses entirely on the product. Subtle, soft-edged grounding shadows are cast directly beneath each piece, providing a realistic sense of weight and three-dimensional presence on the surface. The overall aesthetic is luxurious, modern, and technically precise, typical of flagship "hero shots" in high-end jewelry catalogs.`
    },
    {
      id: 'oredobber3',
      name: 'Top-Down Diagonal',
      imageFile: 'oredobber3.png',
      prompt: `Placement: The jewelry is staged as a coordinated pair in a dynamic, staggered diagonal composition. The objects are captured from an elevated top-down perspective, with one piece positioned in the upper right and the other in the lower left of the frame. Both components are oriented at a slight angle to the camera to showcase their three-dimensional volume and structural details, such as attachment loops or facets.
Lighting: The scene features soft, high-key studio lighting with wrap-around diffusion. The setup is calibrated to produce gentle, soft-edged highlights that accentuate the organic or geometric curves of the material without creating harsh glares or deep shadows. The illumination is even and bright, ensuring the natural color and texture of the material are rendered with absolute clarity.
Styling & Mood: The background is a seamless, minimalist pure white, providing a high-contrast environment that isolates the objects as the sole focus. No visible grounding shadows are present, giving the pieces a light, airy, and "floating" appearance. The overall aesthetic is clean, elegant, and clinical, typical of high-resolution product photography for luxury e-commerce catalogs.`
    },
    {
      id: 'oredobber4',
      name: 'Asymmetric Staggered',
      imageFile: 'oredobber4.png',
      prompt: `Placement: The jewelry is staged as a coordinated pair in a staggered, asymmetrical composition. The components are captured from an elevated three-quarter perspective, angled toward the center to create a sense of depth and interaction. One piece is positioned slightly forward to showcase the internal curvature and fastening mechanism, while the second piece is placed behind and slightly to the side to emphasize the external face and structural flow.
Lighting: The scene features bright, professional high-key studio lighting with multiple points of diffusion. The setup is designed to generate sharp, brilliant specular highlights along the polished edges and uppermost surfaces, emphasizing material quality and fine craftsmanship. The lighting is balanced to ensure that even the internal recessed areas are clearly illuminated with soft tonal gradients, avoiding deep or obscuring shadows.
Styling & Mood: The background is a seamless, minimalist white-to-light-grey gradient, ensuring the product pair remains the absolute focal point. Subtle, soft-edged grounding shadows are cast diagonally from each piece, providing a realistic sense of weight and three-dimensional presence on the surface. The overall aesthetic is clean, luxurious, and technically precise, typical of flagship "hero shots" in premium jewelry e-commerce catalogs.`
    },
    {
      id: 'oredobber5',
      name: 'Symmetrical Mirror',
      imageFile: 'oredobber5.png',
      prompt: `Placement: The jewelry is staged as a coordinated, identical pair in a perfectly symmetrical side-by-side composition. Both components are captured from a direct frontal perspective and are aligned horizontally and vertically to create a mirror-image effect. This arrangement is designed to showcase the scale, silhouette, and repeating design elements of the set with absolute technical precision.
Lighting: The scene features soft, professional high-key studio lighting with uniform diffusion from both sides. The setup is calibrated to produce gentle, elongated highlights that follow the three-dimensional curvature of the material, emphasizing volume and surface smoothness. Lighting is perfectly balanced between the two pieces to ensure consistent color rendering and detail visibility across the entire pair.
Styling & Mood: The background is a seamless, minimalist pure white, providing a high-contrast environment that eliminates all distractions. Subtle, soft-edged grounding shadows are cast directly beneath each piece, giving them a realistic sense of weight while maintaining a clean, "floating" aesthetic. The mood is clinical, sophisticated, and premium, typical of high-resolution "hero shots" in luxury brand catalogs.`
    }
  ],

  anheng: [
    {
      id: 'anheng1',
      name: 'V-Shape Chain Drape',
      imageFile: 'anheng1.png',
      prompt: `Placement: The jewelry is arranged in a perfectly symmetrical "V-shape" drape, captured from a direct frontal perspective. The gold chain enters the frame from the upper corners and converges at a central focal point at the bottom-center of the frame. The primary pendant or focal component is suspended vertically, ensuring its face is oriented directly toward the viewer to showcase structural details and material quality.
Lighting: The scene features professional high-key studio lighting with even, multi-directional diffusion. The setup is designed to create sharp, clean highlights along the edges of the metallic components while providing bright, uniform illumination for any central focal elements. If translucent materials are present, the lighting is balanced to reveal internal clarity and facet structure without creating harsh surface glares.
Styling & Mood: The background is a seamless, minimalist pure white, providing a high-contrast environment that isolates the piece as the sole focus. A very subtle, soft-edged drop shadow is visible directly beneath the pendant and chain, grounding the object to the surface for a realistic sense of weight. The overall aesthetic is clinical, luxurious, and technically precise, typical of high-end e-commerce "hero shots".`
    },
    {
      id: 'anheng2',
      name: 'Pendant Only Frontal',
      imageFile: 'anheng2.png',
      prompt: `Placement: The jewelry item is captured from a direct frontal perspective, perfectly centered and oriented vertically within the frame. This arrangement is designed to showcase the primary decorative face of the object, emphasizing its silhouette and structural symmetry.
Lighting: The scene features professional high-key studio lighting with broad, multi-directional diffusion. The setup is calibrated to produce soft, elegant highlights that follow the object's contours, accentuating its three-dimensional volume and polished surface textures. The illumination is bright and even, ensuring that any internal details or set materials are rendered with absolute clarity and brilliance without harsh hotspots or deep, obscuring shadows.
Styling & Mood: The background is a seamless, minimalist pure white, providing a high-contrast environment that isolates the product as the absolute focus. An extremely subtle, soft-edged grounding shadow is present at the very base of the piece, providing a realistic sense of weight and physical presence on the surface. The overall mood is clinical, sophisticated, and premium, typical of high-resolution "hero shots" in flagship luxury e-commerce catalogs.`
    },
    {
      id: 'anheng3',
      name: 'Side Profile',
      imageFile: 'anheng3.png',
      prompt: `Placement: The jewelry item is arranged vertically and captured from a strict, direct side-profile perspective. The suspension element (such as a chain or cord) enters the frame from the top-center and descends to the primary focal piece positioned at the bottom-center. This orientation is specifically designed to showcase the object's depth, structural layers, and the side-on craftsmanship of its setting.
Lighting: The scene features professional high-key studio lighting with broad-spectrum diffusion. Bright specular highlights are concentrated on the outermost polished edges of the material to define its silhouette and volume against the background. The lighting is balanced to ensure that even recessed or internal details are visible through soft tonal gradients, avoiding harsh glares or obscuring shadows.
Styling & Mood: The background is a seamless, minimalist pure white, providing a high-contrast environment that isolates the piece as the absolute focus. A very subtle, soft-edged drop shadow is cast directly beneath the base of the focal piece, grounding it to the surface for a realistic sense of weight. The overall mood is clinical, sophisticated, and technically precise, typical of the technical specification pages in premium luxury catalogs.`
    },
    {
      id: 'anheng4',
      name: 'Diagonal Dynamic',
      imageFile: 'anheng4.png',
      prompt: `Placement: The jewelry is arranged in a dynamic, asymmetrical diagonal drape. The suspension element (such as a chain or cord) enters the frame from the upper-left corner and descends toward the bottom-center. The primary focal component or pendant is positioned at an elevated three-quarter angle, specifically oriented to reveal both its decorative face and its structural depth or profile.
Lighting: The scene features professional high-key studio lighting with soft, multi-directional diffusion. The setup is designed to create sharp, elongated specular highlights along the polished edges of the chain and the attachment bale, emphasizing material quality. The illumination is bright and uniform, ensuring that the three-dimensional volume and surface texture of the focal piece are rendered with absolute clarity.
Styling & Mood: The background is a seamless, minimalist pure white, providing a sterile yet premium environment that isolates the subject. A subtle, soft-edged drop shadow is cast toward the bottom-right, grounding the piece and providing a realistic sense of weight and physical presence on the surface. The overall mood is sophisticated, technical, and luxurious, typical of editorial "action" shots in high-end jewelry catalogs.`
    }
  ]
};

// Get perspectives for a category
function getPerspectivesForCategory(category) {
  return COMPOSITION_PROMPTS[category] || [];
}

// Get single perspective by ID
function getPerspectiveById(category, perspectiveId) {
  const perspectives = COMPOSITION_PROMPTS[category] || [];
  return perspectives.find(p => p.id === perspectiveId);
}

module.exports = {
  COMPOSITION_PROMPTS,
  getPerspectivesForCategory,
  getPerspectiveById
};
