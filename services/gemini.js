const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'project-bcb47e5a-1886-41ee-a91';
const LOCATION = 'us-central1'; // Global endpoint for Gemini 3

// Setup credentials for Vertex AI
function setupCredentials() {
  if (process.env.GOOGLE_CREDENTIALS) {
    // Write credentials to temp file for Vertex AI
    const tempPath = '/tmp/google-credentials.json';
    fs.writeFileSync(tempPath, process.env.GOOGLE_CREDENTIALS);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
  } else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '..', 'service-account.json');
  }
}

// Initialize Google GenAI with Vertex AI
let genAI = null;

function initializeGenAI() {
  if (!genAI) {
    setupCredentials();
    genAI = new GoogleGenAI({
      vertexai: true,
      project: PROJECT_ID,
      location: LOCATION
    });
  }
  return genAI;
}

// Fast model name for quick tasks
const FAST_MODEL = 'gemini-2.0-flash-001';

// Thinking model with HIGH reasoning for complex tasks
const THINKING_MODEL = 'gemini-3-pro-preview';

// Extract tag information from jewelry images (uses fast model)
async function extractTagInfo(imageBuffers) {
  const ai = initializeGenAI();

  // Convert buffers to base64 inline data parts
  const imageParts = imageBuffers.map(buffer => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: buffer.toString('base64')
    }
  }));

  const prompt = `OPPGAVE: Finn og les informasjonen på den lille papir-taggen/etiketten som henger på smykket.

SE NØYE på bildene. Det er en liten hvit/beige papir-tag festet til smykket med en tråd eller snor. Taggen inneholder HÅNDSKREVET eller TRYKT tekst med 3 linjer:

LINJE 1: Vekt i gram (f.eks. "2.5", "3.75", "10.2")
LINJE 2: Arbeidskostnad/making charge (f.eks. "150", "+200", "350")
LINJE 3: Produkt-ID/kode (f.eks. "ABC123", "R-456", "NK2024")

VIKTIG:
- Zoom inn mentalt på taggen/etiketten
- Les NØYAKTIG det som står - ikke gjett
- Taggen kan være liten, men informasjonen er der
- Ignorer "+" tegn foran tall

Returner KUN denne JSON (ingen annen tekst):
{
  "weight": "tallet fra linje 1",
  "laborCost": "tallet fra linje 2",
  "productId": "koden fra linje 3",
  "found": true
}

Hvis du VIRKELIG ikke kan se/lese taggen, returner:
{"weight": "", "laborCost": "", "productId": "", "found": false}`;

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: [...imageParts, { text: prompt }]
    });

    const text = response.text;

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { found: false, error: 'Could not parse response' };
  } catch (error) {
    console.error('Gemini tag extraction error:', error);
    return { found: false, error: error.message };
  }
}

// Generate visual descriptor for the jewelry (uses Gemini 3 Pro with HIGH thinking)
async function generateVisualDescriptor(imageBuffers, category) {
  const ai = initializeGenAI();

  const imageParts = imageBuffers.map(buffer => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: buffer.toString('base64')
    }
  }));

  const categoryNames = {
    'ring': 'ring',
    'halskjede': 'halskjede/necklace',
    'armbaand': 'armbånd/bracelet',
    'oredobber': 'øredobber/earrings',
    'anheng': 'anheng/pendant'
  };

  const prompt = `You are a master goldsmith describing a piece for exact replication.

Analyze this ${categoryNames[category] || 'jewelry piece'} in 22 karat yellow gold. Describe it with EXTREME PRECISION:

MANDATORY DETAILS TO INCLUDE:
- EXACT SHAPE: Is it round, oval, rectangular, teardrop, heart, flower-shaped, geometric? Describe the precise outline.
- SURFACE TREATMENT: Mirror-polished, satin-brushed, hammered texture, matte finish, or combination?
- PATTERN/DESIGN: Describe EXACTLY what you see - are there leaves, flowers, geometric shapes, curves, swirls, lattice work, cutouts?
- EDGE DETAILS: Smooth edges, scalloped, beaded border, rope border, milgrain?
- TEXTURE ELEMENTS: Granulation (tiny gold balls), filigree (wire work), engraving, embossing, diamond-cut facets?
- CENTER ELEMENT: What is the focal point? A stone, a motif, a symbol, plain surface?
- If CHAIN: Describe link type (cable, rope, box, figaro, snake, curb) precisely

EXAMPLE OF GOOD DESCRIPTOR:
"A round 22 karat yellow gold pendant with a domed, mirror-polished center surrounded by a ring of intricate filigree scrollwork. The outer edge features a delicate beaded border. The filigree creates a lace-like pattern of curved tendrils and small flower motifs. Surface has a warm, rich yellow gold color with high shine on raised areas."

Now describe THIS piece with the same level of specific detail. Focus on what makes THIS piece unique and recognizable. No dimensions.`;

  try {
    const response = await ai.models.generateContent({
      model: THINKING_MODEL,
      contents: [...imageParts, { text: prompt }],
      config: {
        thinkingConfig: {
          thinkingLevel: 'HIGH'
        }
      }
    });

    return response.text.trim();
  } catch (error) {
    console.error('Gemini visual descriptor error:', error);
    // Fallback to fast model if thinking model fails
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: [...imageParts, { text: prompt }]
      });
      return fallbackResponse.text.trim();
    } catch (fallbackError) {
      console.error('Fallback model also failed:', fallbackError);
      return `A beautiful 22 karat gold ${categoryNames[category] || 'jewelry piece'} with traditional craftsmanship and polished finish.`;
    }
  }
}

