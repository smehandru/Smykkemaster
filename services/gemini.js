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
    'ring': 'Ringstørrelse i mm diameter/US size (f.eks. "52mm/US 6")',
    'oredobber': 'L:lengde, B:bredde i mm (f.eks. "L:25mm, B:15mm")',
    'halskjede': '',
    'armbaand': '',
    'anheng': ''
  };

  const sizeNote = categoryInstructions[category] ? ` Størrelse: ${categoryInstructions[category]}.` : '';

  const prompt = `Skriv en KORT og minimalistisk produktbeskrivelse på norsk for dette smykket.

Kategori: ${category}

Beskrivelsen skal være MAKS 2 setninger og inneholde:
1. Kort beskrivelse av designet (stil, form, detaljer)
2. "22 karat gull"
${category === 'ring' || category === 'oredobber' ? '3. Størrelsesdimensjoner' : ''}

Returner som JSON:
{
  "description": "Kort beskrivelse. 22 karat gull.${sizeNote}",
  "size": "${category === 'ring' ? 'mm/US size' : category === 'oredobber' ? 'L:mm, B:mm' : ''}"
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
async function generateMasterPrompt(visualDescriptor, compositionPrompt, category) {
  const ai = initializeGenAI();

  const categoryNames = {
    'ring': 'ring',
    'halskjede': 'necklace',
    'armbaand': 'bracelet',
    'oredobber': 'earrings',
    'anheng': 'pendant'
  };

  const prompt = `You are an expert luxury jewelry photographer and art director. Your task is to create a PRECISE, DETAILED prompt for an AI image generator to produce a stunning luxury editorial photograph.

JEWELRY DESCRIPTION (what the piece looks like):
${visualDescriptor}

COMPOSITION & STYLING REFERENCE (how to photograph it):
${compositionPrompt}

CATEGORY: ${categoryNames[category] || 'jewelry'}

Create a SINGLE, COMPREHENSIVE image generation prompt that:
1. Integrates the exact visual details of the jewelry piece
2. Applies the composition, lighting, and styling from the reference
3. Specifies ultra-high quality 2K resolution requirements
4. Describes the exact camera angle, depth of field, and focus
5. Includes specific lighting setup (direction, quality, color temperature)
6. Describes the background/environment in detail
7. Mentions any props or supporting elements
8. Specifies the mood and atmosphere

OUTPUT FORMAT:
Return ONLY the final prompt text, nothing else. The prompt should be a single flowing paragraph that could be directly used with an image generator. Do not include any JSON, labels, or explanations - just the pure prompt text.

Make it detailed enough that an AI could generate the exact image described. Focus on photorealistic, editorial quality output.`;

  try {
    const response = await ai.models.generateContent({
      model: THINKING_MODEL,
      contents: [{ text: prompt }],
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
        contents: [{ text: prompt }]
      });
      return fallbackResponse.text.trim();
    } catch (fallbackError) {
      // Ultimate fallback: combine the inputs manually
      return `Ultra high-definition 2K luxury jewelry editorial photograph. ${visualDescriptor} ${compositionPrompt} Professional studio lighting, shallow depth of field, photorealistic quality.`;
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
