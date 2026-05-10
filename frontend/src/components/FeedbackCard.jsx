function FeedbackCard({ feedback = [] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-glow backdrop-blur">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Feedback</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-950">Suggestions to improve the resume</h3>
      <ul className="mt-4 space-y-3">
        {feedback.length > 0 ? (
          feedback.map((item, index) => (
            <li key={`${index}-${item}`} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-slate-900" />
              <span>{item}</span>
            </li>
          ))
        ) : (
          <li className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No feedback available yet.</li>
        )}
      </ul>
    </div>
  );
}

export default FeedbackCard;
