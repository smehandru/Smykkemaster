const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path');
const fs = require('fs');
const { buildFullPrompt, PROMPTS } = require('../config/prompts');

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'project-bcb47e5a-1886-41ee-a91';
const LOCATION = 'us-central1';

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

// Categories that utilize the specialized Image generation model
// gemini-2.5-flash-image is the stable, high-efficiency model for these items
const FLASH_MODEL_CATEGORIES = ['ring', 'anheng', 'oredobber'];

function getModelForCategory(category) {
  // Normalize category to handle potential casing issues
  const normCategory = category ? category.toLowerCase().trim() : '';
  
  if (FLASH_MODEL_CATEGORIES.includes(normCategory)) {
    return 'gemini-2.5-flash-image';
  }
  
  // Default to Pro for everything else (necklaces, bracelets, etc.)
  return 'gemini-3-pro-image-preview';
}

function setupCredentials() {
  if (process.env.GOOGLE_CREDENTIALS) {
    const tempPath = '/tmp/google-credentials.json';
    fs.writeFileSync(tempPath, process.env.GOOGLE_CREDENTIALS);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
  } else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '..', 'service-account.json');
  }
}

// Rate limiting configuration
const RATE_LIMIT = {
  maxConcurrent: 2,         // Gemini 2.5 Flash allows higher concurrency
  delayBetweenRequests: 2000, 
  maxRetries: 3,
  retryDelay: 5000
};

let activeRequests = 0;
const requestQueue = [];

async function enqueueRequest(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (requestQueue.length === 0 || activeRequests >= RATE_LIMIT.maxConcurrent) {
    return;
  }

  const { fn, resolve, reject } = requestQueue.shift();
  activeRequests++;

  try {
    const result = await fn();
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    setTimeout(() => processQueue(), RATE_LIMIT.delayBetweenRequests);
  }
}

// Initialize Vertex AI (Single Client for ALL models)
let vertexAI = null;

function initializeVertexAI() {
  if (!vertexAI) {
    console.log('Initializing Vertex AI client...');
    setupCredentials();
    vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION
    });
  }
  return vertexAI;
}

// Generate a single image
async function generateSingleImage(prompt, referenceImageBuffers, category = null, retries = RATE_LIMIT.maxRetries) {
  return enqueueRequest(async () => {
    // 1. Initialize Client
    const client = initializeVertexAI();

    // 2. Select Model
    const selectedModel = getModelForCategory(category);
    
    // 3. Prepare Payload
    const parts = [];

    // Add Reference Images
    if (referenceImageBuffers && referenceImageBuffers.length > 0) {
      for (let i = 0; i < referenceImageBuffers.length; i++) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: referenceImageBuffers[i].toString('base64')
          }
        });
      }
      
      const imageCount = referenceImageBuffers.length;
      parts.push({
        text: `Using the ${imageCount} jewelry image${imageCount > 1 ? 's' : ''} above as exact reference (showing the piece from ${imageCount > 1 ? 'multiple angles' : 'one angle'}), ${prompt}`
      });
    } else {
      parts.push({ text: prompt });
    }

    try {
      console.log(`Generating with ${selectedModel} via Vertex AI...`);
      const startTime = Date.now();

      // 4. Instantiate Model
      let model;
      try {
        // We set specific modalities for Flash vs Pro if needed
        const responseModalities = selectedModel.includes('flash') 
          ? ['image', 'text']  // Flash can explain refusals in text
          : ['image'];         // Pro is usually strict image generation

        model = client.getGenerativeModel({
          model: selectedModel,
          generationConfig: { 
            responseModalities: responseModalities,
            temperature: 0.4 
          }
        });
      } catch (e) {
        console.warn(`Failed to load ${selectedModel}, falling back to gemini-2.0-flash-exp`);
        model = client.getGenerativeModel({
          model: 'gemini-2.0-flash-exp',
          generationConfig: { responseModalities: ['image'] }
        });
      }

      const request = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          candidateCount: 1,
        }
      };
      
      // 5. Execute Request
      const response = await model.generateContent(request);
      const result = response.response;
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Response received in ${duration}s`);

      // 6. Extract Image
      if (result.candidates && result.candidates[0]) {
        const candidate = result.candidates[0];
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              return {
                success: true,
                imageBuffer: Buffer.from(part.inlineData.data, 'base64'),
                mimeType: part.inlineData.mimeType || 'image/jpeg',
                generationTime: duration
              };
            }
          }
        }
      }

      // 7. Check for Text Refusal (Crucial for Flash models)
      let refusalText = '';
      if (result.candidates && result.candidates[0]?.content?.parts) {
        for (const part of result.candidates[0].content.parts) {
          if (part.text) refusalText += part.text;
        }
      }

      if (refusalText) {
        throw new Error(`Model Refused: "${refusalText.substring(0, 200)}..."`);
      }

      if (result.candidates && result.candidates[0]?.finishReason) {
         if (result.candidates[0].finishReason !== 'STOP') {
             throw new Error(`Generation stopped due to: ${result.candidates[0].finishReason}`);
         }
      }

      throw new Error('No image data in response (Unknown reason)');

    } catch (error) {
      console.error(`Image generation error (retries left: ${retries}):`, error.message);

      // Retry on Quota limits (429)
      if (retries > 0 && (
        error.message.includes('429') ||
        error.message.includes('RESOURCE_EXHAUSTED') ||
        error.message.includes('503')
      )) {
        console.log(`Quota exceeded. Retrying in ${RATE_LIMIT.retryDelay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay));
        return generateSingleImage(prompt, referenceImageBuffers, category, retries - 1);
      }

      throw error;
    }
  });
}

