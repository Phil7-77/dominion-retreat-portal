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
    console.log(`Server running on port ${PORT}`);
});

// --- NEW: Group Registration Endpoint ---
app.post("/api/register-group", async (req, res) => {
  const { registrants, totalAmount } = req.body; // 'registrants' is an array of people

  try {
    // 1. Save all users to database (but marked as 'Pending' payment)
    // We can generate a unique 'groupID' to link them if needed, but for now simple insert is fine.
    const savedUsers = await User.insertMany(registrants.map(p => ({
      ...p,
      status: "Pending",
      paymentReference: "PENDING_" + Date.now() // Temporary ref
    })));

    // 2. Initialize Paystack Transaction for the TOTAL amount
    const params = JSON.stringify({
      email: registrants[0].name.replace(/\s/g, "") + "@dominion.com", // Use first person's "email" or generic
      amount: totalAmount * 100, // Paystack is in pesewas
      currency: "GHS",
      callback_url: "https://your-frontend-url.vercel.app/verify", // Update this!
      metadata: {
        custom_fields: [
          {
            display_name: "Group Size",
            variable_name: "group_size",
            value: registrants.length
          }
        ]
      }
    });

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/transaction/initialize',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const paystackReq = https.request(options, paystackRes => {
      let data = '';
      paystackRes.on('data', (chunk) => { data += chunk; });
      paystackRes.on('end', () => {
        const result = JSON.parse(data);
        if (result.status) {
          res.json({ paymentUrl: result.data.authorization_url });
        } else {
          res.status(400).json({ error: "Paystack initialization failed" });
        }
      });
    });

    paystackReq.write(params);
    paystackReq.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Group registration failed" });
  }
});