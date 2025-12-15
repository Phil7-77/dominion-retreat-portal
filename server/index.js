const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();

// --- 1. NUCLEAR CORS (Allow Everything) ---
// This forces the server to accept requests from ANY website
app.use(cors()); 
app.options('*', cors()); // Handle preflight requests

app.use(express.json());

const PORT = process.env.PORT || 5000;
const SPREADSHEET_ID = process.env.SHEET_ID;

// --- 2. AUTHENTICATION SETUP ---
const getAuth = () => {
    // If running on Render (Cloud)
    if (process.env.GOOGLE_CREDENTIALS) {
        console.log("🔐 Loading Credentials from Environment Variable...");
        return new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
            scopes: 'https://www.googleapis.com/auth/spreadsheets',
        });
    } 
    // If running locally
    else {
        console.log("📂 Loading Credentials from secrets.json...");
        return new google.auth.GoogleAuth({
            keyFile: 'secrets.json',
            scopes: 'https://www.googleapis.com/auth/spreadsheets',
        });
    }
};

const auth = getAuth();
const sheets = google.sheets({ version: 'v4', auth });

// --- 3. TEST ROUTE ---
app.get('/', (req, res) => {
    res.send('Dominion Retreat Server Running');
});

// --- REGISTRATION ---
app.post('/api/register', async (req, res) => {
    console.log("📩 New Registration Request received...");
    try {
        const { fullName, location, phone, ticketType, paymentScreenshot } = req.body;
        
        // --- GOOGLE SHEETS CHECK ---
        console.log("🔎 Connecting to Google Sheets...");
        
        // 1. Check for Duplicates
        let existingNames = [];
        try {
            const existingData = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Sheet1!B:B', 
            });
            const rows = existingData.data.values || [];
            existingNames = rows.flat().map(name => name ? name.toLowerCase().trim() : "");
        } catch (err) {
            console.error("⚠️ Error reading sheet (Check Sheet ID/Permissions):", err.message);
            // We do NOT stop here, we assume it's empty or fresh and try to save anyway.
        }

        if (existingNames.includes(fullName.toLowerCase().trim())) {
            console.log("❌ Duplicate Name Detected");
            return res.status(409).json({ error: 'Member is already registered.' });
        }

        // 2. Save Data
        const timestamp = new Date().toLocaleString();
        console.log("📝 Saving to row...");
        
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[timestamp, fullName, phone, location, ticketType, paymentScreenshot, 'Pending']]
            }
        });

        console.log("✅ Successfully Saved!");
        res.status(200).json({ message: 'Success' });

    } catch (error) {
        console.error('❌ CRITICAL ERROR:', error.message);
        // This log will show up in Render and tell us exactly what is wrong
        res.status(500).json({ error: error.message });
    }
});

// --- ADMIN DATA ---
app.get('/api/admin/data', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G',
        });
        const rows = response.data.values;
        if (!rows || rows.length < 2) return res.json([]);

        const formattedData = rows.slice(1).map((row, index) => ({
            rowIndex: index + 2,
            timestamp: row[0],
            fullName: row[1],
            phone: row[2],
            location: row[3],
            ticketType: row[4],
            paymentScreenshot: row[5],
            status: row[6] || 'Pending'
        }));
        res.json(formattedData);
    } catch (error) {
        console.error("Admin Fetch Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// --- NEW: Group Registration Endpoint (Google Sheets Version) ---
app.post("/api/register-group", async (req, res) => {
  console.log("👨‍👩‍👧‍👦 New Group Registration Request received...");
  try {
    const { registrants } = req.body; // Expecting an array of people

    if (!registrants || registrants.length === 0) {
      return res.status(400).json({ error: "No registrants provided" });
    }

    // --- 1. Prepare Data for Google Sheets ---
    // We map the array of people into an array of rows
    const timestamp = new Date().toLocaleString();
    
    // Format: [Timestamp, Name, Phone, Location, Type, Screenshot, Status]
    const newRows = registrants.map(person => [
      timestamp,
      person.fullName,
      person.phone,
      person.location,
      person.ticketType,
      person.paymentScreenshot, // Everyone shares the same image
      'Pending'
    ]);

    console.log(`Saving ${newRows.length} members to sheet...`);

    // --- 2. Append ALL rows at once ---
    // This is much safer than sending 5 separate requests
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:G',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: newRows
      }
    });

    console.log("Group Successfully Saved!");
    res.status(200).json({ message: 'Group Registered Successfully' });

  } catch (error) {
    console.error('GROUP REGISTER ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});