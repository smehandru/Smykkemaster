// Composition reference prompts for each category and perspective
// Each perspective includes placement, lighting, styling & mood instructions

const COMPOSITION_PROMPTS = {
  ring: [
    {
      id: 'ring1',
      name: '45° Profile',
      imageFile: 'ring1.png',
      prompt: `Placement: The jewelry is positioned as the central focal point, viewed from a slightly elevated 45-degree profile angle. It is staged on a clean, solid, off-white surface that provides a subtle, soft-edged drop shadow to ground the piece and create a sense of three-dimensional depth.
Styling & Mood: The background is a pure, seamless solid white (#FFFFFF). There is zero texture, pattern, or noise. It is a clean digital-style backdrop designed for catalog clarity.`
    },
    {
      id: 'ring2',
      name: 'Standing Upright',
      imageFile: 'ring2.png',
      prompt: `Placement: The jewelry is positioned as the central focal point, standing upright on its edge on a clean, solid, off-white surface. It is angled slightly to reveal both the side profile and the top face, and casts a subtle, soft-edged drop shadow directly beneath it to ground the piece.
Styling & Mood: The surface is a warm, polished beige marble, earthy color variations. The background is a smooth, blurry continuation of this stone texture, creating a seamless horizon line that fades into a soft creamy beige gradient. Lighting is soft, warm, and directional, mimicking natural window light coming from the side. This creates gentle, elongated shadows that firmly ground the jewelry to the stone. The atmosphere is calm, organic, and sophisticated—like a high-end lifestyle editorial.`
    },
    {
      id: 'ring3',
      name: 'Frontal Top View',
      imageFile: 'ring3.png',
      prompt: `Placement: The jewelry is positioned as the central focal point, viewed from a slightly elevated frontal angle that clearly showcases the top face and the curve of the band. The background is pure #FFFFFF white. It rests flat on a clean, solid, white surface. A subtle, soft-edged drop shadow is cast directly beneath the piece, grounding it and providing a sense of depth without being distracting.
Styling & Mood: The surface is a high-end polished beige marble with subtle, warm-toned natural veining. The texture is smooth and glossy, providing a luxurious and clean minimalist background.`
    },
    {
      id: 'ring4',
      name: 'Top-Down Hero',
      imageFile: 'ring4.png',
      prompt: `Placement: The jewelry is arranged as the primary focal point, captured from a direct frontal, symmetrical "top-down" perspective.
Styling & Mood: The surface is a warm, polished beige marble, earthy color variations. The background is a smooth, blurry continuation of this stone texture, creating a seamless horizon line that fades into a soft creamy beige gradient. Lighting is soft, warm, and directional, mimicking natural window light coming from the side. This creates gentle, elongated shadows that firmly ground the jewelry to the stone. The atmosphere is calm, organic, and sophisticated—like a high-end lifestyle editorial.`
    }
  ],

  halskjede: [
    {
      id: 'halskjede1',
      name: 'U-Shape Drape',
      imageFile: 'halskjede1.png',
      prompt: `Placement: The jewelry is arranged in a fluid, symmetrical "U-shaped" arc or drape, mimicking the natural hang of a piece worn around a neckline. The object is viewed hanging, centered horizontally within the frame. The top portions of the piece exit the frame symmetrically at the upper edge, creating a clean, continuous visual flow that suggests an infinite length.
Styling & Mood: The background is pure #FFFFFF white. A very subtle, soft-edged drop shadow is present at the base to ground the jewelry, giving it a realistic sense of weight and presence on the surface. The mood is one of refined luxury, technical clarity, and high-end editorial precision.`
    },
    {
      id: 'halskjede2',
      name: 'Flat Lay Statement',
      imageFile: 'halskjede2.png',
      prompt: `Placement: The necklace is arranged flat on the surface in a wide, perfectly symmetrical arch or U-shape, mimicking how a statement piece would lie naturally on the décolletage. The object is captured from a direct, centered overhead perspective (flat lay), ensuring the entire silhouette, the jewelry is clearly defined and balanced horizontally within the frame.
Styling & Mood: The surface is a high-end polished beige marble with subtle, warm-toned natural veining. The texture is smooth and glossy, providing a luxurious and clean minimalist background.`
    },
    {
      id: 'halskjede3',
      name: 'Display Bust',
      imageFile: 'halskjede3.jpg',
      prompt: `Placement: The jewelry piece is displayed on a professional white mannequin bust. The bust is grounded firmly on a solid floor surface, not floating.
Styling & Mood: The environment features polished light beige marble. Both the floor and background share this texture. The bust is smooth matte white.`
    }
  ],

  armbaand: [
    {
      id: 'armbaand1',
      name: 'Oval Loop 3/4',
      imageFile: 'armbaand1.png',
      prompt: `Placement: The jewelry item is arranged in a relaxed, horizontal oval or circular loop, resting flat on a solid surface. It is captured from a slightly elevated three-quarter perspective, providing a sense of depth and scale. A primary focal component or charm is positioned at the bottom-center of the arrangement, oriented directly toward the viewer. A subtle fastening mechanism is visible at the rear of the loop.
Styling & Mood: The background is pure #FFFFFF white, seamless, ensuring the product is isolated as the sole focus of the image. The overall aesthetic is clean, elegant, and sophisticated, mirroring the hyper-detailed "hero shots" found in luxury brand catalogs. The mood is professional and precise, emphasizing material quality and craftsmanship.`
    },
    {
      id: 'armbaand2',
      name: 'Top-Down Circle',
      imageFile: 'armbaand2.png',
      prompt: `Placement: The jewelry item is arranged in a broad, nearly perfect circular loop or ring shape, resting flat on a solid surface. It is captured from a direct top-down (90-degree) perspective, ensuring the entire circumference and structural detail of the piece is perfectly centered and visible. A primary decorative component or focal point is positioned at the bottom-most arc of the circle, oriented toward the viewer.
Styling & Mood: The surface is a warm, polished beige marble, earthy color variations. The background is a smooth, blurry continuation of this stone texture, creating a seamless horizon line that fades into a soft creamy beige gradient. Lighting is soft, warm, and directional, mimicking natural window light coming from the side. This creates gentle, elongated shadows that firmly ground the jewelry to the stone. The atmosphere is calm, organic, and sophisticated—like a high-end lifestyle editorial.`
    },
    {
      id: 'armbaand3',
      name: 'Open Loop Horizontal',
      imageFile: 'armbaand3.png',
      prompt: `Placement: The jewelry item is arranged in a wide, horizontal open-loop configuration, resting naturally on a flat, solid surface. It is captured from a slightly elevated three-quarter perspective, showcasing both the breadth of the arrangement and the fine structural details along its length. One end of the piece remains unfastened, revealing the clasp mechanism positioned toward the bottom-center of the frame to show detail and scale.
Styling & Mood: The surface is a warm, polished beige marble, earthy color variations. The background is a smooth, blurry continuation of this stone texture, creating a seamless horizon line that fades into a soft creamy beige gradient. Lighting is soft, warm, and directional, mimicking natural window light coming from the side. This creates gentle, elongated shadows that firmly ground the jewelry to the stone. The atmosphere is calm, organic, and sophisticated—like a high-end lifestyle editorial.`
    },
    {
      id: 'armbaand4',
      name: 'Oblong Loop Elevated',
      imageFile: 'armbaand4.png',
      prompt: `Placement: The jewelry is arranged in a narrow, horizontal oblong loop, resting flat on a solid surface. It is captured from an elevated three-quarter perspective, showcasing the full length and physical thickness of the piece from a dynamic angle. The fastening mechanism is centered at the top of the arrangement, providing a clear view of structural details while maintaining a balanced horizontal composition.
Styling & Mood: The surface is a high-end polished beige marble with subtle, warm-toned natural veining. The texture is smooth and glossy, providing a luxurious and clean minimalist background.`
    }
  ],

  'armbaand-stiv': [
    {
      id: 'armbaand5',
      name: 'Bangle Profile',
      imageFile: 'armbaand5.png',
      prompt: `Placement: The jewelry item is positioned as a rigid, circular or oval structure, captured from an elevated three-quarter profile angle. This perspective is designed to showcase the external surface curvature while simultaneously revealing the internal depth and structural details of the piece. The object is tilted slightly toward the viewer to create a sense of three-dimensional volume and scale.
Styling & Mood: The background pure #FFFFFF white, seamless, providing a high-contrast environment that focuses entirely on the product's form. A subtle, soft-edged drop shadow is cast at the bottom-left base of the piece, grounding it to the surface and providing a realistic sense of physical weight. The overall mood is luxurious, sophisticated, and technically precise, typical of flagship "hero shots" in premium jewelry catalogs.`
    },
    {
      id: 'armbaand6',
      name: 'Bangle Interior View',
      imageFile: 'armbaand6.png',
      prompt: `Placement: The jewelry item is positioned as a rigid, circular or oval structure, resting flat on a solid surface. It is captured from a slightly elevated three-quarter perspective, allowing for a clear view of the exterior surface while simultaneously revealing the interior depth and structural detailing of the piece. The object is centered horizontally to create a balanced, symmetrical composition.
Styling & Mood: The surface is a warm, polished beige marble, earthy color variations. The background is a smooth, blurry continuation of this stone texture, creating a seamless horizon line that fades into a soft creamy beige gradient. Lighting is soft, warm, and directional, mimicking natural window light coming from the side. This creates gentle, elongated shadows that firmly ground the jewelry to the stone. The atmosphere is calm, organic, and sophisticated—like a high-end lifestyle editorial.`
    },
    {
      id: 'armbaand7',
      name: 'Bangle Top-Down',
      imageFile: 'armbaand7.png',
      prompt: `Placement: The jewelry item is arranged in a perfect, rigid circular or oval loop, resting flat on a solid surface. It is captured from a direct top-down (90-degree) overhead perspective, ensuring absolute horizontal and vertical symmetry. The piece is centered within the frame to emphasize its geometric form and structural balance.
Styling & Mood: The surface is a warm, polished beige marble, earthy color variations. The background is a smooth, blurry continuation of this stone texture, creating a seamless horizon line that fades into a soft creamy beige gradient. Lighting is soft, warm, and directional, mimicking natural window light coming from the side. This creates gentle, elongated shadows that firmly ground the jewelry to the stone. The atmosphere is calm, organic, and sophisticated—like a high-end lifestyle editorial.`
    }
  ],

  oredobber: [
    {
      id: 'oredobber1',
      name: 'Dual Staggered',
      imageFile: 'oredobber1.png',
      prompt: `Placement: The jewelry is staged as a coordinated pair in a staggered, dual-perspective composition. One component is positioned vertically in the background, oriented to provide a direct frontal view of its primary decorative surface. The second component is placed in the foreground at a tilted, three-quarter angle, specifically oriented to reveal the side profile, internal depth, and any mechanical or fastening details.
Lighting: The scene utilizes professional high-key studio lighting with multi-directional diffusion. The setup is designed to create sharp, brilliant specular highlights on the uppermost polished edges of both pieces, emphasizing material quality and fine detail. The light is balanced to ensure the interior of the foreground piece is clearly illuminated, revealing structural features without deep, obscuring shadows.
Styling & Mood: The background is pure #FFFFFF white, ensuring the product pair is the absolute focus. Soft, subtle drop shadows are cast beneath each piece to ground them to the surface, providing a realistic sense of weight and three-dimensional presence. The overall mood is sophisticated, technical, and luxurious, typical of premium "hero shots" in high-end jewelry e-commerce catalogs.`
    },
    {
      id: 'oredobber2',
      name: 'Side-by-Side Profile',
      imageFile: 'oredobber2.png',
      prompt: `Placement: The jewelry is staged as a coordinated pair in a balanced, side-by-side composition. The left component is positioned to provide a clean, direct profile view, while the right component is rotated to a three-quarter angle, specifically oriented to reveal the internal depth, thickness, and fastening mechanism.
Styling & Mood: The surface is a high-end polished beige marble with subtle, warm-toned natural veining. The texture is smooth and glossy, providing a luxurious and clean minimalist background.`
    },
    {
      id: 'oredobber3',
      name: 'Top-Down Diagonal',
      imageFile: 'oredobber3.png',
      prompt: `Placement: The jewelry is staged a single earring in a dynamic, staggered diagonal composition. The object is captured from an elevated top-down perspective, with one piece positioned in the upper right of the frame. It is oriented at a slight angle to the camera to showcase three-dimensional volume and structural details, such as attachment loops or facets.
Styling & Mood: The surface is a warm, polished beige marble, earthy color variations. The background is a smooth, blurry continuation of this stone texture, creating a seamless horizon line that fades into a soft creamy beige gradient. Lighting is soft, warm, and directional, mimicking natural window light coming from the side. This creates gentle, elongated shadows that firmly ground the jewelry to the stone. The atmosphere is calm, organic, and sophisticated—like a high-end lifestyle editorial.`
    },
    {
      id: 'oredobber4',
      name: 'Asymmetric Staggered',
      imageFile: 'oredobber4.png',
      prompt: `Placement: The jewelry is staged as a coordinated pair in a staggered, asymmetrical composition. The components are captured from an elevated three-quarter perspective, angled toward the center to create a sense of depth and interaction. One piece is positioned slightly forward to showcase the internal curvature and fastening mechanism, while the second piece is placed behind and slightly to the side to emphasize the external face and structural flow.
Styling & Mood: The surface is a warm, polished beige marble, earthy color variations. The background is a smooth, blurry continuation of this stone texture, creating a seamless horizon line that fades into a soft creamy beige gradient. Lighting is soft, warm, and directional, mimicking natural window light coming from the side. This creates gentle, elongated shadows that firmly ground the jewelry to the stone. The atmosphere is calm, organic, and sophisticated—like a high-end lifestyle editorial.`
    },
    {
      id: 'oredobber5',
      name: 'Symmetrical Mirror',
      imageFile: 'oredobber5.png',
      prompt: `Placement: The jewelry is staged as a coordinated, identical pair in a perfectly symmetrical side-by-side composition. Both components are captured from a direct frontal perspective and are aligned horizontally and vertically to create a mirror-image effect. This arrangement is designed to showcase the scale, silhouette, and repeating design elements of the set with absolute technical precision.
Styling & Mood: The surface is a high-end polished beige marble with subtle, warm-toned natural veining. The texture is smooth and glossy, providing a luxurious and clean minimalist background.`
    }
  ],

  anheng: [
    {
      id: 'anheng1',
      name: 'V-Shape Chain Drape',
      imageFile: 'anheng1.png',
      prompt: `Placement: The jewelry is arranged hanging from a gold chain in a perfectly symmetrical "V-shape" drape, captured from a direct frontal perspective. The gold chain enters the frame from the upper corners and converges at a central focal point at the bottom-center of the frame. The primary pendant or focal component is suspended vertically, ensuring its face is oriented directly toward the viewer to showcase structural details and material quality.
Styling & Mood: The background is pure #FFFFFF white, seamless, providing a high-contrast environment that isolates the piece as the sole focus. A very subtle, soft-edged drop shadow is visible directly beneath the pendant and chain, grounding the object to the surface for a realistic sense of weight. The overall aesthetic is clinical, luxurious, and technically precise, typical of high-end e-commerce "hero shots".`
    },
    {
      id: 'anheng2',
      name: 'Pendant Only Frontal',
      imageFile: 'anheng2.png',
      prompt: `Placement: The jewelry item is captured from a direct frontal perspective, perfectly centered and oriented vertically within the frame. This arrangement is designed to showcase the primary decorative face of the object, emphasizing its silhouette and structural symmetry.
Styling & Mood: The surface is a warm, polished beige marble, earthy color variations. The background is a smooth, blurry continuation of this stone texture, creating a seamless horizon line that fades into a soft creamy beige gradient. Lighting is soft, warm, and directional, mimicking natural window light coming from the side. This creates gentle, elongated shadows that firmly ground the jewelry to the stone. The atmosphere is calm, organic, and sophisticated—like a high-end lifestyle editorial.`
    },
    {
      id: 'anheng3',
      name: 'Side Profile',
      imageFile: 'anheng3.png',
      prompt: `Placement: The jewelry item is arranged vertically and captured from a strict, direct side-profile perspective. The suspension element (such as a chain or cord) enters the frame from the top-center and descends to the primary focal piece positioned at the bottom-center. This orientation is specifically designed to showcase the object's depth, structural layers, and the side-on craftsmanship of its setting.
Styling & Mood: The surface is a warm, polished beige marble, earthy color variations. The background is a smooth, blurry continuation of this stone texture, creating a seamless horizon line that fades into a soft creamy beige gradient. Lighting is soft, warm, and directional, mimicking natural window light coming from the side. This creates gentle, elongated shadows that firmly ground the jewelry to the stone. The atmosphere is calm, organic, and sophisticated—like a high-end lifestyle editorial.`
    },
    {
      id: 'anheng4',
      name: 'Diagonal Dynamic',
      imageFile: 'anheng4.png',
      prompt: `Placement: The jewelry is arranged in a dynamic, asymmetrical diagonal drape. The suspension element (such as a chain or cord) enters the frame from the upper-left corner and descends toward the bottom-center. The primary focal component or pendant is positioned at an elevated three-quarter angle, specifically oriented to reveal both its decorative face and its structural depth or profile.
Styling & Mood: The surface is a high-end polished beige marble with subtle, warm-toned natural veining. The texture is smooth and glossy, providing a luxurious and clean minimalist background.`
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
