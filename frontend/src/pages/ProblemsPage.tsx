import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Difficulty, ProblemListItem } from '../types/api';

interface ProblemsPageProps {
  onSelectProblem: (problemId: number) => void;
  onRequireAuth: () => void;
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const styles: Record<Difficulty, string> = {
    EASY: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    HARD: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${styles[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

export function ProblemsPage({
  onSelectProblem,
  onRequireAuth,
}: ProblemsPageProps) {
  const { user } = useAuth();
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [selectedTag, setSelectedTag] = useState('');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    api
      .listProblems({
        difficulty,
        tag: selectedTag || undefined,
        search: search.trim() || undefined,
        limit: 50,
      })
      .then((res) => {
        setProblems(res.items);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load problems from backend'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [difficulty, selectedTag, search]);

  useEffect(() => {
    if (!user) {
      setBookmarkedIds(new Set());
      return;
    }

    api
      .getUserBookmarks(user.id)
      .then((items) => {
        setBookmarkedIds(new Set(items.map((b) => b.problem_id)));
      })
      .catch(() => {
        // Ignore bookmark load errors silently
      });
  }, [user]);

  const toggleBookmark = async (e: React.MouseEvent, problemId: number) => {
    e.stopPropagation();
    if (!user) {
      onRequireAuth();
      return;
    }

    const isSaved = bookmarkedIds.has(problemId);
    try {
      if (isSaved) {
        await api.removeBookmark(user.id, problemId);
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          next.delete(problemId);
          return next;
        });
      } else {
        await api.addBookmark(user.id, problemId);
        setBookmarkedIds((prev) => new Set(prev).add(problemId));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update bookmark');
    }
  };

  const displayedProblems = onlyBookmarked
    ? problems.filter((p) => bookmarkedIds.has(p.id))
    : problems;

  const allTags = Array.from(
    new Set(problems.flatMap((p) => p.tags.map((t) => t.name)))
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Hero Banner */}
      <div className="mb-8 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 p-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Master Algorithms on Runivo
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Pick a problem, write your code in Python, JavaScript, C++, or C, and
          get instant automated verdicts from the FastAPI + Celery Judge Engine.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search problem title..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden sm:w-64"
        />

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
          className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-hidden"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        <button
          type="button"
          onClick={() => setOnlyBookmarked((v) => !v)}
          className={`rounded-xl border px-3.5 py-2 text-xs font-medium transition cursor-pointer ${
            onlyBookmarked
              ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
              : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          ★ Bookmarked Only
        </button>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() =>
                  setSelectedTag((curr) => (curr === tag ? '' : tag))
                }
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Problems Table */}
      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
          <p className="font-semibold">Failed to connect to Runivo Backend</p>
          <p className="mt-1 text-xs text-rose-400">{error}</p>
          <p className="mt-2 text-xs text-slate-400">
            Make sure PostgreSQL is running (`docker compose up -d`) and the
            backend server (`cd backend && npm run dev`) is running on port
            3000.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-sm text-slate-400">
          Loading problems...
        </div>
      ) : displayedProblems.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <p className="text-base font-medium text-slate-300">
            No problems found
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Run <code className="text-emerald-400">cd backend && npm run seed</code>{' '}
            to populate the starter problems!
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/90 text-xs uppercase text-slate-400">
              <tr>
                <th className="w-12 px-4 py-3.5 text-center">★</th>
                <th className="w-16 px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Title</th>
                <th className="px-4 py-3.5">Tags</th>
                <th className="w-32 px-4 py-3.5">Difficulty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {displayedProblems.map((problem) => {
                const isBookmarked = bookmarkedIds.has(problem.id);
                return (
                  <tr
                    key={problem.id}
                    onClick={() => onSelectProblem(problem.id)}
                    className="group transition hover:bg-slate-800/50 cursor-pointer"
                  >
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(e, problem.id)}
                        title={
                          isBookmarked ? 'Remove bookmark' : 'Bookmark problem'
                        }
                        className={`text-base transition cursor-pointer ${
                          isBookmarked
                            ? 'text-amber-400'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        ★
                      </button>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                      {problem.id}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-100 group-hover:text-emerald-400">
                      {problem.title}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {problem.tags.map((t) => (
                          <span
                            key={t.id}
                            className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
