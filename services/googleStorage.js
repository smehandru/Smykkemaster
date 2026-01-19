const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'project-bcb47e5a-1886-41ee-a91';
const BUCKET_NAME = 'jewelry-images-upload-2026';

// Setup credentials
function setupCredentials() {
  if (process.env.GOOGLE_CREDENTIALS) {
    const tempPath = '/tmp/google-credentials.json';
    fs.writeFileSync(tempPath, process.env.GOOGLE_CREDENTIALS);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
  } else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '..', 'service-account.json');
  }
}

// Initialize Storage client
let storage = null;
let bucket = null;

function initializeStorage() {
  if (!storage) {
    setupCredentials();
    storage = new Storage({
      projectId: PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    bucket = storage.bucket(BUCKET_NAME);
    console.log(`GCS initialized with bucket: ${BUCKET_NAME}`);
  }
  return { storage, bucket };
}

/**
 * Upload an image buffer to GCS for temporary web display
 * @param {Buffer} imageBuffer - The image data
 * @param {string} sessionId - Session ID for organization
 * @param {string} perspectiveId - Perspective identifier
 * @param {string} mimeType - Image mime type (default: image/jpeg)
 * @returns {Promise<{success: boolean, publicUrl: string, gcsPath: string}>}
 */
async function uploadTemporaryImage(imageBuffer, sessionId, perspectiveId, mimeType = 'image/jpeg') {
  try {
    const { bucket } = initializeStorage();

    // Create path: temp/{sessionId}/{perspectiveId}.jpg
    const fileName = `temp/${sessionId}/${perspectiveId}.jpg`;
    const file = bucket.file(fileName);

    // Upload with public read access
    await file.save(imageBuffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=3600', // Cache for 1 hour
      },
      public: true, // Make publicly accessible
    });

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;

    console.log(`✓ Uploaded to GCS: ${fileName}`);

    return {
      success: true,
      publicUrl,
      gcsPath: fileName
    };
  } catch (error) {
    console.error('GCS upload error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete temporary images for a session (cleanup)
 * @param {string} sessionId - Session ID to clean up
 * @returns {Promise<{success: boolean, deletedCount: number}>}
 */
async function deleteTemporaryImages(sessionId) {
  try {
    const { bucket } = initializeStorage();

    const [files] = await bucket.getFiles({
      prefix: `temp/${sessionId}/`
    });

    const deletePromises = files.map(file => file.delete());
    await Promise.all(deletePromises);

    console.log(`✓ Deleted ${files.length} temporary images for session ${sessionId}`);

    return {
      success: true,
      deletedCount: files.length
    };
  } catch (error) {
    console.error('GCS cleanup error:', error.message);
    return {
      success: false,
      error: error.message,
      deletedCount: 0
    };
  }
}

/**
 * Copy an image from GCS temporary storage to another location (for archival)
 * @param {string} gcsPath - Source path in GCS
 * @param {string} destinationPath - Destination path in GCS
 * @returns {Promise<{success: boolean}>}
 */
async function copyImage(gcsPath, destinationPath) {
  try {
    const { bucket } = initializeStorage();

    const sourceFile = bucket.file(gcsPath);
    const destinationFile = bucket.file(destinationPath);

    await sourceFile.copy(destinationFile);

    console.log(`✓ Copied ${gcsPath} to ${destinationPath}`);

    return { success: true };
  } catch (error) {
    console.error('GCS copy error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Download an image from GCS as a buffer
 * @param {string} gcsPath - Path in GCS
 * @returns {Promise<{success: boolean, buffer: Buffer}>}
 */
async function downloadImage(gcsPath) {
  try {
    const { bucket } = initializeStorage();

    const file = bucket.file(gcsPath);
    const [buffer] = await file.download();

    return {
      success: true,
      buffer
    };
  } catch (error) {
    console.error('GCS download error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test connection to GCS bucket
 * @returns {Promise<{success: boolean, fileCount: number}>}
 */
async function testConnection() {
  try {
    const { bucket } = initializeStorage();

    const [files] = await bucket.getFiles({ maxResults: 10 });
    console.log(`✓ GCS connection successful! Found ${files.length} files`);

    return {
      success: true,
      fileCount: files.length
    };
  } catch (error) {
    console.error('✗ GCS connection failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  uploadTemporaryImage,
  deleteTemporaryImages,
  copyImage,
  downloadImage,
  testConnection
};
