const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend-backend interaction
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Serve static assets from the frontend directory
app.use(express.static(path.join(__dirname, '../client')));

// Register API Routes
app.use('/api', apiRoutes);

// Fallback to client application for client-side routing (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
    console.error('[-] Unhandled Server Error:', err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'A critical backend error occurred.'
    });
});

// Start listening
app.listen(PORT, () => {
    console.log(`[+] DataVault Server is online on http://localhost:${PORT}`);
});
