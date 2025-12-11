const { google } = require('googleapis');
const path = require('path');

// Load your secrets
const keyFile = path.join(__dirname, 'secrets.json');

const auth = new google.auth.GoogleAuth({
    keyFile: keyFile,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

async function testUpload() {
    try {
        console.log("1. Attempting to talk to Google Drive...");
        
        // Try to create a simple text file
        const res = await drive.files.create({
            requestBody: {
                name: 'Test_Connection.txt',
                mimeType: 'text/plain'
            },
            media: {
                mimeType: 'text/plain',
                body: 'Hello! If you see this, the API works.'
            }
        });

        console.log("✅ SUCCESS! File created.");
        console.log("File ID:", res.data.id);
        console.log("The API is working correctly. The issue is likely in the file upload code.");

    } catch (error) {
        console.log("❌ FAILED. Here is the real error:");
        console.log("---------------------------------------------------");
        console.error(error.message);
        console.log("---------------------------------------------------");
        
        if (error.message.includes('Drive API has not been used')) {
            console.log("👉 FIX: You need to Enable 'Google Drive API' in Cloud Console.");
        }
    }
}

testUpload();