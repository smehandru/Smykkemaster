const aiplatform = require('@google-cloud/aiplatform');
const { PredictionServiceClient } = aiplatform.v1;
const { helpers } = aiplatform;
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

// Initialize Prediction Service Client for Imagen 4
let predictionClient = null;

function initializePredictionClient() {
  if (!predictionClient) {
    setupCredentials();
    predictionClient = new PredictionServiceClient({
      apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`
    });
  }
  return predictionClient;
}

// Generate a single image with Imagen 4
async function generateSingleImage(prompt, referenceImageBuffer, retries = RATE_LIMIT.maxRetries) {
  return enqueueRequest(async () => {
    const client = initializePredictionClient();

    // Imagen 4 model endpoint
    const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-002`;

    try {
      console.log('Sending request to Imagen 4...');
      const startTime = Date.now();

      // Build the request for Imagen 4
      const instanceValue = {
        prompt: prompt
      };

      // Add reference image if provided (for image-to-image)
      if (referenceImageBuffer) {
        instanceValue.image = {
          bytesBase64Encoded: referenceImageBuffer.toString('base64')
        };
      }

      const instance = helpers.toValue(instanceValue);

      const parameters = helpers.toValue({
        sampleCount: 1,
        aspectRatio: '1:1',
        safetyFilterLevel: 'block_few',
        personGeneration: 'allow_adult',
        outputOptions: {
          mimeType: 'image/jpeg',
          compressionQuality: 95
        }
      });

      const request = {
        endpoint,
        instances: [instance],
        parameters
      };

      const [response] = await client.predict(request);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Image generated in ${duration}s`);

      // Extract generated image from response
      if (response.predictions && response.predictions.length > 0) {
        const prediction = response.predictions[0];
        const structValue = prediction.structValue;

        if (structValue && structValue.fields && structValue.fields.bytesBase64Encoded) {
          const imageBase64 = structValue.fields.bytesBase64Encoded.stringValue;
          return {
            success: true,
            imageBuffer: Buffer.from(imageBase64, 'base64'),
            mimeType: 'image/jpeg',
            generationTime: duration
          };
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

  // Use the first/best reference image for all generations
  const referenceBuffer = referenceImageBuffers[0];

  console.log(`\n=== Starting Imagen 4 generation for ${categoryPrompts.name} ===`);
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
      const result = await generateSingleImage(fullPrompt, referenceBuffer);
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
async function regenerateImage(visualDescriptor, category, ethnicity, perspectiveId, referenceImageBuffer, customPrompt = null) {
  const categoryPrompts = PROMPTS[category];
  if (!categoryPrompts) {
    throw new Error(`Unknown category: ${category}`);
  }

  const perspective = categoryPrompts.perspectives.find(p => p.id === perspectiveId);
  if (!perspective) {
    throw new Error(`Unknown perspective: ${perspectiveId}`);
  }

  console.log(`Regenerating: ${perspective.name}${customPrompt ? ' (with custom prompt)' : ''}`);

  // Use custom prompt if provided, otherwise build default
  const fullPrompt = customPrompt || buildFullPrompt(
    visualDescriptor,
    perspective.prompt,
    ethnicity,
    perspective.requiresModel
  );

  const result = await generateSingleImage(fullPrompt, referenceImageBuffer);
  return {
    perspectiveId: perspective.id,
    perspectiveName: perspective.name,
    ...result
  };
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
  regenerateImage,
  getPerspectives,
  getQueueStatus,
  RATE_LIMIT
};
