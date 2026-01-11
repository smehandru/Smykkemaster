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
