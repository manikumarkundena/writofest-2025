require('dotenv').config(); 
const express = require('express');
const cors = require('cors'); 
const { Pool } = require('pg');

const app = express();
// Note: Render sets PORT automatically to 10000, so we use its environment variable
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

app.get('/', (req, res) => {
  res.send('WritoFest Backend is running!');
});

app.post('/register', async (req, res) => {
  
  // --- 1. EXTRACT AND VALIDATE DATA ---
  // Using simple assignment is the most robust way to get data from the JSON payload
  const data = req.body;
  
  const name = data.name;
  const email = data.email;
  const phone = data.phone;
  const usn = data.usn;
  const college = data.college;
  const course = data.course;
  const branch = data.branch;
  const year = data.year;
  const message = data.message;
  
  // Events will be under the key 'events[]'
  let events = data['events[]']; 

  // Handle Branch 'Other' Consolidation (if user typed a custom branch)
  if (branch === 'Other' && data.otherBranch) {
    data.branch = data.otherBranch;
  }
  
  // --- 2. HANDLE MULTI-SELECT EVENTS ---
  // Fix: If only one checkbox is selected, Express gives a string, not an array. We must convert.
  if (typeof events === 'string') {
      events = [events];
  }
  // Convert the array of events into a single, clean comma-separated string for the database
  const eventsString = Array.isArray(events) ? events.join(', ') : '';

  // --- 3. BASIC VALIDATION CHECK (Critical for the current error) ---
  if (!name || !email || !eventsString || !usn || !college || !course) {
    // If this runs, one of the fields is truly empty.
    console.error('Missing Data Detected. Payload:', req.body);
    return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields. Please ensure all dropdowns and at least one event are selected.' 
    });
  }

  try {
    // === 4. CHECK FOR DUPLICATES ===
    const checkQuery = `
      SELECT * FROM registrations 
      WHERE usn = $1 AND name = $2 AND college = $3;
    `;
    const checkValues = [usn, name, college]; 
    
    const existingUser = await pool.query(checkQuery, checkValues);

    if (existingUser.rows.length > 0) {
      console.log('Duplicate registration blocked:', name, usn);
      return res.status(409).json({ 
        success: false, 
        message: 'You have already registered your details. Check your event selections in the WhatsApp group.' 
      });
    }

    // === 5. INSERT NEW USER (10 values total) ===
    const insertQuery = `
      INSERT INTO registrations(name, email, phone, usn, college, course, branch, year, events, message) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *;
    `;
    
    // Value order must match the column order in the query!
    const insertValues = [
      name, 
      email, 
      phone, 
      usn, 
      college, 
      course, 
      branch, 
      year, 
      eventsString, // The comma-separated string
      message
    ];

    const result = await pool.query(insertQuery, insertValues);
    console.log('Registration successful:', result.rows[0]);
    
    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error('Database insertion error:', err);
    res.status(500).json({ success: false, message: 'Internal server error. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});