const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs/promises');
const analyzeRoute = require('./routes/analyze');

dotenv.config();

const app = express();
const port = process.env.PORT || 5050;
const uploadsDir = path.join(process.cwd(), 'uploads');

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  })
);
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/analyze', analyzeRoute);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Something went wrong while processing the resume.',
  });
});

async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

ensureUploadsDir()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to prepare uploads directory:', error);
    process.exit(1);
  });
