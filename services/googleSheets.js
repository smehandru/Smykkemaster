const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1kzucTy0lZPuNZFz525Zi1gi9WhuREOoIAEFMFbxyqWs';
// Sheet name can be configured via env var, defaults to first sheet if not found
let SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'shopify2';

// OAuth2 credentials
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Create OAuth2 auth client
function getAuthClient() {
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

// Get Sheets client
async function getSheetsClient() {
  const auth = getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

// Get list of sheet names in the spreadsheet
async function getSheetNames() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID
  });
  return response.data.sheets.map(s => s.properties.title);
}

// Initialize and verify sheet name exists
async function initializeSheetName() {
  try {
    const sheetNames = await getSheetNames();
    console.log('Available sheets:', sheetNames);

    if (sheetNames.includes(SHEET_NAME)) {
      console.log(`Using sheet: ${SHEET_NAME}`);
      return SHEET_NAME;
    }

    // If configured sheet doesn't exist, use the first sheet
    if (sheetNames.length > 0) {
      SHEET_NAME = sheetNames[0];
      console.log(`Sheet 'shopify2' not found, using first sheet: ${SHEET_NAME}`);
      return SHEET_NAME;
    }

    throw new Error('No sheets found in spreadsheet');
  } catch (error) {
    console.error('Error initializing sheet name:', error.message);
    throw error;
  }
}

// Get column headers from the sheet
async function getHeaders() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!1:1`
  });

  return response.data.values ? response.data.values[0] : [];
}

// Find column index by header name (case-insensitive)
function findColumnIndex(headers, headerName) {
  const lowerName = headerName.toLowerCase();
  return headers.findIndex(h => h.toLowerCase() === lowerName);
}

// Check if product ID already exists
async function checkDuplicateProductId(productId) {
  const sheets = await getSheetsClient();

  // First, find the Product_id column
  const headers = await getHeaders();
  const productIdColIndex = findColumnIndex(headers, 'Product_id');

  if (productIdColIndex === -1) {
    console.warn('Product_id column not found');
    return false;
  }

  // Get all values from Product_id column
  const colLetter = String.fromCharCode(65 + productIdColIndex);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!${colLetter}:${colLetter}`
  });

  const values = response.data.values || [];
  return values.some(row => row[0] === productId);
}

// Map our data fields to sheet column names
const FIELD_TO_HEADER_MAP = {
  'weight': 'Weight(g)',
  'laborCost': 'Laborcost',
  'productId': 'Product_id',
  'rawLink': 'DL raw',
  'finalLink': 'DL final',
  'description': 'Description',
  'category': 'Category',
  'size': 'Size(mm)'
};

// Add a new row to the sheet
async function addProductRow(productData) {
  const sheets = await getSheetsClient();
  const headers = await getHeaders();

  // Check for duplicate
  const isDuplicate = await checkDuplicateProductId(productData.productId);
  if (isDuplicate) {
    return {
      success: false,
      error: 'DUPLICATE_ID',
      message: `Product ID ${productData.productId} already exists in the sheet`
    };
  }

  // Create row array matching header positions
  const rowData = new Array(headers.length).fill('');

  // Map our data to the correct columns
  for (const [field, headerName] of Object.entries(FIELD_TO_HEADER_MAP)) {
    const colIndex = findColumnIndex(headers, headerName);
    if (colIndex !== -1 && productData[field] !== undefined) {
      rowData[colIndex] = productData[field];
    }
  }

  // Append the row
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [rowData]
    }
  });

  return {
    success: true,
    updatedRange: response.data.updates.updatedRange,
    updatedRows: response.data.updates.updatedRows
  };
}

// Get all rows (for debugging/admin)
async function getAllRows() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:Z`
  });

  return response.data.values || [];
}

module.exports = {
  getSheetsClient,
  getHeaders,
  getSheetNames,
  initializeSheetName,
  checkDuplicateProductId,
  addProductRow,
  getAllRows,
  FIELD_TO_HEADER_MAP
};
