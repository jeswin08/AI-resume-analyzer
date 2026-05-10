function ScoreCard({ score }) {
  const safeScore = Number.isFinite(Number(score)) ? Number(score) : 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-glow backdrop-blur">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Resume Score</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-5xl font-semibold text-slate-950">{safeScore}</h3>
          <p className="mt-1 text-sm text-slate-500">out of 100</p>
        </div>
        <div className="h-24 w-24 rounded-full border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-700 p-1">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-center text-sm font-semibold text-slate-900">
            {safeScore >= 80 ? 'Strong' : safeScore >= 60 ? 'Solid' : 'Needs work'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScoreCard;
