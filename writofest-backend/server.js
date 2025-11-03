require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// === PostgreSQL Connection ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('WritoFest Backend is running!');
});

app.post('/register', async (req, res) => {
  const data = req.body;

  const { name, email, phone, usn, college, course, branch, year, message, referrer_code } = data;
  let events = data.events || data['events[]'];

  // Convert events array → comma-separated string
  const eventsString = Array.isArray(events) ? events.join(', ') : '';

  const finalBranch = (branch === 'Other' && data.otherBranch) ? data.otherBranch : branch;

  // === Validation ===
  if (!name || !email || !usn || !college || !course || !finalBranch || !year || !eventsString) {
    console.error('MISSING REQUIRED FIELDS:', req.body);
    return res.status(400).json({
      success: false,
      message: 'Missing required fields. Please ensure all dropdowns and at least one event are selected.'
    });
  }

  try {
    // Check if USN already exists
    const findQuery = `SELECT * FROM registrations WHERE usn = $1;`;
    const existingUser = await pool.query(findQuery, [usn]);

    if (existingUser.rows.length > 0) {
      const updateQuery = `
        UPDATE registrations SET
          name=$1, email=$2, phone=$3, college=$4, course=$5,
          branch=$6, year=$7, events=$8, message=$9, referrer_code=$10
        WHERE usn=$11 RETURNING *;
      `;
      const updateValues = [name, email, phone, college, course, finalBranch, year, eventsString, message, referrer_code, usn];
      await pool.query(updateQuery, updateValues);
      console.log('Updated registration for USN:', usn);
      return res.status(200).json({ success: true, message: 'Registration updated successfully.' });
    } else {
      const insertQuery = `
        INSERT INTO registrations(name, email, phone, usn, college, course, branch, year, events, message, referrer_code)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *;
      `;
      const insertValues = [name, email, phone, usn, college, course, finalBranch, year, eventsString, message, referrer_code];
      await pool.query(insertQuery, insertValues);
      console.log('New registration inserted for USN:', usn);
      return res.status(201).json({ success: true, message: 'Registration successful.' });
    }

  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
