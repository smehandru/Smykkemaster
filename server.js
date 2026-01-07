require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Services
const googleDrive = require('./services/googleDrive');
const googleSheets = require('./services/googleSheets');
const gemini = require('./services/gemini');
const imageGenerator = require('./services/imageGenerator');
const { PROMPTS } = require('./config/prompts');

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
    const { sessionId, category, ethnicity } = req.body;

    if (!sessionId || !category || !ethnicity) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, category, ethnicity' });
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
    session.ethnicity = ethnicity;
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

app.post('/api/generate/:sessionId', requireAuth, async (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status !== 'analyzed' && session.status !== 'generated') {
    return res.status(400).json({ error: 'Analysis not complete' });
  }

  session.status = 'generating';
  session.generatedImages = [];

  res.json({
    success: true,
    message: 'Starting image generation...',
    perspectives: imageGenerator.getPerspectives(session.category)
  });

  // Start generation in background
  generateImages(session).catch(err => {
    console.error('Generation error:', err);
    session.status = 'error';
    session.error = err.message;
  });
});

// Background generation function
async function generateImages(session) {
  try {
    const referenceBuffers = session.rawImages.map(img => img.buffer);

    console.log(`Starting image generation for session ${session.id}`);
    const results = await imageGenerator.generateAllPerspectives(
      session.visualDescriptor,
      session.category,
      session.ethnicity,
      referenceBuffers
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

// Regenerate specific image
app.post('/api/regenerate/:sessionId/:perspectiveId', requireAuth, async (req, res) => {
  const session = activeSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { perspectiveId } = req.params;
  const { customPrompt } = req.body;

  try {
    const referenceBuffer = session.rawImages[0].buffer;

    const result = await imageGenerator.regenerateImage(
      customPrompt || session.visualDescriptor,
      session.category,
      session.ethnicity,
      perspectiveId,
      referenceBuffer
    );

    // Update the specific image in session
    const imageIndex = session.generatedImages.findIndex(
      img => img.perspectiveId === perspectiveId
    );

    if (imageIndex >= 0) {
      session.generatedImages[imageIndex] = {
        ...result,
        imageNumber: session.generatedImages[imageIndex].imageNumber,
        imageBase64: result.success ? result.imageBuffer.toString('base64') : null,
        imageBuffer: result.success ? result.imageBuffer : null
      };
    }

    res.json({
      success: true,
      image: {
        perspectiveId: result.perspectiveId,
        perspectiveName: result.perspectiveName,
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
    console.error('Save error:', error);
    session.status = 'error';
    session.error = error.message;
    res.status(500).json({ error: error.message });
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
