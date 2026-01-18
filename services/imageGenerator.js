const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');
const { buildFullPrompt, PROMPTS } = require('../config/prompts');

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'project-bcb47e5a-1886-41ee-a91';
const LOCATION = 'us-central1';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// Categories that should use gemini-2.0-flash-exp instead of gemini-3-pro-image-preview
// Note: gemini-2.0-flash-001 is text-only, gemini-2.0-flash-exp supports image generation
const FLASH_MODEL_CATEGORIES = ['ring', 'anheng', 'oredobber'];

// Determine which model to use based on category
function getModelForCategory(category) {
  if (FLASH_MODEL_CATEGORIES.includes(category)) {
    return 'gemini-2.0-flash-exp';
  }
  return 'gemini-3-pro-image-preview';
}

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

// Initialize AI for Image Generation
let vertexAI = null;
let genAI = null;
let useApiKey = false;

function initializeNanoBananaPro() {
  if (!genAI && !vertexAI) {
    // Prefer API key for gemini-3-pro-image-preview
    if (GEMINI_API_KEY) {
      console.log('Initializing gemini-3-pro-image-preview with API key');
      genAI = new GoogleGenAI({
        apiKey: GEMINI_API_KEY
      });
      useApiKey = true;
    } else {
      // Fallback to Vertex AI with service account
      console.log('Initializing gemini-3-pro-image-preview with Vertex AI (service account)');
      setupCredentials();
      vertexAI = new VertexAI({
        project: PROJECT_ID,
        location: LOCATION
      });
      useApiKey = false;
    }
  }
  return { genAI, vertexAI, useApiKey };
}

// Generate a single image with Nano Banana Pro
async function generateSingleImage(prompt, referenceImageBuffers, category = null, retries = RATE_LIMIT.maxRetries) {
  return enqueueRequest(async () => {
    const { genAI: apiClient, vertexAI: vertexClient, useApiKey: isUsingApiKey } = initializeNanoBananaPro();

    // Determine which model to use based on category
    const selectedModel = category ? getModelForCategory(category) : 'gemini-3-pro-image-preview';

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
      console.log('Sending request to image generation model...');
      console.log('Category:', category);
      console.log('Selected model:', selectedModel);
      console.log('Using API Key:', isUsingApiKey);
      console.log('apiClient:', !!apiClient);
      console.log('vertexClient:', !!vertexClient);
      const startTime = Date.now();

      // Determine responseModalities based on model
      const responseModalities = selectedModel === 'gemini-2.0-flash-exp'
        ? ['image', 'text']
        : ['image'];

      let response;
      if (isUsingApiKey) {
        // API Key approach (GoogleGenAI)
        console.log('Calling apiClient.models.generateContent...');
        response = await apiClient.models.generateContent({
          model: selectedModel,
          contents: parts,
          generationConfig: {
            responseModalities,
            candidateCount: 1,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          ]
        });
      } else {
        // Vertex AI approach (service account)
        console.log('Getting model from vertexClient...');
        console.log('vertexClient type:', typeof vertexClient);
        console.log('vertexClient.getGenerativeModel:', typeof vertexClient?.getGenerativeModel);

        let modelName = selectedModel;
        let model;

        try {
          model = vertexClient.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseModalities,
            }
          });
          console.log('Model obtained:', !!model);
          console.log('model.generateContent:', typeof model?.generateContent);
        } catch (modelError) {
          console.warn(`Failed to get ${modelName}, falling back to gemini-2.0-flash-exp:`, modelError.message);
          modelName = 'gemini-2.0-flash-exp';
          model = vertexClient.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseModalities: ['image', 'text'],
            }
          });
        }

        const request = {
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities,
            candidateCount: 1,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          ]
        };

        console.log(`Calling model.generateContent on ${modelName}...`);

        // Safety check
        if (!model || typeof model.generateContent !== 'function') {
          throw new Error(`Model object is invalid. model: ${!!model}, generateContent type: ${typeof model?.generateContent}`);
        }

        response = await model.generateContent(request);
      }

      // Handle response based on API type
      const result = isUsingApiKey ? response : response.response;

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
        return generateSingleImage(prompt, referenceImageBuffers, category, retries - 1);
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

