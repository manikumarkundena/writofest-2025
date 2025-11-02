require('dotenv').config(); 
const express = require('express');
const cors = require('cors'); 
const { Pool } = require('pg');

const app = express();
// Render automatically sets the PORT variable
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
  
  // --- 1. EXTRACT DATA SAFELY ---
  // Accessing fields directly from req.body is the most robust method
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
  
  // Events array is sent under the key 'events[]'
  let events = data['events[]']; 

  // --- 2. CONSOLIDATE DATA & CREATE FINAL STRINGS ---
  
  // Handle Branch 'Other' Consolidation
  // If 'Other' is selected and a custom branch is provided, use the custom value.
  const finalBranch = (branch === 'Other' && data.otherBranch) ? data.otherBranch : branch;
  
  // Handle Multi-Select Events (Convert array to a single comma-separated string)
  if (typeof events === 'string') {
      events = [events];
  }
  const eventsString = Array.isArray(events) ? events.join(', ') : '';

  // --- 3. ROBUST VALIDATION CHECK ---
  // We check that ALL fields required for the INSERT query are not empty strings.
  if (!name || !email || !eventsString || !usn || !college || !course || !finalBranch || !year) { 
    
    console.error('MISSING REQUIRED DATA PAYLOAD:', req.body);
    
    return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields. Please ensure all fields are selected (Course, Branch, Year, and at least one Event).' 
    });
  }

  try {
    // === 4. CHECK IF USER EXISTS (UPSERT Logic) ===
    // We check ONLY by USN, as it is the unique identifier.
    const findQuery = `SELECT * FROM registrations WHERE usn = $1;`;
    const findValues = [usn]; 
    
    const existingUser = await pool.query(findQuery, findValues);

    if (existingUser.rows.length > 0) {
      // === 5. USER FOUND: UPDATE THE EXISTING ROW (Solves the "already registered" error) ===
      const updateQuery = `
        UPDATE registrations SET 
          name = $1, 
          email = $2, 
          phone = $3, 
          college = $4, 
          course = $5, 
          branch = $6, 
          year = $7, 
          events = $8, 
          message = $9
        WHERE usn = $10 
        RETURNING *;
      `;
      // Values must match the column order
      const updateValues = [
        name, email, phone, college, course, finalBranch, year, eventsString, message, // $1 to $9
        usn // $10 (for WHERE clause)
      ];

      await pool.query(updateQuery, updateValues);
      console.log('Registration Updated (UPSERT) for USN:', usn);
      
      // Return 200 (OK) status for a successful update
      return res.status(200).json({ success: true, message: 'Registration updated successfully.' });

    } else {
      // === 6. USER NOT FOUND: INSERT NEW ROW ===
      const insertQuery = `
        INSERT INTO registrations(name, email, phone, usn, college, course, branch, year, events, message) 
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *;
      `;
      // Value order must match the column order exactly!
      const insertValues = [
        name, email, phone, usn, college, course, finalBranch, year, eventsString, message
      ];

      await pool.query(insertQuery, insertValues);
      console.log('Registration Inserted (NEW ROW) for USN:', usn);
      
      // Return 201 (Created) status for a new insertion
      return res.status(201).json({ success: true, message: 'Registration successful.' });
    }

  } catch (err) {
    console.error('Database process error:', err);
    res.status(500).json({ success: false, message: 'Internal server error. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});