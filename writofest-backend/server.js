require('dotenv').config(); 
const express = require('express');
const cors = require('cors'); 
const { Pool } = require('pg');
const { sendConfirmationEmail } = require('./email'); // <-- 1. IMPORT YOUR NEW EMAIL FUNCTION

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- Middleware ---
app.use(cors()); 
app.use(express.json());

// --- Routes ---
app.get('/', (req, res) => {
  res.send('WritoFest Backend is running!');
});

app.post('/register', async (req, res) => {
  const { name, email, phone, usn, branch, year, event, message } = req.body; 

  if (!name || !email || !event) {
    return res.status(400).json({ success: false, message: 'Name, Email, and Event are required.' });
  }

  const query = `
    INSERT INTO registrations(name, email, phone, usn, branch, year, event, message) 
    VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
    RETURNING *;
  `;
  const values = [name, email, phone, usn, branch, year, event, message];

  try {
    // 1. Save to Database
    const result = await pool.query(query, values);
    console.log('Registration successful:', result.rows[0]);
    
    // 2. Send the Email (in the background, "fire and forget")
    // We don't "await" this, so the user gets a fast response
    sendConfirmationEmail(name, email, event);

    // 3. Send Success Response to Frontend
    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error('Database insertion error:', err);
    res.status(500).json({ success: false, message: 'Internal server error. Please try again.' });
  }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});