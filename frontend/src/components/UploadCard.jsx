function UploadCard({ fileLabel, error, isLoading, onFileChange, onAnalyze }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-glow backdrop-blur">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-950">Upload Resume</h2>
        <p className="text-sm leading-6 text-slate-600">PDF files only. The backend extracts text and analyzes it with Google Gemini.</p>
      </div>

      <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-slate-400 hover:bg-slate-100">
        <input accept="application/pdf" className="hidden" type="file" onChange={onFileChange} />
        <div className="space-y-2">
          <p className="text-lg font-medium text-slate-900">Drop your PDF resume here</p>
          <p className="text-sm text-slate-500">or click to browse your files</p>
        </div>
        <div className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
          {fileLabel}
        </div>
      </label>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isLoading}
        onClick={onAnalyze}
        type="button"
      >
        Analyze Resume
      </button>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Best results come from text-based PDFs with clear section headings and work history.
      </p>
    </div>
  );
}

export default UploadCard;
