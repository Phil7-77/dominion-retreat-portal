const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();

// --- 1. CORS CONFIGURATION (Trusting Vercel) ---
app.use(cors({
    origin: '*', // Allow all connections (Easiest fix for "CORS" error)
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;
const SPREADSHEET_ID = process.env.SHEET_ID;

// --- 2. LOGGING (To debug in Render Dashboard) ---
app.use((req, res, next) => {
    console.log(`📩 Incoming Request: ${req.method} ${req.url}`);
    next();
});

// --- AUTHENTICATION ---
let auth;
if (process.env.GOOGLE_CREDENTIALS) {
    auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
} else {
    auth = new google.auth.GoogleAuth({
        keyFile: 'secrets.json',
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
}

const sheets = google.sheets({ version: 'v4', auth });

// --- 3. TEST ROUTE (To confirm server is awake) ---
app.get('/', (req, res) => {
    res.send('✅ Dominion Retreat Backend is ONLINE!');
});

// --- REGISTRATION ENDPOINT ---
app.post('/api/register', async (req, res) => {
    console.log("📝 processing registration...");
    try {
        const { fullName, location, phone, ticketType, paymentScreenshot } = req.body;
        
        let existingNames = [];
        try {
            const existingData = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Sheet1!B:B', 
            });
            const rows = existingData.data.values || [];
            existingNames = rows.flat().map(name => name ? name.toLowerCase().trim() : "");
        } catch (err) {
            console.log("⚠️ Sheet might be empty, continuing...");
        }

        if (existingNames.includes(fullName.toLowerCase().trim())) {
            console.log("❌ Duplicate found");
            return res.status(409).json({ error: 'Already registered' });
        }

        const timestamp = new Date().toLocaleString();
        
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[timestamp, fullName, phone, location, ticketType, paymentScreenshot, 'Pending']]
            }
        });

        console.log("✅ Saved to Sheets");
        res.status(200).json({ message: 'Success' });

    } catch (error) {
        console.error('❌ Server Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- ADMIN DATA ENDPOINT ---
app.get('/api/admin/data', async (req, res) => {
    console.log("📂 Admin fetching data...");
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G',
        });
        const rows = response.data.values;
        if (!rows || rows.length < 2) return res.json([]);

        const formattedData = rows.slice(1).map((row, index) => ({
            rowIndex: index + 2,
            timestamp: row[0] || "",
            fullName: row[1] || "Unknown",
            phone: row[2] || "",
            location: row[3] || "",
            ticketType: row[4] || "Standard",
            paymentScreenshot: row[5] || "",
            status: row[6] || 'Pending'
        }));

        res.json(formattedData);
    } catch (error) {
        console.error("❌ Fetch Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// --- ADMIN APPROVE ENDPOINT ---
app.post('/api/admin/approve', async (req, res) => {
    console.log("✅ Approving user...");
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
        console.error("Approve Error:", error.message);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});