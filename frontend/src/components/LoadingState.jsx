function LoadingState() {
  return (
    <div className="flex min-h-[18rem] items-center justify-center rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-glow backdrop-blur">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-950 text-white">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
        <p className="mt-4 text-lg font-semibold text-slate-950">Analyzing resume...</p>
        <p className="mt-1 text-sm text-slate-500">Extracting text, scoring the resume, and generating interview questions.</p>
      </div>
    </div>
  );
}

export default LoadingState;
