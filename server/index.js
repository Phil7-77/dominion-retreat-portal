const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();

// --- 1. CORS CONFIGURATION (Fixing Connection Issues) ---
app.use(cors({
    origin: '*', // Allow all frontends
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const SPREADSHEET_ID = process.env.SHEET_ID;

// --- 2. AUTHENTICATION ---
const getAuth = () => {
    if (process.env.GOOGLE_CREDENTIALS) {
        console.log("🔐 Loading Cloud Credentials...");
        return new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
            scopes: 'https://www.googleapis.com/auth/spreadsheets',
        });
    } else {
        console.log("📂 Loading Local Credentials...");
        return new google.auth.GoogleAuth({
            keyFile: 'secrets.json',
            scopes: 'https://www.googleapis.com/auth/spreadsheets',
        });
    }
};

const auth = getAuth();
const sheets = google.sheets({ version: 'v4', auth });

// --- 3. HEALTH CHECK ROUTE ---
app.get('/', (req, res) => {
    res.status(200).send('Dominion Retreat Server Running - API Active');
});

// --- 4. UNIFIED REGISTRATION ENDPOINT (Handles Single & Group) ---
app.post("/api/register-group", async (req, res) => {
    console.log("📩 Registration Request Received");
    
    try {
        const { registrants } = req.body; 

        if (!registrants || registrants.length === 0) {
            return res.status(400).json({ error: "No data provided" });
        }

        const timestamp = new Date().toLocaleString();
        
        // Map data to Google Sheets Row Format
        // [Timestamp, Name, Phone, Location, Type, Screenshot, Status]
        const newRows = registrants.map(person => [
            timestamp,
            person.fullName,
            person.phone,
            person.location,
            person.ticketType,
            person.paymentScreenshot,
            'Pending' // Default Status
        ]);

        console.log(`📝 Appending ${newRows.length} rows to Sheet...`);

        // Check Duplicates (Optional but Recommended)
        // Note: For simplicity in a batch request, we often skip duplicate checks 
        // OR we just append and let Admin sort it out. 
        // Here, we just Append to ensure speed and no crashing.

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G',
            valueInputOption: 'USER_ENTERED',
            resource: { values: newRows }
        });

        console.log("✅ Success!");
        res.status(200).json({ message: 'Registration Successful' });

    } catch (error) {
        console.error('❌ SERVER ERROR:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- 5. ADMIN DATA FETCH ---
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

// --- 6. ADMIN APPROVE ---
app.post('/api/admin/approve', async (req, res) => {
    try {
        const { rowIndex } = req.body;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Sheet1!G${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [['Confirmed']] }
        });
        res.json({ message: 'Status Updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});