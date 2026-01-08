/**
 * Script to get OAuth2 refresh token for Google Drive and Sheets
 *
 * INSTRUCTIONS:
 *
 * 1. Go to Google Cloud Console: https://console.cloud.google.com
 * 2. Select your project
 * 3. Go to "APIs & Services" > "Credentials"
 * 4. Click "Create Credentials" > "OAuth client ID"
 * 5. Choose "Web application"
 * 6. Add "https://developers.google.com/oauthplayground" as Authorized redirect URI
 * 7. Copy the Client ID and Client Secret
 *
 * 8. Go to OAuth Playground: https://developers.google.com/oauthplayground
 * 9. Click the gear icon (⚙️) in top right
 * 10. Check "Use your own OAuth credentials"
 * 11. Enter your Client ID and Client Secret
 * 12. Close settings
 *
 * 13. In the left panel, select these scopes:
 *     - https://www.googleapis.com/auth/drive
 *     - https://www.googleapis.com/auth/spreadsheets
 * 14. Click "Authorize APIs"
 * 15. Sign in with your Google account (the one with Drive storage)
 * 16. Click "Exchange authorization code for tokens"
 * 17. Copy the "Refresh token" value
 *
 * ENVIRONMENT VARIABLES TO SET IN RAILWAY:
 *
 * GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
 * GOOGLE_CLIENT_SECRET=your-client-secret
 * GOOGLE_REFRESH_TOKEN=your-refresh-token
 * GOOGLE_CREDENTIALS={"type":"service_account",...}  (keep this for Gemini)
 * GOOGLE_FOLDER_ID=1punP9pW6jzSCTtNp0YZV-1PcPFKyr3vI
 * GOOGLE_SHEET_ID=1kzucTy0lZPuNZFz525Zi1gi9WhuREOoIAEFMFbxyqWs
 */

// Optional: Run this locally to test your credentials
const { google } = require('googleapis');

async function testCredentials() {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.log('Missing credentials. Set these environment variables:');
    console.log('- GOOGLE_CLIENT_ID');
    console.log('- GOOGLE_CLIENT_SECRET');
    console.log('- GOOGLE_REFRESH_TOKEN');
    return;
  }

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
  });

  try {
    // Test Drive access
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const driveResponse = await drive.about.get({ fields: 'user' });
    console.log('✓ Drive access OK - User:', driveResponse.data.user.displayName);

    // Test Sheets access
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    console.log('✓ Sheets client created OK');

    console.log('\nAll credentials working! You can use these in Railway.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCredentials();
