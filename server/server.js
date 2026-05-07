import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import programRoutes from './routes/programs.js';
import applicationRoutes from './routes/applications.js';
import documentVerificationRoutes from './routes/documentVerification.js';
import { initializeGridFS } from './utils/gridfsService.js';

dotenv.config();

const app = express();

// 1. IMPROVED MIDDLEWARE
// For production, you can restrict this to your IP, but this ensures 
// Nginx headers are accepted.
app.use(cors()); 
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Connect to MongoDB
connectDB();

// Initialize GridFS after connection
mongoose.connection.once('open', () => {
  initializeGridFS(mongoose.connection.db);
});

// 2. FIXED ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/programs', programRoutes);

// Fix: Avoid using the exact same base path for two different route files
// unless they are designed to merge. It's cleaner to separate them:
app.use('/api/applications', applicationRoutes);
app.use('/api/verify', documentVerificationRoutes); // Changed from /api/applications

// 3. ENHANCED HEALTH CHECK
// This helps Nginx verify if the backend is truly ready
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'UP',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// 4. PORT PARSING FIX
// Since your .env had "PORT=5000" and sometimes string errors occurred, 
// ensure PORT is treated as a Number.
const PORT = parseInt(process.env.PORT, 10) || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});