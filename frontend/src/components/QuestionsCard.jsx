function QuestionsCard({ questions = [] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-glow backdrop-blur">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Interview Questions</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-950">Questions to prepare for</h3>
      <ol className="mt-4 space-y-3">
        {questions.length > 0 ? (
          questions.map((question, index) => (
            <li key={`${index}-${question}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              <span className="mr-2 font-semibold text-slate-950">{index + 1}.</span>
              {question}
            </li>
          ))
        ) : (
          <li className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No interview questions available yet.</li>
        )}
      </ol>
    </div>
  );
}

export default QuestionsCard;
