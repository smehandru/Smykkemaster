const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path');
const fs = require('fs');
const { buildFullPrompt, PROMPTS } = require('../config/prompts');

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'project-bcb47e5a-1886-41ee-a91';
const LOCATION = 'us-central1';

// Setup credentials for Vertex AI
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
  maxConcurrent: 2,
  delayBetweenRequests: 3000,
  maxRetries: 3,
  retryDelay: 8000
};

let activeRequests = 0;
const requestQueue = [];

// Queue management for rate limiting
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

// Initialize Vertex AI for Nano Banana Pro
let vertexAI = null;
let nanoBananaProModel = null;

function initializeNanoBananaPro() {
  if (!vertexAI) {
    setupCredentials();
    vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION
    });

    // Nano Banana Pro = gemini-2.0-flash-exp with image output
    nanoBananaProModel = vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['image', 'text'],
      }
    });
  }
  return nanoBananaProModel;
}

// Generate a single image with Nano Banana Pro
async function generateSingleImage(prompt, referenceImageBuffers, retries = RATE_LIMIT.maxRetries) {
  return enqueueRequest(async () => {
    const model = initializeNanoBananaPro();

    const parts = [];

    // Add ALL reference images first (important for image-to-image)
    // This allows the model to see the jewelry from multiple angles
    if (referenceImageBuffers && referenceImageBuffers.length > 0) {
      for (let i = 0; i < referenceImageBuffers.length; i++) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: referenceImageBuffers[i].toString('base64')
          }
        });
      }
      // Add instruction to use all reference images
      const imageCount = referenceImageBuffers.length;
      parts.push({
        text: `Using the ${imageCount} jewelry image${imageCount > 1 ? 's' : ''} above as exact reference (showing the piece from ${imageCount > 1 ? 'multiple angles' : 'one angle'}), ${prompt}`
      });
    } else {
      parts.push({ text: prompt });
    }

    try {
      const request = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['image'],
          candidateCount: 1,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        ]
      };

      console.log('Sending request to Nano Banana Pro...');
      const startTime = Date.now();

      const response = await model.generateContent(request);
      const result = response.response;

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Image generated in ${duration}s`);

      // Extract generated image from response
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

      // Check for text response (might contain error or explanation)
      if (result.candidates && result.candidates[0]?.content?.parts) {
        for (const part of result.candidates[0].content.parts) {
          if (part.text) {
            console.log('Model response text:', part.text);
          }
        }
      }

      throw new Error('No image data in response');
    } catch (error) {
      console.error(`Image generation error (retries left: ${retries}):`, error.message);

      // Retry on rate limits or transient errors
      if (retries > 0 && (
        error.message.includes('429') ||
        error.message.includes('RESOURCE_EXHAUSTED') ||
        error.message.includes('503') ||
        error.message.includes('UNAVAILABLE')
      )) {
        console.log(`Retrying in ${RATE_LIMIT.retryDelay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay));
        return generateSingleImage(prompt, referenceImageBuffer, retries - 1);
      }

      throw error;
    }
  });
}

