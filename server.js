require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Services
const googleDrive = require('./services/googleDrive');
const googleSheets = require('./services/googleSheets');
const gemini = require('./services/gemini');
const imageGenerator = require('./services/imageGenerator');
const { PROMPTS } = require('./config/prompts');

// Helper function to load composition reference image from disk
async function loadCompositionImage(category, imageFile) {
  try {
    const imagePath = path.join(__dirname, 'public', 'references', category, imageFile);
    if (fs.existsSync(imagePath)) {
      return fs.readFileSync(imagePath);
    }
    console.warn(`Composition image not found: ${imagePath}`);
    return null;
  } catch (error) {
    console.error(`Error loading composition image: ${error.message}`);
    return null;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'smykke-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20 // Max 20 files per request
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Authentication middleware - DISABLED (no password required)
// const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SmykkeMester2026';

function requireAuth(req, res, next) {
  // Authentication disabled - allow all requests
  return next();
}

// In-memory session storage for active processing sessions
const activeSessions = new Map();

// =============================================================================
// AUTH ROUTES
// =============================================================================

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true, message: 'Logged in successfully' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out' });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: req.session && req.session.authenticated === true });
});

// =============================================================================
// SESSION ROUTES
// =============================================================================

app.post('/api/session/new', requireAuth, (req, res) => {
  const sessionId = uuidv4();
  activeSessions.set(sessionId, {
    id: sessionId,
    createdAt: new Date(),
    status: 'pending',
    category: null,
    ethnicity: null,
    rawImages: [],
    tagInfo: null,
    visualDescriptor: null,
    productDescription: null,
    generatedImages: [],
    driveLinks: {
      raw: null,
      final: null
    }
  });

  res.json({ success: true, sessionId });
});