// Generate product description (uses fast model)
async function generateProductDescription(imageBuffers, category, tagInfo) {
  const ai = initializeGenAI();

  const imageParts = imageBuffers.map(buffer => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: buffer.toString('base64')
    }
  }));

  const categoryInstructions = {
    'ring': 'Ringstørrelse i mm (KUN millimeter, IKKE US size)',
    'oredobber': 'L:lengde, B:bredde i mm (f.eks. "L:25mm, B:15mm")',
    'halskjede': '',
    'armbaand': '',
    'anheng': ''
  };

  const sizeNote = categoryInstructions[category] ? ` Størrelse: ${categoryInstructions[category]}.` : '';

  // Special instructions for rings to explain the size marking
  const ringSizeInstruction = category === 'ring' ? `

VIKTIG FOR RINGER - SLIk LESES STØRRELSEN:
- Ringen kan ha størrelsesmarkering skrevet PÅ eller RUNDT ringen
- Tallet som er markert viser størrelsen som ringen DEKKER (ikke innvendig diameter)
- Hvis det er tall både OVER og UNDER ringen: tallet OVER er MINDRE enn ringen, tallet UNDER er STØRRE
- Eksempel: Hvis "18" står over og "20" står under, er ringen størrelse 19mm
- Les NØYAKTIG hva som står - ikke gjett
- Returner KUN i millimeter (mm), ALDRI US size
` : '';

  const prompt = `Skriv en KORT og minimalistisk produktbeskrivelse på norsk for dette smykket.

Kategori: ${category}
${ringSizeInstruction}
Beskrivelsen skal være MAKS 2 setninger og inneholde:
1. Kort beskrivelse av designet (stil, form, detaljer)
2. "22 karat gull"
${category === 'ring' || category === 'oredobber' ? '3. Størrelsesdimensjoner' : ''}

Returner som JSON:
{
  "description": "Kort beskrivelse. 22 karat gull.${sizeNote}",
  "size": "${category === 'ring' ? 'KUN mm (f.eks. 19mm)' : category === 'oredobber' ? 'L:mm, B:mm' : ''}"
}

Vær KONSIS - ikke skriv lange beskrivelser. Maksimalt 2 korte setninger.`;

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: [...imageParts, { text: prompt }]
    });

    const text = response.text;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      description: text.trim(),
      size: ''
    };
  } catch (error) {
    console.error('Gemini description error:', error);
    return {
      description: `Et vakkert smykke i 22 karat gull med tradisjonelt håndverk.`,
      size: ''
    };
  }
}