// ... (Keep the rest of your file: generateAllPerspectives, etc.) ...

async function generateAllPerspectives(visualDescriptor, category, ethnicity, referenceImageBuffers, customPrompts = {}) {
  const categoryPrompts = PROMPTS[category];
  if (!categoryPrompts) throw new Error(`Unknown category: ${category}`);

  const results = [];
  const perspectives = categoryPrompts.perspectives;

  console.log(`\n=== Starting Generation for ${categoryPrompts.name} ===`);
  
  for (let i = 0; i < perspectives.length; i++) {
    const perspective = perspectives[i];
    let fullPrompt = customPrompts[perspective.id] || buildFullPrompt(
      visualDescriptor,
      perspective.prompt,
      ethnicity,
      perspective.requiresModel
    );

    try {
      const result = await generateSingleImage(fullPrompt, referenceImageBuffers, category);
      results.push({
        perspectiveId: perspective.id,
        perspectiveName: perspective.name,
        imageNumber: i + 1,
        ...result
      });
      console.log(`✓ ${perspective.name} completed`);
    } catch (error) {
      console.error(`✗ Failed to generate ${perspective.name}:`, error.message);
      results.push({
        perspectiveId: perspective.id,
        perspectiveName: perspective.name,
        imageNumber: i + 1,
        success: false,
        error: error.message
      });
    }
  }
  return results;
}

// Regenerate a specific image
async function regenerateImage(visualDescriptor, category, ethnicity, perspectiveId, referenceImageBuffers, customPrompt = null) {
  const categoryPrompts = PROMPTS[category];
  if (!categoryPrompts) throw new Error(`Unknown category: ${category}`);

  const perspective = categoryPrompts.perspectives.find(p => p.id === perspectiveId);
  if (!perspective) throw new Error(`Unknown perspective: ${perspectiveId}`);

  console.log(`Regenerating: ${perspective.name}`);
  const fullPrompt = customPrompt || buildFullPrompt(visualDescriptor, perspective.prompt, ethnicity, perspective.requiresModel);

  const result = await generateSingleImage(fullPrompt, referenceImageBuffers, category);
  return { perspectiveId: perspective.id, perspectiveName: perspective.name, ...result };
}

async function regenerateSingleImage(masterPrompt, productImageBuffers, compositionImageBuffer = null, category = null) {
  return generateSingleImage(masterPrompt, productImageBuffers, category);
}