app.get('/api/session/:sessionId', requireAuth, (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

app.delete('/api/session/:sessionId', requireAuth, (req, res) => {
  activeSessions.delete(req.params.sessionId);
  res.json({ success: true });
});

// =============================================================================
// UPLOAD & ANALYSIS ROUTES
// =============================================================================

app.post('/api/upload', requireAuth, upload.array('images', 20), async (req, res) => {
  try {
    const { sessionId, category } = req.body;

    if (!sessionId || !category) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, category' });
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Update session
    session.category = category;
    session.status = 'analyzing';
    session.rawImages = req.files.map(f => ({
      originalName: f.originalname,
      buffer: f.buffer,
      mimeType: f.mimetype,
      size: f.size
    }));

    res.json({
      success: true,
      message: 'Images uploaded, starting analysis...',
      imageCount: req.files.length
    });

    // Start analysis in background
    analyzeImages(session).catch(err => {
      console.error('Analysis error:', err);
      session.status = 'error';
      session.error = err.message;
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Background analysis function
async function analyzeImages(session) {
  try {
    const imageBuffers = session.rawImages.map(img => img.buffer);

    // Analyze with Gemini
    console.log(`Analyzing ${imageBuffers.length} images for session ${session.id}`);
    const analysis = await gemini.analyzeJewelryImages(imageBuffers, session.category);

    console.log('Tag extraction result:', JSON.stringify(analysis.tagInfo, null, 2));
    console.log('Visual descriptor:', analysis.visualDescriptor);

    session.tagInfo = analysis.tagInfo;
    session.visualDescriptor = analysis.visualDescriptor;
    session.productDescription = analysis.productDescription;
    session.status = 'analyzed';

    console.log(`Analysis complete for session ${session.id}`);
  } catch (error) {
    console.error('Analysis failed:', error);
    session.status = 'error';
    session.error = error.message;
  }
}

// Get analysis results
app.get('/api/analysis/:sessionId', requireAuth, (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    status: session.status,
    tagInfo: session.tagInfo,
    visualDescriptor: session.visualDescriptor,
    productDescription: session.productDescription,
    error: session.error
  });
});

// Update analysis (user corrections)
app.put('/api/analysis/:sessionId', requireAuth, (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { tagInfo, productDescription } = req.body;

  if (tagInfo) {
    session.tagInfo = { ...session.tagInfo, ...tagInfo };
  }
  if (productDescription) {
    session.productDescription = { ...session.productDescription, ...productDescription };
  }

  res.json({ success: true, session });
});

// =============================================================================
// IMAGE GENERATION ROUTES
// =============================================================================

// Stream generation progress with Server-Sent Events
app.get('/api/generate-stream/:sessionId', requireAuth, async (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status !== 'analyzed' && session.status !== 'generated') {
    return res.status(400).json({ error: 'Analysis not complete' });
  }

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Store custom prompts and selected perspectives from query params
    const customPromptsJson = req.query.customPrompts;
    const selectedPerspectivesJson = req.query.selectedPerspectives;

    const customPrompts = customPromptsJson ? JSON.parse(customPromptsJson) : {};
    const selectedPerspectives = selectedPerspectivesJson ? JSON.parse(selectedPerspectivesJson) : [];

    if (customPrompts && Object.keys(customPrompts).length > 0) {
      session.masterPrompts = customPrompts;
    }

    session.selectedPerspectives = selectedPerspectives;
    session.customPrompts = customPrompts;
    session.status = 'generating';
    session.generatedImages = [];

    sendEvent('start', { message: 'Starting image generation...' });

    // Generate images with progressive callbacks
    await generateImagesStreaming(session, sendEvent);

    sendEvent('complete', {
      message: 'All images generated',
      totalImages: session.generatedImages.length,
      successCount: session.generatedImages.filter(i => i.success).length
    });

    res.end();
  } catch (error) {
    console.error('Streaming generation error:', error);
    sendEvent('error', { message: error.message });
    res.end();
  }
});

app.post('/api/generate/:sessionId', requireAuth, async (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status !== 'analyzed' && session.status !== 'generated') {
    return res.status(400).json({ error: 'Analysis not complete' });
  }

  // Store custom prompts and selected perspectives from request
  const { customPrompts, selectedPerspectives } = req.body || {};

  console.log('=== GENERATE REQUEST DEBUG ===');
  console.log('Received customPrompts keys:', customPrompts ? Object.keys(customPrompts) : 'none');
  console.log('Received selectedPerspectives:', selectedPerspectives);

  // If custom prompts provided, use them as master prompts
  if (customPrompts && Object.keys(customPrompts).length > 0) {
    session.masterPrompts = customPrompts;
    console.log('Using filtered prompts for generation');
  }

  // Store selected perspectives
  session.selectedPerspectives = selectedPerspectives || [];
  session.customPrompts = customPrompts || {};
  session.status = 'generating';
  session.generatedImages = [];

  console.log('Stored in session.selectedPerspectives:', session.selectedPerspectives);

  // Get perspectives from composition config or legacy prompts
  const { getPerspectivesForCategory } = require('./config/compositionPrompts');
  const compositionPerspectives = getPerspectivesForCategory(session.category);
  const legacyPerspectives = imageGenerator.getPerspectives(session.category);

  res.json({
    success: true,
    message: 'Starting image generation...',
    perspectives: compositionPerspectives.length > 0 ? compositionPerspectives : legacyPerspectives
  });

  // Start generation in background
  generateImages(session).catch(err => {
    console.error('Generation error:', err);
    session.status = 'error';
    session.error = err.message;
  });
});

// Streaming generation function - sends images as they're completed
async function generateImagesStreaming(session, sendEvent) {
  try {
    const referenceBuffers = session.rawImages.map(img => img.buffer);
    console.log(`Starting STREAMING image generation for session ${session.id}`);

    // Load composition perspectives for this category
    const { getPerspectivesForCategory } = require('./config/compositionPrompts');
    const allPerspectives = getPerspectivesForCategory(session.category);

    if (!allPerspectives || allPerspectives.length === 0) {
      throw new Error(`No composition perspectives found for category: ${session.category}`);
    }

    // Filter to only selected perspectives if specified
    let perspectives = allPerspectives;
    if (session.selectedPerspectives && session.selectedPerspectives.length > 0) {
      perspectives = allPerspectives.filter(p => session.selectedPerspectives.includes(p.id));
      console.log(`Filtered to ${perspectives.length} selected perspectives`);
    }

    if (perspectives.length === 0) {
      throw new Error('No perspectives to generate (selection is empty)');
    }

    const visualDescriptor = session.visualDescriptor || 'A beautiful 22 karat gold jewelry piece';

    sendEvent('progress', {
      phase: 'master-prompts',
      message: `Generating ${perspectives.length} master prompts...`,
      total: perspectives.length
    });

    // STEP 1: Generate master prompts using Gemini 3 Pro (parallel)
    const promptPromises = perspectives.map(async (p) => {
      const masterPrompt = await gemini.generateMasterPrompt(
        visualDescriptor,
        p.prompt,
        session.category,
        referenceBuffers,
        null
      );
      return { id: p.id, prompt: masterPrompt, name: p.name };
    });

    const masterPromptResults = await Promise.all(promptPromises);

    const masterPrompts = {};
    masterPromptResults.forEach(r => {
      masterPrompts[r.id] = r.prompt;
    });

    session.masterPrompts = masterPrompts;

    sendEvent('progress', {
      phase: 'images',
      message: 'Master prompts complete. Starting image generation...',
      total: perspectives.length
    });

    // STEP 2: Generate images ONE AT A TIME and stream each result
    const perspectiveIds = Object.keys(masterPrompts);
    for (let i = 0; i < perspectiveIds.length; i++) {
      const perspectiveId = perspectiveIds[i];
      const masterPrompt = masterPrompts[perspectiveId];

      sendEvent('image-start', {
        perspectiveId,
        imageNumber: i + 1,
        total: perspectiveIds.length,
        message: `Generating image ${i + 1}/${perspectiveIds.length}: ${perspectiveId}...`
      });

      try {
        const result = await imageGenerator.regenerateSingleImage(
          masterPrompt,
          referenceBuffers,
          null,
          session.category
        );

        const imageData = {
          perspectiveId,
          perspectiveName: perspectiveId,
          imageNumber: i + 1,
          success: result.success,
          imageBase64: result.success ? result.imageBuffer.toString('base64') : null,
          imageBuffer: result.success ? result.imageBuffer : null,
          error: result.error
        };

        session.generatedImages.push(imageData);

        // Send image immediately to client
        sendEvent('image-complete', {
          perspectiveId,
          perspectiveName: perspectiveId,
          imageNumber: i + 1,
          success: result.success,
          imageBase64: result.success ? result.imageBuffer.toString('base64') : null,
          error: result.error,
          progress: Math.round(((i + 1) / perspectiveIds.length) * 100)
        });

      } catch (error) {
        console.error(`Failed to generate ${perspectiveId}:`, error.message);

        const errorData = {
          perspectiveId,
          perspectiveName: perspectiveId,
          imageNumber: i + 1,
          success: false,
          error: error.message
        };

        session.generatedImages.push(errorData);

        sendEvent('image-error', {
          perspectiveId,
          imageNumber: i + 1,
          error: error.message
        });
      }
    }

    session.status = 'generated';
    console.log(`Streaming generation complete for session ${session.id}`);
  } catch (error) {
    console.error('Streaming generation failed:', error);
    session.status = 'error';
    session.error = error.message;
    throw error;
  }
}

// Background generation function - TWO-STEP WORKFLOW:
// Step 1: Gemini 3 Pro creates master rendering prompts
// Step 2: Nano Banana Pro generates images using master prompts
async function generateImages(session) {
  try {
    const referenceBuffers = session.rawImages.map(img => img.buffer);
    console.log(`Starting TWO-STEP image generation for session ${session.id}`);

    // Load composition perspectives for this category
    const { getPerspectivesForCategory } = require('./config/compositionPrompts');
    const allPerspectives = getPerspectivesForCategory(session.category);

    if (!allPerspectives || allPerspectives.length === 0) {
      throw new Error(`No composition perspectives found for category: ${session.category}`);
    }

    // Filter to only selected perspectives if specified
    let perspectives = allPerspectives;
    console.log('=== PERSPECTIVE FILTERING DEBUG ===');
    console.log('session.selectedPerspectives:', session.selectedPerspectives);
    console.log('allPerspectives count:', allPerspectives.length);
    console.log('allPerspectives IDs:', allPerspectives.map(p => p.id));

    if (session.selectedPerspectives && session.selectedPerspectives.length > 0) {
      perspectives = allPerspectives.filter(p => session.selectedPerspectives.includes(p.id));
      console.log(`Filtered to ${perspectives.length} selected perspectives (out of ${allPerspectives.length} total)`);
      console.log('Filtered perspective IDs:', perspectives.map(p => p.id));
    } else {
      console.log(`No perspectives selected - generating all ${perspectives.length} perspectives`);
    }

    if (perspectives.length === 0) {
      throw new Error('No perspectives to generate (selection is empty)');
    }

    const visualDescriptor = session.visualDescriptor || 'A beautiful 22 karat gold jewelry piece';

    console.log(`\n=== STEP 1: Generating master prompts with Gemini 3 Pro ===`);
    console.log(`Visual descriptor: ${visualDescriptor.substring(0, 80)}...`);
    console.log(`Creating ${perspectives.length} master prompts...`);

    // STEP 1: Generate master prompts using Gemini 3 Pro (parallel processing)
    const promptPromises = perspectives.map(async (p) => {
      console.log(`  Generating master prompt for ${p.id}...`);
      const masterPrompt = await gemini.generateMasterPrompt(
        visualDescriptor,
        p.prompt,
        session.category,
        referenceBuffers,
        null  // Composition image is NOT sent - only text prompt
      );
      console.log(`  ✓ Master prompt for ${p.id} complete`);
      return { id: p.id, prompt: masterPrompt, name: p.name };
    });

    const masterPromptResults = await Promise.all(promptPromises);

    // Build master prompts object
    const masterPrompts = {};
    masterPromptResults.forEach(r => {
      masterPrompts[r.id] = r.prompt;
    });

    // Cache master prompts in session for Advanced modal
    session.masterPrompts = masterPrompts;

    console.log(`\n=== STEP 2: Generating images with image generation model ===`);
    console.log(`Using ${Object.keys(masterPrompts).length} master prompts`);
    console.log(`Category: ${session.category}`);

    // STEP 2: Generate images using master prompts with appropriate model based on category
    const results = await imageGenerator.generateFromMasterPrompts(
      masterPrompts,
      referenceBuffers,
      {},  // No composition image buffers needed
      session.category  // Pass category for model selection
    );

    // Store results (temporarily in memory, not yet uploaded to Drive)
    session.generatedImages = results.map(r => ({
      ...r,
      imageBase64: r.success ? r.imageBuffer.toString('base64') : null,
      imageBuffer: r.success ? r.imageBuffer : null
    }));

    session.status = 'generated';
    console.log(`Generation complete for session ${session.id}`);
  } catch (error) {
    console.error('Generation failed:', error);
    session.status = 'error';
    session.error = error.message;
  }
}

// Get generated images
app.get('/api/generated/:sessionId', requireAuth, (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Return images without the buffer (just base64 for display)
  const images = session.generatedImages.map(img => ({
    perspectiveId: img.perspectiveId,
    perspectiveName: img.perspectiveName,
    imageNumber: img.imageNumber,
    success: img.success,
    error: img.error,
    imageBase64: img.imageBase64,
    driveLink: img.driveLink
  }));

  res.json({
    status: session.status,
    images,
    error: session.error
  });
});

// Regenerate specific image - TWO-STEP: Gemini 3 Pro → Nano Banana Pro
app.post('/api/regenerate/:sessionId/:perspectiveId', requireAuth, async (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { perspectiveId } = req.params;
  const { customPrompt } = req.body;

  try {
    // Use ALL reference images for regeneration
    const referenceBuffers = session.rawImages.map(img => img.buffer);

    // Load composition perspective info
    const { getPerspectivesForCategory } = require('./config/compositionPrompts');
    const perspectives = getPerspectivesForCategory(session.category);
    const perspective = perspectives.find(p => p.id === perspectiveId);

    if (!perspective) {
      throw new Error(`Unknown perspective: ${perspectiveId}`);
    }

    const visualDescriptor = session.visualDescriptor || 'A beautiful 22 karat gold jewelry piece';

    // STEP 1: Generate master prompt with Gemini 3 Pro (unless custom prompt provided)
    let masterPrompt;
    if (customPrompt) {
      masterPrompt = customPrompt;
      console.log(`Regenerating ${perspectiveId} with custom prompt`);
    } else {
      console.log(`Regenerating ${perspectiveId} - generating master prompt with Gemini 3 Pro`);
      masterPrompt = await gemini.generateMasterPrompt(
        visualDescriptor,
        perspective.prompt,
        session.category,
        referenceBuffers,
        null  // Composition image is NOT sent - only text prompt
      );
    }

    // STEP 2: Generate image using master prompt with appropriate model based on category
    const result = await imageGenerator.regenerateSingleImage(
      masterPrompt,
      referenceBuffers,
      null,  // No composition image
      session.category  // Pass category for model selection
    );

    // Update the specific image in session
    const imageIndex = session.generatedImages.findIndex(
      img => img.perspectiveId === perspectiveId
    );

    if (imageIndex >= 0) {
      session.generatedImages[imageIndex] = {
        perspectiveId,
        perspectiveName: perspective.name || perspectiveId,
        imageNumber: session.generatedImages[imageIndex].imageNumber,
        success: result.success,
        imageBase64: result.success ? result.imageBuffer.toString('base64') : null,
        imageBuffer: result.success ? result.imageBuffer : null,
        error: result.error
      };
    }

    res.json({
      success: true,
      image: {
        perspectiveId,
        perspectiveName: perspective.name || perspectiveId,
        success: result.success,
        imageBase64: result.success ? result.imageBuffer.toString('base64') : null,
        error: result.error
      }
    });
  } catch (error) {
    console.error('Regeneration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// SAVE & FINALIZE ROUTES
// =============================================================================

// Check if product exists in Google Drive
app.get('/api/check-drive-exists/:productId', requireAuth, async (req, res) => {
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    const result = await googleDrive.checkProductExists(productId);
    res.json(result);
  } catch (error) {
    console.error('Error checking Drive existence:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/save/:sessionId', requireAuth, async (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!session.tagInfo || !session.tagInfo.productId) {
    return res.status(400).json({ error: 'Product ID not found' });
  }

  try {
    session.status = 'saving';
    const productId = session.tagInfo.productId;

    // Check for duplicate
    const isDuplicate = await googleSheets.checkDuplicateProductId(productId);
    if (isDuplicate) {
      return res.status(409).json({
        error: 'DUPLICATE_ID',
        message: `Product ID ${productId} already exists in the sheet`
      });
    }

    // Initialize Drive folders
    await googleDrive.initializeFolders();

    // Upload raw images to Drive
    console.log(`Uploading ${session.rawImages.length} raw images for ${productId}`);
    const rawUploads = [];
    for (let i = 0; i < session.rawImages.length; i++) {
      const img = session.rawImages[i];
      const result = await googleDrive.uploadRawImage(
        img.buffer,
        productId,
        i + 1,
        img.mimeType
      );
      rawUploads.push(result);
    }

    // Upload generated images to Drive
    console.log(`Uploading ${session.generatedImages.length} final images for ${productId}`);
    const finalUploads = [];
    for (const img of session.generatedImages) {
      if (img.success && img.imageBuffer) {
        const result = await googleDrive.uploadFinalImage(
          img.imageBuffer,
          productId,
          img.imageNumber,
          'image/jpeg'
        );
        finalUploads.push(result);

        // Update the generated image with Drive link
        img.driveLink = result.directLink;
      }
    }

    // Get folder links
    const rawFolderLink = await googleDrive.getFolderLink(productId, 'raw');
    const finalFolderLink = await googleDrive.getFolderLink(productId, 'final');

    session.driveLinks = {
      raw: rawFolderLink,
      final: finalFolderLink
    };

    // Save to Google Sheets
    const sheetData = {
      weight: session.tagInfo.weight,
      laborCost: session.tagInfo.laborCost,
      productId: productId,
      rawLink: rawFolderLink,
      finalLink: finalFolderLink,
      description: session.productDescription.description,
      category: session.category,
      size: session.productDescription.size
    };

    console.log('Saving to Google Sheets:', sheetData);
    const sheetResult = await googleSheets.addProductRow(sheetData);

    if (!sheetResult.success) {
      throw new Error(sheetResult.message || 'Failed to save to sheet');
    }

    session.status = 'completed';

    res.json({
      success: true,
      message: 'All data saved successfully',
      driveLinks: session.driveLinks,
      sheetResult
    });

  } catch (error) {
    console.error('Save error:', error.message);
    console.error('Full error:', error.stack);
    session.status = 'error';
    session.error = error.message;
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// =============================================================================
// UTILITY ROUTES
// =============================================================================

// Get available categories
app.get('/api/categories', (req, res) => {
  const categories = Object.entries(PROMPTS).map(([key, value]) => ({
    id: key,
    name: value.name,
    perspectiveCount: value.perspectives.length
  }));
  res.json(categories);
});

// Get ethnicities
app.get('/api/ethnicities', (req, res) => {
  res.json([
    { id: 'random', name: 'Random' },
    { id: 'tamilsk', name: 'Tamilsk' },
    { id: 'caucasian', name: 'Caucasian' },
    { id: 'norsk', name: 'Norsk' },
    { id: 'asian', name: 'Asian' }
  ]);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get prompts for a category (with session context for full prompts)
app.get('/api/prompts/:category', requireAuth, (req, res) => {
  const { category } = req.params;
  const { sessionId } = req.query;
  const categoryPrompts = PROMPTS[category];

  if (!categoryPrompts) {
    return res.status(404).json({ error: 'Category not found' });
  }

  // Get session for visual descriptor and ethnicity
  let visualDescriptor = '[Visual descriptor vil bli generert fra bildene dine]';
  let ethnicity = 'random';

  if (sessionId) {
    const session = activeSessions.get(sessionId);
    console.log('Fetching prompts for session:', sessionId, 'Session found:', !!session);
    if (session) {
      console.log('Session visualDescriptor:', session.visualDescriptor);
      console.log('Session tagInfo:', session.tagInfo);
      visualDescriptor = session.visualDescriptor || visualDescriptor;
      ethnicity = session.ethnicity || ethnicity;
    }
  }

  const { buildFullPrompt, ETHNICITY_MODIFIERS } = require('./config/prompts');

  const perspectives = categoryPrompts.perspectives.map(p => {
    const fullPrompt = buildFullPrompt(
      visualDescriptor,
      p.prompt,
      ethnicity,
      p.requiresModel
    );

    return {
      id: p.id,
      name: p.name,
      imageNumber: p.imageNumber || categoryPrompts.perspectives.indexOf(p) + 1,
      requiresModel: p.requiresModel,
      prompt: fullPrompt
    };
  });

  res.json({ category, perspectives, visualDescriptor, ethnicity });
});

// Get composition reference perspectives for a category
app.get('/api/perspectives/:category', requireAuth, (req, res) => {
  const { category } = req.params;
  const { getPerspectivesForCategory } = require('./config/compositionPrompts');

  const perspectives = getPerspectivesForCategory(category);

  if (!perspectives || perspectives.length === 0) {
    return res.status(404).json({ error: 'No perspectives found for category' });
  }

  res.json({ category, perspectives });
});

// Get master rendering prompts for a session
app.get('/api/master-prompts/:sessionId', requireAuth, async (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!session.category) {
    return res.status(400).json({ error: 'Session has no category' });
  }

  const { getPerspectivesForCategory } = require('./config/compositionPrompts');
  const perspectives = getPerspectivesForCategory(session.category);

  if (!perspectives || perspectives.length === 0) {
    return res.status(404).json({ error: 'No perspectives found for category' });
  }

  const visualDescriptor = session.visualDescriptor || '[Visual descriptor not yet generated]';

  // Check if we already have generated master prompts in session
  if (session.masterPrompts && Object.keys(session.masterPrompts).length > 0) {
    return res.json({
      category: session.category,
      visualDescriptor,
      masterPrompts: session.masterPrompts
    });
  }

  // Get product images from session
  const productImageBuffers = session.rawImages ? session.rawImages.map(img => img.buffer) : [];

  // Generate master prompts using Gemini thinking model (parallel processing)
  // Now includes product images + composition reference images
  try {
    const promptPromises = perspectives.map(async (p) => {
      // Load the composition reference image for this perspective
      const compositionImageBuffer = await loadCompositionImage(session.category, p.imageFile);

      console.log(`Generating master prompt for ${p.id} with ${productImageBuffers.length} product images and composition image: ${!!compositionImageBuffer}`);

      const masterPrompt = await gemini.generateMasterPrompt(
        visualDescriptor,
        p.prompt,
        session.category,
        productImageBuffers,
        compositionImageBuffer
      );
      return { id: p.id, prompt: masterPrompt, imageFile: p.imageFile };
    });

    const results = await Promise.all(promptPromises);

    const masterPrompts = {};
    results.forEach(r => {
      masterPrompts[r.id] = r.prompt;
    });

    // Cache in session for future requests
    session.masterPrompts = masterPrompts;

    res.json({
      category: session.category,
      visualDescriptor,
      masterPrompts
    });
  } catch (error) {
    console.error('Error generating master prompts:', error);
    // Fallback to simple template
    const masterPrompts = {};
    perspectives.forEach(p => {
      masterPrompts[p.id] = buildMasterPrompt(visualDescriptor, p.prompt, session.category);
    });
    res.json({
      category: session.category,
      visualDescriptor,
      masterPrompts
    });
  }
});

// Helper function to build master prompt
function buildMasterPrompt(visualDescriptor, compositionPrompt, category) {
  return `TASK: Generate an ultra high-definition 2K luxury jewelry editorial photograph.

PRODUCT REFERENCE:
The jewelry piece is described as: ${visualDescriptor}

COMPOSITION REFERENCE:
${compositionPrompt}

TECHNICAL REQUIREMENTS:
- Resolution: 2K (2048x2048 minimum)
- Style: Professional luxury editorial photography
- No CGI, no artificial look
- No text, logos, or watermarks
- Photorealistic with natural lighting
- Clean, minimalist aesthetic suitable for high-end e-commerce`;
}

// Get complete 2-step workflow details for transparency
app.get('/api/nano-banana-input/:sessionId', requireAuth, async (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!session.category) {
    return res.status(400).json({ error: 'Session has no category' });
  }

  const { getPerspectivesForCategory } = require('./config/compositionPrompts');
  const perspectives = getPerspectivesForCategory(session.category);

  if (!perspectives || perspectives.length === 0) {
    return res.status(404).json({ error: 'No perspectives found for category' });
  }

  const visualDescriptor = session.visualDescriptor || '[Visual descriptor not yet generated]';
  const productImageCount = session.rawImages ? session.rawImages.length : 0;

  // Check if master prompts have been generated
  const hasMasterPrompts = session.masterPrompts && Object.keys(session.masterPrompts).length > 0;

  // Build detailed input for each perspective
  const perspectiveInputs = [];

  for (const p of perspectives) {
    const masterPrompt = hasMasterPrompts ? session.masterPrompts[p.id] : '[Master prompt not yet generated - will be created by Gemini 3 Pro during generation]';

    perspectiveInputs.push({
      perspectiveId: p.id,
      perspectiveName: p.name || p.id,
      step1_gemini3Pro: {
        model: 'gemini-3-pro-preview (thinking model)',
        input: {
          productImages: {
            count: productImageCount,
            description: session.rawImages ? session.rawImages.map((img, i) => `Image ${i + 1}: ${img.originalName}`).join(', ') : 'No images'
          },
          globalVisualDescriptor: visualDescriptor,
          compositionPrompt: p.prompt
        },
        output: {
          masterRenderingPrompt: masterPrompt
        }
      },
      step2_nanoBananaPro: {
        model: 'gemini-2.0-flash-exp (image generation)',
        input: {
          productImages: {
            count: productImageCount,
            description: session.rawImages ? session.rawImages.map((img, i) => `Image ${i + 1}: ${img.originalName}`).join(', ') : 'No images'
          },
          masterRenderingPrompt: masterPrompt
        },
        output: '2K jewelry editorial photograph'
      }
    });
  }

  res.json({
    workflow: 'TWO-STEP',
    sessionId: session.id,
    category: session.category,
    globalVisualDescriptor: visualDescriptor,
    productImageCount,
    perspectiveCount: perspectives.length,
    technicalRequirements: {
      resolution: '2K (2048x2048 minimum)',
      responseModality: 'image',
      noCGI: true,
      noWatermarks: true,
      photorealistic: true,
      photographyStandards: [
        '100mm Macro Lens on Phase One XF camera',
        '5500K softbox diffusion',
        'Sharp specular highlights on metal edges',
        'Soft-edged contact shadows'
      ],
      safetySettings: [
        'HARM_CATEGORY_DANGEROUS_CONTENT: BLOCK_ONLY_HIGH',
        'HARM_CATEGORY_HARASSMENT: BLOCK_ONLY_HIGH',
        'HARM_CATEGORY_HATE_SPEECH: BLOCK_ONLY_HIGH',
        'HARM_CATEGORY_SEXUALLY_EXPLICIT: BLOCK_ONLY_HIGH'
      ]
    },
    perspectives: perspectiveInputs
  });
});

// =============================================================================
// CHATBOT ROUTES (for image regeneration chat)
// =============================================================================

app.post('/api/chat/:sessionId', requireAuth, async (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { message } = req.body;

  // Parse user request
  const lowerMessage = message.toLowerCase();

  // Check if user is satisfied
  if (lowerMessage.includes('ja') || lowerMessage.includes('fornøyd') || lowerMessage.includes('bra') || lowerMessage.includes('ok')) {
    return res.json({
      type: 'confirmation',
      message: 'Flott! Bildene er klare. Vil du lagre dem til Google Drive og Sheets?',
      action: 'save'
    });
  }

  // Check for regeneration request
  const imageNumberMatch = message.match(/bilde\s*(\d+)/i) || message.match(/(\d+)/);
  if (imageNumberMatch) {
    const imageNumber = parseInt(imageNumberMatch[1]);
    const image = session.generatedImages.find(img => img.imageNumber === imageNumber);

    if (image) {
      return res.json({
        type: 'regenerate',
        message: `Forstått! Genererer bilde ${imageNumber} (${image.perspectiveName}) på nytt...`,
        perspectiveId: image.perspectiveId,
        imageNumber
      });
    }
  }

  // Default response
  res.json({
    type: 'help',
    message: `Tilgjengelige kommandoer:
- Si "bilde X" for å generere bilde nummer X på nytt
- Si "ja" eller "fornøyd" når du er ferdig
- Du kan også beskrive endringer du ønsker

Genererte bilder: ${session.generatedImages.map(i => `${i.imageNumber}. ${i.perspectiveName}`).join(', ')}`
  });
});

// =============================================================================
// SERVE FRONTEND
// =============================================================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// =============================================================================
// START SERVER
// =============================================================================

async function startServer() {
  try {
    // Initialize Google Drive folders
    console.log('Initializing Google Drive folders...');
    await googleDrive.initializeFolders();
    console.log('Google Drive initialized');

    // Initialize Google Sheets (detect available sheet name)
    console.log('Initializing Google Sheets...');
    await googleSheets.initializeSheetName();
    console.log('Google Sheets initialized');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