// Generate refined master prompt using Gemini 3 Pro with HIGH thinking
// Receives product images + composition prompt (text only) + visual descriptor
async function generateMasterPrompt(visualDescriptor, compositionPrompt, category, productImageBuffers = [], compositionImageBuffer = null) {
  const ai = initializeGenAI();

  const categoryNames = {
    'ring': 'ring',
    'halskjede': 'necklace',
    'armbaand': 'bracelet',
    'oredobber': 'earrings',
    'anheng': 'pendant'
  };

  // Build content parts array with images and text
  const contentParts = [];

  // Add product reference images first
  if (productImageBuffers && productImageBuffers.length > 0) {
    for (let i = 0; i < productImageBuffers.length; i++) {
      contentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: productImageBuffers[i].toString('base64')
        }
      });
    }
  }

  // NOTE: Composition reference image is NOT sent - only text prompt

  // Build the prompt that references the images
  const numProductImages = productImageBuffers ? productImageBuffers.length : 0;

  const prompt = `# ROLE
You are an expert Jewelry Creative Director and Photographic Prompt Engineer. Your task is to merge the "Identity" of user-uploaded jewelry with a text-based "Reference Composition Prompt" to create a high-fidelity 2K Master Rendering Prompt.

# INSTRUCTION: LINGUISTIC MAPPING
1. ANALYZE IDENTITY: Extract metal types, stone counts, and unique engravings from [PRODUCT_IMAGE_1] through [PRODUCT_IMAGE_${numProductImages}]. Maintain 100% fidelity to these physical traits.
2. PARSE COMPOSITION: Read the [REFERENCE_COMPOSITION_PROMPT] below. Extract the placement (e.g., "flat-lay," "diagonal"), the lighting mood (e.g., "warm studio," "high-key"), and the styling.
3. SYNTHESIZE: Combine these into a single narrative paragraph for Nano Banana Pro.

# MANDATORY PHOTOGRAPHY STANDARDS
Your output MUST include these technical directives to ensure 2K optical realism:
- CAMERA: Command a "Hasselblad X2D II 100C" or "Phase One XF" medium format aesthetic. These sensors provide the 16-bit color depth and 15-stop dynamic range required for high-end metallic luster.
- LENS: Specify a "120mm f/4 Macro lens" with a "1:1 magnification ratio." This focal length avoids distortion and resolves the micro-grain of polished gold and the sharp facets of gemstones.
- PHYSICS: Command "zero digital noise" and "optical focus stacking" to ensure the entire piece is tack-sharp from the foreground to the background.
- LIGHTING: Define light physics using "5500K softbox diffusion" and specify "sharp specular highlights" on the metal edges.
- GROUNDING: Explicitly command "soft-edged contact shadows" to provide a realistic sense of weight and 3D volume.

# CONSTRAINTS
- No CGI: Do not use terms like "3D render," "unreal engine," or "octane." Focus on raw photography terms.
- No HALLUCINATIONS: Do not add any gems or features found in the composition prompt if they are not in the raw product images.

=== INPUT DATA ===

[PRODUCT_IMAGES]: Images 1-${numProductImages} in this message
These are the raw product photos of the actual jewelry piece. Study every detail: shape, texture, finish, patterns, stones, metalwork.

[PRODUCT_VISUAL_DESCRIPTOR]:
${visualDescriptor}

[REFERENCE_COMPOSITION_PROMPT]:
${compositionPrompt}

[CATEGORY]: ${categoryNames[category] || 'jewelry'}

=== YOUR TASK ===

Create a MASTER RENDERING PROMPT that Nano Banana Pro (gemini-2.0-flash-exp with image generation) will use to create the final editorial photograph.

The prompt MUST:
1. Describe the jewelry piece EXACTLY as shown in the PRODUCT IMAGES (copy every visual detail from those specific images)
2. Apply the composition and styling from the REFERENCE COMPOSITION PROMPT (camera angle, framing, positioning, lighting, background, mood)
3. Include the MANDATORY PHOTOGRAPHY STANDARDS (Hasselblad X2D II 100C or Phase One XF, 120mm f/4 Macro lens 1:1, zero digital noise, optical focus stacking, 5500K softbox, sharp specular highlights, soft-edged contact shadows)
4. Specify: 2K resolution (2048x2048), photorealistic quality, no CGI look, no text/logos/watermarks
5. NEVER add jewelry elements that are not visible in the product images

=== OUTPUT FORMAT ===

Return ONLY the master prompt text. Start directly with the image description. No labels, no JSON, no explanations, no preamble.

Example format:
"Ultra high-definition 2K luxury editorial photograph of [detailed jewelry description matching the product images exactly]. [Exact composition and styling from reference]. Shot with 120mm f/4 Macro lens at 1:1 magnification ratio on Hasselblad X2D II 100C medium format camera. Optical focus stacking ensures tack-sharp detail from foreground to background. Zero digital noise. [Exact lighting setup with 5500K softbox diffusion]. Sharp specular highlights on metal edges. Soft-edged contact shadows grounding the piece. [Background and mood]. Photorealistic quality, no CGI artifacts, no text or watermarks."`;

  // Add the text prompt
  contentParts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: THINKING_MODEL,
      contents: contentParts,
      config: {
        thinkingConfig: {
          thinkingLevel: 'HIGH'
        }
      }
    });

    return response.text.trim();
  } catch (error) {
    console.error('Gemini master prompt generation error:', error);
    // Fallback to fast model
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: contentParts
      });
      return fallbackResponse.text.trim();
    } catch (fallbackError) {
      // Ultimate fallback: combine the inputs manually
      return `Ultra high-definition 2K luxury jewelry editorial photograph. ${visualDescriptor} ${compositionPrompt} Shot with 120mm f/4 Macro lens at 1:1 magnification on Hasselblad X2D II 100C medium format camera. Optical focus stacking. Zero digital noise. 5500K softbox diffusion. Sharp specular highlights on metal edges. Soft-edged contact shadows. Professional studio lighting, photorealistic quality.`;
    }
  }
}

// Combined analysis function
async function analyzeJewelryImages(imageBuffers, category) {
  // Run tag extraction and visual descriptor in parallel
  const [tagInfo, visualDescriptor] = await Promise.all([
    extractTagInfo(imageBuffers),
    generateVisualDescriptor(imageBuffers, category)
  ]);

  // Generate product description using tag info
  const productDescription = await generateProductDescription(
    imageBuffers,
    category,
    tagInfo
  );

  return {
    tagInfo,
    visualDescriptor,
    productDescription
  };
}

module.exports = {
  extractTagInfo,
  generateVisualDescriptor,
  generateProductDescription,
  generateMasterPrompt,
  analyzeJewelryImages,
  initializeGenAI
};
