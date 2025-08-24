const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');   // loads .env + centralizes vars
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const conversationRoutes = require("./routes/conversations");
const friendshipRoutes = require("./routes/friendship");
const uploadRoutes = require('./routes/upload');
const app = express();

// ──────────────────────────────────────
// Global Middleware
// ──────────────────────────────────────
app.use(cors({
  origin: true,   // Allow all origins
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));  // JSON body parser
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ──────────────────────────────────────
// Health Check
// ──────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));




app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/friendship", friendshipRoutes);
app.use("/api/upload", uploadRoutes)


app.use('/api', (req, res) => res.send('API root – routes coming soon!'));


// ──────────────────────────────────────
// 404 + Error Handlers
// ──────────────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;