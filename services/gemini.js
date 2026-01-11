const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path');
const fs = require('fs');

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'project-bcb47e5a-1886-41ee-a91';
const LOCATION = 'europe-west1';

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

// Initialize Vertex AI
let vertexAI = null;
let generativeModel = null;

function initializeVertexAI() {
  if (!vertexAI) {
    setupCredentials();
    vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION
    });

    generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp'
    });
  }
  return generativeModel;
}

// Extract tag information from jewelry images
async function extractTagInfo(imageBuffers) {
  const model = initializeVertexAI();

  // Convert buffers to base64 inline data
  const imageParts = imageBuffers.map(buffer => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: buffer.toString('base64')
    }
  }));

  const prompt = `Analyser disse smykkebildene nøye. På hvert smykke er det festet en tag/etikett med 3 rader med informasjon:

Rad 1: Vekt i gram (et tall, kan ha desimaler)
Rad 2: Arbeidskostnad (et tall, ignorer eventuelt + tegn foran)
Rad 3: Produkt-ID (en unik identifikator/kode)

Finn og returner denne informasjonen. Hvis informasjonen finnes i et av bildene, er det ikke nødvendig å gjenta fra andre bilder.

Returner resultatet NØYAKTIG i dette JSON-formatet (ingen annen tekst):
{
  "weight": "vekt i gram som tall",
  "laborCost": "arbeidskostnad som tall",
  "productId": "produkt-id som streng",
  "found": true/false
}

Hvis du ikke kan finne informasjonen, sett "found" til false.`;

  try {
    const request = {
      contents: [
        {
          role: 'user',
          parts: [...imageParts, { text: prompt }]
        }
      ]
    };

    const response = await model.generateContent(request);
    const result = response.response;
    const text = result.candidates[0].content.parts[0].text;

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

// Generate visual descriptor for the jewelry
async function generateVisualDescriptor(imageBuffers, category) {
  const model = initializeVertexAI();

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

  const prompt = `You are a luxury jewelry expert and image generation prompt specialist.

Analyze these images of a ${categoryNames[category] || 'jewelry piece'} in 22 karat gold.

Create a COMPREHENSIVE and DETAILED VISUAL DESCRIPTOR that captures EVERY visual aspect:

1. SHAPE & FORM: Exact silhouette, proportions, thickness, curvature, symmetry
2. SURFACE FINISH: Polished/matte/satin/hammered/brushed/textured - describe precisely
3. DECORATIVE ELEMENTS: All patterns, filigree work, engravings, cutouts, borders, edges
4. METALWORK DETAILS: Rope twists, beading, granulation, milgrain, geometric patterns
5. STONE SETTINGS (if any): Stone type, cut, color, setting style, arrangement
6. CHAIN/BAND DETAILS (if applicable): Link style, width, clasp type, weave pattern
7. CULTURAL/STYLE ELEMENTS: Traditional motifs, ethnic influences, regional design characteristics
8. UNIQUE FEATURES: Any distinctive elements that make this piece recognizable

Write in English. Be EXHAUSTIVE and SPECIFIC - describe every visible detail so an AI image generator can recreate this EXACT piece with perfect accuracy. Include color tones of the gold (yellow/rose/warm).

Return 4-6 detailed sentences covering all visual characteristics. No dimensions or weight.`;

  try {
    const request = {
      contents: [
        {
          role: 'user',
          parts: [...imageParts, { text: prompt }]
        }
      ]
    };

    const response = await model.generateContent(request);
    const result = response.response;
    return result.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Gemini visual descriptor error:', error);
    return `A beautiful 22 karat gold ${categoryNames[category] || 'jewelry piece'} with traditional craftsmanship and polished finish.`;
  }
}

// Generate product description
async function generateProductDescription(imageBuffers, category, tagInfo) {
  const model = initializeVertexAI();

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
    const request = {
      contents: [
        {
          role: 'user',
          parts: [...imageParts, { text: prompt }]
        }
      ]
    };

    const response = await model.generateContent(request);
    const result = response.response;
    const text = result.candidates[0].content.parts[0].text;

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
  analyzeJewelryImages,
  initializeVertexAI
};
