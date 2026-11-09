const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const readingsRoutes = require('./routes/readingsRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth & Readings Routes
app.use('/api/auth', authRoutes);
app.use('/api/readings', readingsRoutes);

// Central Error Handler
app.use(errorHandler);

module.exports = app;
