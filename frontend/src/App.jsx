import { useMemo, useState } from 'react';
import axios from 'axios';
import UploadCard from './components/UploadCard';
import ScoreCard from './components/ScoreCard';
import FeedbackCard from './components/FeedbackCard';
import QuestionsCard from './components/QuestionsCard';
import LoadingState from './components/LoadingState';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fileLabel = useMemo(() => {
    if (!selectedFile) {
      return 'No file selected';
    }

    return selectedFile.name;
  }, [selectedFile]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setError('Please upload a PDF file only.');
      setSelectedFile(null);
      event.target.value = '';
      return;
    }

    setError('');
    setAnalysis(null);
    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please choose a PDF resume first.');
      return;
    }

    const formData = new FormData();
    formData.append('resume', selectedFile);

    try {
      setIsLoading(true);
      setError('');

      const response = await axios.post(`${apiBaseUrl}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAnalysis(response.data.data);
    } catch (requestError) {
      const friendlyMessage =
        requestError.response?.data?.message || 'We could not analyze this resume. Please try again.';

      setError(friendlyMessage);
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-glow backdrop-blur sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-sm font-medium text-slate-700">
                AI Resume Analyzer
              </span>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  Turn any resume into a clear score, practical feedback, and interview prep.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Upload a PDF resume, let the backend extract the text, and get structured AI analysis in seconds.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-xl animate-float">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.28em] text-slate-300">Live workflow</p>
                <div className="space-y-2">
                  <p className="text-2xl font-semibold">Upload</p>
                  <p className="text-slate-300">Extract text from PDF</p>
                  <p className="text-slate-300">Send to OpenAI</p>
                  <p className="text-slate-300">Show score and insights</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <UploadCard
            fileLabel={fileLabel}
            isLoading={isLoading}
            error={error}
            onFileChange={handleFileChange}
            onAnalyze={handleAnalyze}
          />

          <div className="space-y-6">
            {isLoading ? (
              <LoadingState />
            ) : analysis ? (
              <>
                <ScoreCard score={analysis.score} />
                <FeedbackCard feedback={analysis.feedback} />
                <QuestionsCard questions={analysis.interviewQuestions} />
              </>
            ) : (
              <div className="flex min-h-[18rem] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-500 backdrop-blur">
                Your analysis will appear here after you upload a PDF resume and click Analyze Resume.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
