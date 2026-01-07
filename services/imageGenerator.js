const { VertexAI } = require('@google-cloud/vertexai');
const path = require('path');
const { buildFullPrompt, PROMPTS } = require('../config/prompts');

// Set credentials path
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '..', 'service-account.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'project-bcb47e5a-1886-41ee-a91';
const LOCATION = 'us-central1'; // Image generation may need different region

// Rate limiting configuration for hobby use
const RATE_LIMIT = {
  maxConcurrent: 2,        // Max 2 concurrent image generations
  delayBetweenRequests: 2000, // 2 second delay between requests
  maxRetries: 3,
  retryDelay: 5000
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
    // Delay before processing next request
    setTimeout(() => processQueue(), RATE_LIMIT.delayBetweenRequests);
  }
}

// Initialize Vertex AI for image generation
let vertexAI = null;
let imageModel = null;

function initializeImageModel() {
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION
    });

    // Use Gemini 2.0 Flash for image generation (supports image output)
    // Note: For production, you might want to use imagen-3.0-generate-002 or similar
    imageModel = vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseModalities: ['image', 'text'],
        responseMimeType: 'image/jpeg'
      }
    });
  }
  return imageModel;
}

// Alternative: Use Imagen 3 for higher quality
async function getImagenModel() {
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION
    });
  }

  // Imagen 3 model for high-quality image generation
  return vertexAI.preview.getGenerativeModel({
    model: 'imagen-3.0-generate-002'
  });
}

// Generate a single image with retry logic
async function generateSingleImage(prompt, referenceImageBuffer, retries = RATE_LIMIT.maxRetries) {
  return enqueueRequest(async () => {
    const model = initializeImageModel();

    const parts = [];

    // Add reference image if provided
    if (referenceImageBuffer) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: referenceImageBuffer.toString('base64')
        }
      });
    }

    // Add the prompt
    parts.push({ text: prompt });

    try {
      const request = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['image'],
          numberOfImages: 1
        }
      };

      const response = await model.generateContent(request);
      const result = response.response;

      // Extract generated image from response
      if (result.candidates && result.candidates[0]) {
        const candidate = result.candidates[0];
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              return {
                success: true,
                imageBuffer: Buffer.from(part.inlineData.data, 'base64'),
                mimeType: part.inlineData.mimeType || 'image/jpeg'
              };
            }
          }
        }
      }

      throw new Error('No image data in response');
    } catch (error) {
      console.error(`Image generation error (retries left: ${retries}):`, error.message);

      if (retries > 0 && (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED'))) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay));
        return generateSingleImage(prompt, referenceImageBuffer, retries - 1);
      }

      throw error;
    }
  });
}

// Generate all perspective images for a jewelry piece
async function generateAllPerspectives(visualDescriptor, category, ethnicity, referenceImageBuffers) {
  const categoryPrompts = PROMPTS[category];
  if (!categoryPrompts) {
    throw new Error(`Unknown category: ${category}`);
  }

  const results = [];
  const perspectives = categoryPrompts.perspectives;

  // Use the first reference image for all generations
  const referenceBuffer = referenceImageBuffers[0];

  for (let i = 0; i < perspectives.length; i++) {
    const perspective = perspectives[i];
    const fullPrompt = buildFullPrompt(
      visualDescriptor,
      perspective.prompt,
      ethnicity,
      perspective.requiresModel
    );

    console.log(`Generating image ${i + 1}/${perspectives.length}: ${perspective.name}`);

    try {
      const result = await generateSingleImage(fullPrompt, referenceBuffer);
      results.push({
        perspectiveId: perspective.id,
        perspectiveName: perspective.name,
        imageNumber: i + 1,
        ...result
      });
    } catch (error) {
      console.error(`Failed to generate ${perspective.name}:`, error.message);
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
async function regenerateImage(visualDescriptor, category, ethnicity, perspectiveId, referenceImageBuffer) {
  const categoryPrompts = PROMPTS[category];
  if (!categoryPrompts) {
    throw new Error(`Unknown category: ${category}`);
  }

  const perspective = categoryPrompts.perspectives.find(p => p.id === perspectiveId);
  if (!perspective) {
    throw new Error(`Unknown perspective: ${perspectiveId}`);
  }

  const fullPrompt = buildFullPrompt(
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

module.exports = {
  generateSingleImage,
  generateAllPerspectives,
  regenerateImage,
  getPerspectives,
  RATE_LIMIT
};