// Generate a single image with product images and composition prompt (text only, no composition image)
// Composition guidance is provided through text instructions only
async function generateSingleImageWithComposition(prompt, productImageBuffers, compositionImageBuffer = null, category = null) {
  return enqueueRequest(async () => {
    const { genAI: apiClient, vertexAI: vertexClient, useApiKey: isUsingApiKey } = initializeNanoBananaPro();

    // Determine which model to use based on category
    const selectedModel = category ? getModelForCategory(category) : 'gemini-3-pro-image-preview';

    const parts = [];
    const numProductImages = productImageBuffers ? productImageBuffers.length : 0;

    // Add product reference images
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

    // NOTE: Composition reference image is NOT sent - only the text prompt for composition/styling

    // Build instruction text using product images as reference
    let instructionText = '';
    if (numProductImages > 0) {
      instructionText = `Using images 1-${numProductImages} in this message as exact reference for the jewelry design (showing the piece from ${numProductImages > 1 ? 'multiple angles' : 'one angle'}), ${prompt}`;
    } else {
      instructionText = prompt;
    }

    parts.push({ text: instructionText });

    try {
      console.log('Sending request to image generation model (composition via text only)...');
      console.log('Category:', category);
      console.log('Selected model:', selectedModel);
      console.log('Using API Key:', isUsingApiKey);
      const startTime = Date.now();

      // Determine responseModalities based on model
      const responseModalities = selectedModel === 'gemini-2.0-flash-exp'
        ? ['image', 'text']
        : ['image'];

      let response;
      if (isUsingApiKey) {
        // API Key approach (GoogleGenAI)
        response = await apiClient.models.generateContent({
          model: selectedModel,
          contents: parts,
          generationConfig: {
            responseModalities,
            candidateCount: 1,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          ]
        });
      } else {
        // Vertex AI approach (service account)
        let modelName = selectedModel;
        let model;

        try {
          model = vertexClient.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseModalities,
            }
          });
        } catch (modelError) {
          console.warn(`Failed to get ${modelName}, falling back to gemini-2.0-flash-exp:`, modelError.message);
          modelName = 'gemini-2.0-flash-exp';
          model = vertexClient.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseModalities: ['image', 'text'],
            }
          });
        }

        // Safety check
        if (!model || typeof model.generateContent !== 'function') {
          throw new Error(`Model object is invalid. model: ${!!model}, generateContent type: ${typeof model?.generateContent}`);
        }

        const request = {
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities,
            candidateCount: 1,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          ]
        };

        response = await model.generateContent(request);
      }

      // Handle response based on API type
      const result = isUsingApiKey ? response : response.response;

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
        return generateSingleImageWithComposition(prompt, productImageBuffers, compositionImageBuffer, category);
      }

      throw error;
    }
  });
}