async function generateDirectFromComposition(perspectives, visualDescriptor, referenceImageBuffers, compositionImageBuffers = {}, category = null) {
  const results = [];
  console.log(`\n=== Starting DIRECT generation for ${category || 'Unknown'} ===`);
  
  for (let i = 0; i < perspectives.length; i++) {
    const perspective = perspectives[i];
    const combinedPrompt = buildCombinedPrompt(visualDescriptor, perspective.prompt, referenceImageBuffers.length, false);

    console.log(`[${i + 1}/${perspectives.length}] Generating: ${perspective.id}`);
    try {
      const result = await generateSingleImage(combinedPrompt, referenceImageBuffers, category);
      results.push({
        perspectiveId: perspective.id,
        perspectiveName: perspective.name || perspective.id,
        imageNumber: i + 1,
        ...result
      });
      console.log(`✓ ${perspective.id} completed`);
    } catch (error) {
      console.error(`✗ Failed:`, error.message);
      results.push({
        perspectiveId: perspective.id,
        perspectiveName: perspective.name || perspective.id,
        imageNumber: i + 1,
        success: false,
        error: error.message
      });
    }
  }
  return results;
}

function buildCombinedPrompt(visualDescriptor, compositionPrompt, numProductImages, hasComposition) {
  return `Generate an ultra high-definition 2K luxury jewelry editorial photograph.

=== JEWELRY DESIGN (from product images 1-${numProductImages}) ===
${visualDescriptor}

CRITICAL: Copy EVERY detail of the jewelry EXACTLY from the product images - shape, texture, finish, patterns, stones, metalwork.

=== COMPOSITION & STYLING ===
${compositionPrompt}

=== REQUIREMENTS ===
- 2K resolution, photorealistic quality
- No text, logos, or watermarks
- Jewelry must match product images exactly`;
}

function buildExactPromptSentToNanoBananaPro(visualDescriptor, compositionPrompt, numProductImages) {
  const combinedPrompt = buildCombinedPrompt(visualDescriptor, compositionPrompt, numProductImages, false);
  if (numProductImages > 0) {
    return `Using images 1-${numProductImages} in this message as exact reference for the jewelry design (showing the piece from ${numProductImages > 1 ? 'multiple angles' : 'one angle'}), ${combinedPrompt}`;
  }
  return combinedPrompt;
}

async function generateFromMasterPrompts(masterPrompts, referenceImageBuffers, compositionImageBuffers = {}, category = null) {
  const results = [];
  const perspectiveIds = Object.keys(masterPrompts);

  console.log(`\n=== Starting Master Prompt generation for ${category} ===`);

  for (let i = 0; i < perspectiveIds.length; i++) {
    const perspectiveId = perspectiveIds[i];
    console.log(`[${i + 1}/${perspectiveIds.length}] Generating: ${perspectiveId}`);
    try {
      const result = await generateSingleImage(masterPrompts[perspectiveId], referenceImageBuffers, category);
      results.push({ perspectiveId, perspectiveName: perspectiveId, imageNumber: i + 1, ...result });
      console.log(`✓ ${perspectiveId} completed`);
    } catch (error) {
      results.push({ perspectiveId, perspectiveName: perspectiveId, imageNumber: i + 1, success: false, error: error.message });
    }
  }
  return results;
}

function getPerspectives(category) {
  const categoryPrompts = PROMPTS[category];
  return categoryPrompts ? categoryPrompts.perspectives.map((p, index) => ({
    id: p.id, name: p.name, imageNumber: index + 1, requiresModel: p.requiresModel
  })) : [];
}

function getQueueStatus() {
  return { activeRequests, queuedRequests: requestQueue.length, maxConcurrent: RATE_LIMIT.maxConcurrent };
}

module.exports = {
  generateSingleImage,
  generateAllPerspectives,
  generateFromMasterPrompts,
  generateDirectFromComposition,
  buildCombinedPrompt,
  buildExactPromptSentToNanoBananaPro,
  regenerateImage,
  regenerateSingleImage,
  getPerspectives,
  getQueueStatus,
  RATE_LIMIT
};
