const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const { analyzeResumeText } = require('../services/openai');

const router = express.Router();
const uploadsDir = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';

    if (!isPdf) {
      const error = new Error('Only PDF files are allowed.');
      error.statusCode = 400;
      return cb(error, false);
    }

    cb(null, true);
  },
});

router.post('/', upload.single('resume'), async (req, res, next) => {
  const uploadedFile = req.file;

  if (!uploadedFile) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a PDF resume before analyzing.',
    });
  }

  try {
    const fileBuffer = await fs.readFile(uploadedFile.path);
    const parsedPdf = await pdfParse(fileBuffer);
    const resumeText = parsedPdf.text.trim();

    if (!resumeText) {
      return res.status(400).json({
        success: false,
        message: 'We could not read text from this PDF. Please upload a text-based resume PDF.',
      });
    }

    const analysis = await analyzeResumeText(resumeText);

    res.json({
      success: true,
      message: 'Resume analyzed successfully.',
      data: analysis,
    });
  } catch (error) {
    next(error);
  } finally {
    if (uploadedFile?.path) {
      fs.unlink(uploadedFile.path).catch(() => {});
    }
  }
});

module.exports = router;
