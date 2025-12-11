const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const SPREADSHEET_ID = process.env.SHEET_ID;

// --- AUTHENTICATION LOGIC (CLOUD READY) ---
let auth;
if (process.env.GOOGLE_CREDENTIALS) {
    // 1. PRODUCTION MODE (Render)
    // We read the secret key from an Environment Variable string
    auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
} else {
    // 2. LOCAL MODE (Your Computer)
    // We look for the secrets.json file
    auth = new google.auth.GoogleAuth({
        keyFile: 'secrets.json',
        scopes: 'https://www.googleapis.com/auth/spreadsheets',
    });
}

const sheets = google.sheets({ version: 'v4', auth });

app.get('/', (req, res) => res.send('Dominion Retreat Server Running'));

// --- REGISTRATION ---
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, location, phone, ticketType, paymentScreenshot } = req.body;
        
        // Check Duplicates
        let existingNames = [];
        try {
            const existingData = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Sheet1!B:B', 
            });
            const rows = existingData.data.values || [];
            existingNames = rows.flat().map(name => name ? name.toLowerCase().trim() : "");
        } catch (err) {
            console.log("Sheet empty or unreadable.");
        }

        if (existingNames.includes(fullName.toLowerCase().trim())) {
            return res.status(409).json({ error: 'Already registered' });
        }

        // Save
        const timestamp = new Date().toLocaleString();
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:G',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[timestamp, fullName, phone, location, ticketType, paymentScreenshot, 'Pending']]
            }
        });

        res.status(200).json({ message: 'Success' });

    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- ADMIN FETCH ---
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
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// --- ADMIN APPROVE ---
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
    console.log(`Server running on http://localhost:${PORT}`);
});