// Generate images directly using composition system (simplified - no Gemini master prompt step)
// Sends: product images + composition image + combined instructions directly to Nano Banana Pro
async function generateDirectFromComposition(perspectives, visualDescriptor, referenceImageBuffers, compositionImageBuffers = {}) {
  const results = [];

  console.log(`\n=== Starting DIRECT generation with Nano Banana Pro (simplified workflow) ===`);
  console.log(`Product images: ${referenceImageBuffers.length}`);
  console.log(`Visual descriptor: ${visualDescriptor.substring(0, 100)}...`);
  console.log(`Perspectives to generate: ${perspectives.length}\n`);

  for (let i = 0; i < perspectives.length; i++) {
    const perspective = perspectives[i];
    const perspectiveId = perspective.id;
    const compositionPrompt = perspective.prompt;

    console.log(`[${i + 1}/${perspectives.length}] Generating: ${perspectiveId} (composition via text prompt)`);

    // Build combined prompt directly for Nano Banana Pro
    const combinedPrompt = buildCombinedPrompt(visualDescriptor, compositionPrompt, referenceImageBuffers.length, false);

    try {
      const result = await generateSingleImageWithComposition(
        combinedPrompt,
        referenceImageBuffers,
        null  // Composition image is NOT sent - only text prompt
      );
      results.push({
        perspectiveId,
        perspectiveName: perspective.name || perspectiveId,
        imageNumber: i + 1,
        ...result
      });
      console.log(`✓ ${perspectiveId} completed`);
    } catch (error) {
      console.error(`✗ Failed to generate ${perspectiveId}:`, error.message);
      results.push({
        perspectiveId,
        perspectiveName: perspective.name || perspectiveId,
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

// Build combined prompt for direct generation (no Gemini step)
// Composition is provided via text instructions only (no composition image sent)
function buildCombinedPrompt(visualDescriptor, compositionPrompt, numProductImages, hasComposition) {
  return `Generate an ultra high-definition 2K luxury jewelry editorial photograph.

=== JEWELRY DESIGN (from product images 1-${numProductImages}) ===
${visualDescriptor}

CRITICAL: Copy EVERY detail of the jewelry EXACTLY from the product images - shape, texture, finish, patterns, stones, metalwork. The jewelry design must match the product images 100%.

=== COMPOSITION & STYLING ===
${compositionPrompt}

Follow the composition and styling instructions above for:
- Camera angle and framing
- Lighting setup and direction
- Background and environment
- Overall mood and atmosphere

=== REQUIREMENTS ===
- 2K resolution, photorealistic quality
- No CGI look, no artificial appearance
- No text, logos, or watermarks
- Professional luxury jewelry photography
- Jewelry must match product images exactly`;
}

// Build the EXACT final prompt that gets sent to Nano Banana Pro
// This includes the wrapper added by generateSingleImageWithComposition()
function buildExactPromptSentToNanoBananaPro(visualDescriptor, compositionPrompt, numProductImages) {
  const combinedPrompt = buildCombinedPrompt(visualDescriptor, compositionPrompt, numProductImages, false);

  // Add the wrapper that generateSingleImageWithComposition() adds at line 300
  if (numProductImages > 0) {
    return `Using images 1-${numProductImages} in this message as exact reference for the jewelry design (showing the piece from ${numProductImages > 1 ? 'multiple angles' : 'one angle'}), ${combinedPrompt}`;
  } else {
    return combinedPrompt;
  }
}

// Generate images using composition prompts and master prompts (new system)
async function generateFromMasterPrompts(masterPrompts, referenceImageBuffers, compositionImageBuffers = {}, category = null) {
  const results = [];
  const perspectiveIds = Object.keys(masterPrompts);

  console.log(`\n=== Starting Master Prompt generation ===`);
  console.log(`Reference images: ${referenceImageBuffers.length}`);
  console.log(`Category: ${category}`);
  console.log(`Perspectives to generate: ${perspectiveIds.length}\n`);

  for (let i = 0; i < perspectiveIds.length; i++) {
    const perspectiveId = perspectiveIds[i];
    const masterPrompt = masterPrompts[perspectiveId];

    console.log(`[${i + 1}/${perspectiveIds.length}] Generating: ${perspectiveId} (product images: ${referenceImageBuffers.length}, composition via text)`);

    try {
      // Generate with product images only (composition via text prompt)
      const result = await generateSingleImageWithComposition(
        masterPrompt,
        referenceImageBuffers,
        null,  // Composition image is NOT sent
        category  // Pass category for model selection
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

// Regenerate a single image using the new composition-based system
async function regenerateSingleImage(masterPrompt, productImageBuffers, compositionImageBuffer = null, category = null) {
  console.log(`Regenerating single image with composition-based system`);
  console.log(`  Product images: ${productImageBuffers ? productImageBuffers.length : 0}`);
  console.log(`  Category: ${category}`);
  console.log(`  Composition: via text prompt only (no image sent)`);

  const result = await generateSingleImageWithComposition(
    masterPrompt,
    productImageBuffers,
    null,  // Composition image is NOT sent
    category  // Pass category for model selection
  );

  return result;
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
