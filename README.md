# AI Resume Analyzer

A simple full-stack resume analyzer built with React, Tailwind CSS, Node.js, Express, Multer, pdf-parse, and Google Gemini AI.

## Features

- Upload PDF resumes only
- Extract resume text on the backend
- Send resume text to Google Gemini for structured analysis
- Show resume score, feedback, and interview questions in a clean dashboard UI
- Friendly error handling and loading states

## Project Structure

```text
resume-analyzer/
├── frontend/
├── backend/
├── uploads/
```

## Setup

1. Install dependencies from the project root:

```bash
npm install
```

2. Set up the backend environment file:

```bash
cp backend/.env.example backend/.env
```

3. Fill in your Google Gemini API key in `backend/.env`.

4. Start both apps:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend runs on `http://localhost:5050`.

## Environment Variables

Backend:

- `PORT` - Server port, default `5050`
- `GOOGLE_API_KEY` - Your Google Gemini API key
- `GOOGLE_MODEL` - Optional model name, default `gemini-1.5-flash`
- `CORS_ORIGIN` - Optional frontend origin, default `http://localhost:5173`

Frontend:

- `VITE_API_URL` - Backend API URL, default `http://localhost:5050`

## Notes

- The backend accepts PDF files only.
- Uploaded files are stored temporarily in `uploads/` and removed after analysis.
- The Gemini response is returned as structured JSON.