// Generate all perspective images for a jewelry piece
async function generateAllPerspectives(visualDescriptor, category, ethnicity, referenceImageBuffers, customPrompts = {}) {
  const categoryPrompts = PROMPTS[category];
  if (!categoryPrompts) {
    throw new Error(`Unknown category: ${category}`);
  }

  const results = [];
  const perspectives = categoryPrompts.perspectives;

  console.log(`\n=== Starting Nano Banana Pro generation for ${categoryPrompts.name} ===`);
  console.log(`Reference images: ${referenceImageBuffers.length} (all will be used)`);
  console.log(`Visual descriptor: ${visualDescriptor.substring(0, 100)}...`);
  console.log(`Ethnicity: ${ethnicity}`);
  console.log(`Custom prompts provided: ${Object.keys(customPrompts).length}`);
  console.log(`Perspectives to generate: ${perspectives.length}\n`);

  for (let i = 0; i < perspectives.length; i++) {
    const perspective = perspectives[i];

    // Use custom prompt if provided, otherwise build default
    let fullPrompt;
    if (customPrompts[perspective.id]) {
      fullPrompt = customPrompts[perspective.id];
      console.log(`[${i + 1}/${perspectives.length}] Using CUSTOM prompt for: ${perspective.name}`);
    } else {
      fullPrompt = buildFullPrompt(
        visualDescriptor,
        perspective.prompt,
        ethnicity,
        perspective.requiresModel
      );
      console.log(`[${i + 1}/${perspectives.length}] Generating: ${perspective.name}`);
    }

    try {
      // Pass ALL reference images to the model
      const result = await generateSingleImage(fullPrompt, referenceImageBuffers);
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

  const successCount = results.filter(r => r.success).length;
  console.log(`\n=== Generation complete: ${successCount}/${perspectives.length} successful ===\n`);

  return results;
}

// Regenerate a specific image
async function regenerateImage(visualDescriptor, category, ethnicity, perspectiveId, referenceImageBuffers, customPrompt = null) {
  const categoryPrompts = PROMPTS[category];
  if (!categoryPrompts) {
    throw new Error(`Unknown category: ${category}`);
  }

  const perspective = categoryPrompts.perspectives.find(p => p.id === perspectiveId);
  if (!perspective) {
    throw new Error(`Unknown perspective: ${perspectiveId}`);
  }

  console.log(`Regenerating: ${perspective.name}${customPrompt ? ' (with custom prompt)' : ''}`);
  console.log(`Using ${referenceImageBuffers.length} reference image(s)`);

  // Use custom prompt if provided, otherwise build default
  const fullPrompt = customPrompt || buildFullPrompt(
    visualDescriptor,
    perspective.prompt,
    ethnicity,
    perspective.requiresModel
  );

  // Pass ALL reference images to the model
  const result = await generateSingleImage(fullPrompt, referenceImageBuffers);
  return {
    perspectiveId: perspective.id,
    perspectiveName: perspective.name,
    ...result
  };
}

// Generate a single image with explicit separation of product images and composition reference
// This ensures the model understands which images are for jewelry design vs styling reference
async function generateSingleImageWithComposition(prompt, productImageBuffers, compositionImageBuffer = null) {
  return enqueueRequest(async () => {
    const model = initializeNanoBananaPro();

    const parts = [];
    const numProductImages = productImageBuffers ? productImageBuffers.length : 0;
    const hasComposition = !!compositionImageBuffer;

    // Add product reference images first
    if (productImageBuffers && productImageBuffers.length > 0) {
      for (let i = 0; i < productImageBuffers.length; i++) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: productImageBuffers[i].toString('base64')
          }
        });
      }
    }

    // Add composition reference image last (if available)
    if (compositionImageBuffer) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: compositionImageBuffer.toString('base64')
        }
      });
    }

    // Build instruction text that CLEARLY separates product images from composition reference
    let instructionText = '';
    if (hasComposition) {
      instructionText = `CRITICAL INSTRUCTIONS:
- The FIRST ${numProductImages} image(s) above are the PRODUCT IMAGES showing the actual jewelry piece. Copy EVERY detail of the jewelry design ONLY from these images.
- The LAST image is a COMPOSITION REFERENCE for styling ONLY. Use it ONLY for: camera angle, lighting, background, mood. DO NOT copy any jewelry design elements from it.
- The jewelry in the composition reference is a DIFFERENT piece - IGNORE its design completely.

${prompt}`;
    } else if (numProductImages > 0) {
      instructionText = `Using the ${numProductImages} jewelry image${numProductImages > 1 ? 's' : ''} above as exact reference for the jewelry design (showing the piece from ${numProductImages > 1 ? 'multiple angles' : 'one angle'}), ${prompt}`;
    } else {
      instructionText = prompt;
    }

    parts.push({ text: instructionText });

    try {
      const request = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['image'],
          candidateCount: 1,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        ]
      };

      console.log('Sending request to Nano Banana Pro (with composition separation)...');
      const startTime = Date.now();

      const response = await model.generateContent(request);
      const result = response.response;

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Image generated in ${duration}s`);

      // Extract generated image from response
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

      throw new Error('No image data in response');
    } catch (error) {
      console.error(`Image generation error:`, error.message);

      // Retry on rate limits
      if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
        console.log(`Retrying in ${RATE_LIMIT.retryDelay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay));
        return generateSingleImageWithComposition(prompt, productImageBuffers, compositionImageBuffer);
      }

      throw error;
    }
  });
}

// Generate images using composition prompts and master prompts (new system)
async function generateFromMasterPrompts(masterPrompts, referenceImageBuffers, compositionImageBuffers = {}) {
  const results = [];
  const perspectiveIds = Object.keys(masterPrompts);

  console.log(`\n=== Starting Master Prompt generation with Nano Banana Pro ===`);
  console.log(`Reference images: ${referenceImageBuffers.length}`);
  console.log(`Perspectives to generate: ${perspectiveIds.length}\n`);

  for (let i = 0; i < perspectiveIds.length; i++) {
    const perspectiveId = perspectiveIds[i];
    const masterPrompt = masterPrompts[perspectiveId];

    const hasCompositionRef = !!compositionImageBuffers[perspectiveId];
    console.log(`[${i + 1}/${perspectiveIds.length}] Generating: ${perspectiveId} (product images: ${referenceImageBuffers.length}, composition ref: ${hasCompositionRef})`);

    try {
      // Generate with explicit separation of product images and composition reference
      const result = await generateSingleImageWithComposition(
        masterPrompt,
        referenceImageBuffers,
        hasCompositionRef ? compositionImageBuffers[perspectiveId] : null
      );
      results.push({
        perspectiveId,
        perspectiveName: perspectiveId,
        imageNumber: i + 1,
        ...result
      });
      console.log(`✓ ${perspectiveId} completed`);
    } catch (error) {
      console.error(`✗ Failed to generate ${perspectiveId}:`, error.message);
      results.push({
        perspectiveId,
        perspectiveName: perspectiveId,
        imageNumber: i + 1,
        success: false,
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\n=== Generation complete: ${successCount}/${perspectiveIds.length} successful ===\n`);

  return results;
}

// Get available perspectives for a category
function getPerspectives(category) {
  const categoryPrompts = PROMPTS[category];
  if (!categoryPrompts) {
    return [];
  }

  return categoryPrompts.perspectives.map((p, index) => ({
    id: p.id,
    name: p.name,
    imageNumber: index + 1,
    requiresModel: p.requiresModel
  }));
}

// Get current queue status
function getQueueStatus() {
  return {
    activeRequests,
    queuedRequests: requestQueue.length,
    maxConcurrent: RATE_LIMIT.maxConcurrent
  };
}

module.exports = {
  generateSingleImage,
  generateAllPerspectives,
  generateFromMasterPrompts,
  regenerateImage,
  getPerspectives,
  getQueueStatus,
  RATE_LIMIT
};
