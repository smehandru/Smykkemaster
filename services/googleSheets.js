const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, '..', 'service-account.json');
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1kzucTy0lZPuNZFz525Zi1gi9WhuREOoIAEFMFbxyqWs';
const SHEET_NAME = 'shopify2';

// Get Sheets client
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
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
  checkDuplicateProductId,
  addProductRow,
  getAllRows,
  FIELD_TO_HEADER_MAP
};
