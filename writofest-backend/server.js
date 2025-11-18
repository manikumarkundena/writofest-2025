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

// Simple home route
app.get('/', (req, res) => {
  res.send('WritoFest Backend is running!');
});

// =============================================
// 🚫 REGISTRATIONS CLOSED
// =============================================
app.post('/register', (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Registrations are now closed. Thank you for making WritoFest 2K25 a grand success! ❤️"
  });
});
// =============================================

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
