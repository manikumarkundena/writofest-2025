require('dotenv').config(); 
const express = require('express');
const cors = require('cors'); 
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(cors()); 
app.use(express.json());

app.get('/', (req, res) => {
  res.send('WritoFest Backend is running!');
});

app.post('/register', async (req, res) => {
  const { name, email, phone, usn, branch, year, event, message } = req.body; 

  // Updated validation to include USN
  if (!name || !email || !event || !usn) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    // === NEW LOGIC: CHECK FOR DUPLICATES ===
    // We check if a user with this USN and Name is already in this specific Event
    const checkQuery = `
      SELECT * FROM registrations 
      WHERE usn = $1 AND name = $2 AND event = $3;
    `;
    const checkValues = [usn, name, event];
    
    const existingUser = await pool.query(checkQuery, checkValues);

    if (existingUser.rows.length > 0) {
      // A duplicate was found! Send back a 409 Conflict error.
      console.log('Duplicate registration blocked:', name, usn, event);
      return res.status(409).json({ 
        success: false, 
        message: 'You are already registered for this event. Try registering for another event!' 
      });
    }
    // === END OF NEW LOGIC ===


    // If no duplicate, proceed with inserting the new user
    const insertQuery = `
      INSERT INTO registrations(name, email, phone, usn, branch, year, event, message) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *;
    `;
    const insertValues = [name, email, phone, usn, branch, year, event, message];

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