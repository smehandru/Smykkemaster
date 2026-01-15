const { google } = require('googleapis');
const path = require('path');
const stream = require('stream');

// Folder IDs (will be populated from parent folder)
let RAW_FOLDER_ID = null;
let FINAL_FOLDER_ID = null;
const PARENT_FOLDER_ID = process.env.GOOGLE_FOLDER_ID || '1punP9pW6jzSCTtNp0YZV-1PcPFKyr3vI';

// OAuth2 credentials
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Create OAuth2 auth client
async function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
  });

  return oauth2Client;
}

// Get Drive client
async function getDriveClient() {
  const auth = await getAuthClient();
  return google.drive({ version: 'v3', auth });
}

// Initialize folder IDs by finding raw and final folders
async function initializeFolders() {
  const drive = await getDriveClient();

  // Find 'raw' folder
  const rawResult = await drive.files.list({
    q: `name='raw' and '${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)'
  });

  if (rawResult.data.files.length > 0) {
    RAW_FOLDER_ID = rawResult.data.files[0].id;
  } else {
    // Create raw folder
    const rawFolder = await drive.files.create({
      requestBody: {
        name: 'raw',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [PARENT_FOLDER_ID]
      },
      fields: 'id'
    });
    RAW_FOLDER_ID = rawFolder.data.id;
  }

  // Find 'final' folder
  const finalResult = await drive.files.list({
    q: `name='final' and '${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)'
  });

  if (finalResult.data.files.length > 0) {
    FINAL_FOLDER_ID = finalResult.data.files[0].id;
  } else {
    // Create final folder
    const finalFolder = await drive.files.create({
      requestBody: {
        name: 'final',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [PARENT_FOLDER_ID]
      },
      fields: 'id'
    });
    FINAL_FOLDER_ID = finalFolder.data.id;
  }

  console.log('Folder IDs initialized:', { RAW_FOLDER_ID, FINAL_FOLDER_ID });
  return { RAW_FOLDER_ID, FINAL_FOLDER_ID };
}

// Create a product folder inside raw or final
async function createProductFolder(productId, type = 'raw') {
  const drive = await getDriveClient();
  const parentId = type === 'raw' ? RAW_FOLDER_ID : FINAL_FOLDER_ID;

  if (!parentId) {
    await initializeFolders();
  }

  // Check if folder already exists
  const existingResult = await drive.files.list({
    q: `name='${productId}' and '${type === 'raw' ? RAW_FOLDER_ID : FINAL_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)'
  });

  if (existingResult.data.files.length > 0) {
    return existingResult.data.files[0].id;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name: productId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [type === 'raw' ? RAW_FOLDER_ID : FINAL_FOLDER_ID]
    },
    fields: 'id'
  });

  return folder.data.id;
}

// Upload a file to Google Drive
async function uploadFile(buffer, fileName, mimeType, folderId) {
  const drive = await getDriveClient();

  // Create a readable stream from buffer
  const bufferStream = new stream.PassThrough();
  bufferStream.end(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId]
    },
    media: {
      mimeType: mimeType,
      body: bufferStream
    },
    fields: 'id, webViewLink, webContentLink'
  });

  // Make file publicly accessible
  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  return {
    id: response.data.id,
    webViewLink: response.data.webViewLink,
    directLink: `https://drive.google.com/uc?export=view&id=${response.data.id}`
  };
}

// Upload raw image
async function uploadRawImage(buffer, productId, imageNumber, mimeType = 'image/jpeg') {
  const folderId = await createProductFolder(productId, 'raw');
  const fileName = `${productId}(r${imageNumber}).jpg`;
  return uploadFile(buffer, fileName, mimeType, folderId);
}

// Upload final/generated image
async function uploadFinalImage(buffer, productId, imageNumber, mimeType = 'image/jpeg') {
  const folderId = await createProductFolder(productId, 'final');
  const fileName = `${productId}(f${imageNumber}).jpg`;
  return uploadFile(buffer, fileName, mimeType, folderId);
}

// Get folder link
async function getFolderLink(productId, type = 'raw') {
  const drive = await getDriveClient();
  const parentId = type === 'raw' ? RAW_FOLDER_ID : FINAL_FOLDER_ID;

  const result = await drive.files.list({
    q: `name='${productId}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, webViewLink)'
  });

  if (result.data.files.length > 0) {
    return `https://drive.google.com/drive/folders/${result.data.files[0].id}`;
  }

  return null;
}

// Delete a file
async function deleteFile(fileId) {
  const drive = await getDriveClient();
  await drive.files.delete({ fileId });
}

// Download file as buffer
async function downloadFile(fileId) {
  const drive = await getDriveClient();
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(response.data);
}

// Check if product folder already exists in Drive
async function checkProductExists(productId) {
  try {
    const drive = await getDriveClient();

    // Ensure folders are initialized
    if (!RAW_FOLDER_ID || !FINAL_FOLDER_ID) {
      await initializeFolders();
    }

    // Check if folder exists in raw
    const rawResult = await drive.files.list({
      q: `name='${productId}' and '${RAW_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    });

    // Check if folder exists in final
    const finalResult = await drive.files.list({
      q: `name='${productId}' and '${FINAL_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    });

    const existsInRaw = rawResult.data.files.length > 0;
    const existsInFinal = finalResult.data.files.length > 0;

    return {
      exists: existsInRaw || existsInFinal,
      existsInRaw,
      existsInFinal,
      productId
    };
  } catch (error) {
    console.error('Error checking product existence:', error);
    return {
      exists: false,
      existsInRaw: false,
      existsInFinal: false,
      productId,
      error: error.message
    };
  }
}

module.exports = {
  initializeFolders,
  createProductFolder,
  uploadFile,
  uploadRawImage,
  uploadFinalImage,
  getFolderLink,
  deleteFile,
  downloadFile,
  checkProductExists,
  getAuthClient,
  getDriveClient
};
