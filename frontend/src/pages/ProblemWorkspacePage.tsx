import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  ProblemDetail,
  SubmissionItem,
  SubmissionVerdict,
  SupportedLanguage,
} from '../types/api';
import { DifficultyBadge } from './ProblemsPage';

interface ProblemWorkspacePageProps {
  problemId: number;
  onBack: () => void;
  onRequireAuth: () => void;
}

const STARTER_CODE: Record<SupportedLanguage, string> = {
  python: `import sys

def solve():
    input_data = sys.stdin.read().strip().split()
    if not input_data:
        return
    # Write your solution here
    print(input_data[0])

if __name__ == "__main__":
    solve()
`,
  javascript: `const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
  if (!input.length) return;
  // Write your solution here
  console.log(input[0]);
}

solve();
`,
  cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // Write your solution here
    return 0;
}
`,
  c: `#include <stdio.h>

int main() {
    // Write your solution here
    return 0;
}
`,
};

function VerdictBadge({
  status,
  verdict,
}: {
  status: string;
  verdict: SubmissionVerdict | null;
}) {
  if (status === 'QUEUED' || status === 'RUNNING') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-300">
        <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
        {status}...
      </span>
    );
  }

  const styles: Record<string, string> = {
    ACCEPTED: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    WRONG_ANSWER: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
    TIME_LIMIT_EXCEEDED: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    RUNTIME_ERROR: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
    COMPILATION_ERROR: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    INTERNAL_ERROR: 'border-slate-600 bg-slate-800 text-slate-300',
  };

  const label = verdict ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
        styles[label] ?? 'border-slate-700 bg-slate-800 text-slate-300'
      }`}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}

export function ProblemWorkspacePage({
  problemId,
  onBack,
  onRequireAuth,
}: ProblemWorkspacePageProps) {
  const { user } = useAuth();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Left pane tabs
  const [activeTab, setActiveTab] = useState<
    'description' | 'notes' | 'submissions'
  >('description');
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Notes state
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);

  // Submissions & Code Editor state
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>(STARTER_CODE.python);
  const [submitting, setSubmitting] = useState(false);
  const [latestSubmission, setLatestSubmission] =
    useState<SubmissionItem | null>(null);
  const [submissionsHistory, setSubmissionsHistory] = useState<
    SubmissionItem[]
  >([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getProblemById(problemId)
      .then((data) => {
        setProblem(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load problem');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [problemId]);

  // Load user-specific bookmark, note, and submission history
  useEffect(() => {
    if (!user) {
      setIsBookmarked(false);
      setNoteText('');
      setSubmissionsHistory([]);
      return;
    }

    api
      .getUserBookmarks(user.id)
      .then((bookmarks) => {
        setIsBookmarked(bookmarks.some((b) => b.problem_id === problemId));
      })
      .catch(() => {});

    api
      .getNote(user.id, problemId)
      .then((note) => {
        setNoteText(note?.notes_description ?? '');
      })
      .catch(() => {});

    api
      .listSubmissions({ user_id: user.id, problem_id: problemId, limit: 25 })
      .then((items) => {
        setSubmissionsHistory(items);
      })
      .catch(() => {});
  }, [user, problemId]);

  // Poll latestSubmission while status is QUEUED or RUNNING
  useEffect(() => {
    if (
      !latestSubmission ||
      (latestSubmission.status !== 'QUEUED' &&
        latestSubmission.status !== 'RUNNING')
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await api.getSubmissionById(latestSubmission.id);
        setLatestSubmission(updated);

        if (updated.status === 'COMPLETED' || updated.status === 'FAILED') {
          setSubmissionsHistory((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
        }
      } catch {
        // Ignore transient polling error
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [latestSubmission]);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setCode(STARTER_CODE[newLang]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = code.substring(0, start) + '    ' + code.substring(end);
      setCode(updated);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      });
    }
  };

  const handleToggleBookmark = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }

    try {
      if (isBookmarked) {
        await api.removeBookmark(user.id, problemId);
        setIsBookmarked(false);
      } else {
        await api.addBookmark(user.id, problemId);
        setIsBookmarked(true);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bookmark update failed');
    }
  };

  const handleSaveNote = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }

    setSavingNote(true);
    setNoteStatus(null);
    try {
      await api.upsertNote(user.id, problemId, noteText);
      setNoteStatus('Note saved!');
      setTimeout(() => setNoteStatus(null), 2500);
    } catch (err) {
      setNoteStatus(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }

    if (!code.trim()) {
      alert('Source code cannot be empty');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createSubmission({
        user_id: user.id,
        problem_id: problemId,
        language,
        source_code: code,
      });
      setLatestSubmission(created);
      setSubmissionsHistory((prev) => [created, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit code');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-slate-400">
        Loading problem workspace...
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <button
          onClick={onBack}
          className="mb-4 text-sm text-emerald-400 hover:underline cursor-pointer"
        >
          ← Back to Problems
        </button>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
          {error ?? 'Problem not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      {/* LEFT PANE: Problem Description / Notes / Submissions */}
      <div className="flex w-full flex-col border-b border-slate-800 bg-slate-950 lg:h-full lg:w-1/2 lg:border-r lg:border-b-0">
        {/* Top bar + Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              ← Problems
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <button
              onClick={() => setActiveTab('description')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === 'description'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Submissions ({submissionsHistory.length})
            </button>
          </div>

          <button
            onClick={handleToggleBookmark}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
              isBookmarked
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {isBookmarked ? '★ Bookmarked' : '☆ Bookmark'}
          </button>
        </div>

        {/* Left Pane Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'description' && (
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-bold text-white">
                    {problem.id}. {problem.title}
                  </h1>
                  <DifficultyBadge difficulty={problem.difficulty} />
                </div>

                {problem.tags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {problem.tags.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-md bg-slate-800/90 px-2 py-0.5 text-xs text-slate-400"
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {problem.description}
              </div>

              {(problem.input_format || problem.output_format) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {problem.input_format && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Input Format
                      </h3>
                      <p className="mt-1.5 whitespace-pre-line text-xs text-slate-300">
                        {problem.input_format}
                      </p>
                    </div>
                  )}
                  {problem.output_format && (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Output Format
                      </h3>
                      <p className="mt-1.5 whitespace-pre-line text-xs text-slate-300">
                        {problem.output_format}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Examples */}
              {problem.examples.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">Examples</h3>
                  {problem.examples.map((ex, idx) => (
                    <div
                      key={ex.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs"
                    >
                      <p className="mb-2 font-semibold text-slate-300">
                        Example {idx + 1}:
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <span className="text-slate-500">Input:</span>
                          <pre className="mt-1 rounded-lg bg-slate-950 p-2.5 text-slate-200">
                            {ex.example_input}
                          </pre>
                        </div>
                        <div>
                          <span className="text-slate-500">Output:</span>
                          <pre className="mt-1 rounded-lg bg-slate-950 p-2.5 text-emerald-300">
                            {ex.example_output}
                          </pre>
                        </div>
                      </div>
                      {ex.explanation && (
                        <p className="mt-2.5 text-slate-400">
                          <span className="font-medium text-slate-300">
                            Explanation:
                          </span>{' '}
                          {ex.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Constraints */}
              {problem.constraints.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white">
                    Constraints
                  </h3>
                  <ul className="list-inside list-disc space-y-1.5 text-xs text-slate-300">
                    {problem.constraints.map((c) => (
                      <li key={c.id}>
                        <code className="rounded bg-slate-900 px-1.5 py-0.5 text-slate-200">
                          {c.constraint_text}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hints */}
              {problem.hints.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Hints</h3>
                  {problem.hints.map((hint, idx) => {
                    const isOpen = revealedHints.has(hint.id);
                    return (
                      <div
                        key={hint.id}
                        className="rounded-xl border border-slate-800 bg-slate-900/50"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedHints((prev) => {
                              const next = new Set(prev);
                              if (next.has(hint.id)) next.delete(hint.id);
                              else next.add(hint.id);
                              return next;
                            })
                          }
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                        >
                          <span>💡 Hint {idx + 1}</span>
                          <span>{isOpen ? 'Hide' : 'Show'}</span>
                        </button>
                        {isOpen && (
                          <p className="border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
                            {hint.hint_description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="flex h-full flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Personal Problem Notes
                  </h2>
                  <p className="text-xs text-slate-400">
                    Jot down your time complexity ideas, edge cases, or approach
                    for {problem.title}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
                >
                  {savingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>

              {noteStatus && (
                <p className="text-xs text-emerald-400">{noteStatus}</p>
              )}

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write your personal notes here..."
                className="min-h-[280px] flex-1 resize-none rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          )}

          {activeTab === 'submissions' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white">
                Your Submissions
              </h2>
              {!user ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-xs text-slate-400">
                  Sign in to view and track your submissions.
                </div>
              ) : submissionsHistory.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-xs text-slate-400">
                  No submissions yet for this problem.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-900 text-slate-400">
                      <tr>
                        <th className="px-3.5 py-2.5">ID</th>
                        <th className="px-3.5 py-2.5">Verdict</th>
                        <th className="px-3.5 py-2.5">Language</th>
                        <th className="px-3.5 py-2.5">Runtime</th>
                        <th className="px-3.5 py-2.5">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
                      {submissionsHistory.map((sub) => (
                        <tr key={sub.id}>
                          <td className="px-3.5 py-2.5 font-mono text-slate-400">
                            #{sub.id}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <VerdictBadge
                              status={sub.status}
                              verdict={sub.verdict}
                            />
                          </td>
                          <td className="px-3.5 py-2.5 uppercase text-slate-300">
                            {sub.language}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-300">
                            {sub.execution_time_ms !== null
                              ? `${sub.execution_time_ms} ms`
                              : '—'}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500">
                            {new Date(sub.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Code Editor & Live Verdict Console */}
      <div className="flex w-full flex-col bg-slate-950 lg:h-full lg:w-1/2">
        {/* Editor Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-4 py-2">
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-medium text-slate-400">
              Language:
            </label>
            <select
              value={language}
              onChange={(e) =>
                handleLanguageChange(e.target.value as SupportedLanguage)
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-200 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="cpp">C++ (GCC 17)</option>
              <option value="c">C (GCC)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCode(STARTER_CODE[language])}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Reset Template
            </button>
            <button
              type="button"
              onClick={handleSubmitCode}
              disabled={submitting}
              className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Submitting...' : '▶ Submit Solution'}
            </button>
          </div>
        </div>

        {/* Code Editor Textarea */}
        <div className="relative flex-1 overflow-hidden">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className="code-editor h-full w-full resize-none bg-slate-950 p-5 text-sm leading-6 text-emerald-100 focus:outline-hidden"
            placeholder="Write your code here..."
          />
        </div>

        {/* Bottom Console: Live Verdict + Sample Test Cases */}
        <div className="h-56 overflow-y-auto border-t border-slate-800 bg-slate-900/80 p-4">
          {latestSubmission ? (
            <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400">
                    Submission #{latestSubmission.id} Result:
                  </span>
                  <VerdictBadge
                    status={latestSubmission.status}
                    verdict={latestSubmission.verdict}
                  />
                </div>
                {latestSubmission.execution_time_ms !== null && (
                  <span className="font-mono text-xs text-slate-400">
                    Runtime: {latestSubmission.execution_time_ms} ms
                  </span>
                )}
              </div>
            </div>
          ) : null}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sample Test Cases ({problem.test_cases.length})
            </h3>
            {problem.test_cases.length === 0 ? (
              <p className="text-xs text-slate-500">
                No sample test cases available.
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {problem.test_cases.map((tc, i) => (
                  <div
                    key={tc.id}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs"
                  >
                    <p className="mb-1.5 font-medium text-slate-400">
                      Sample #{i + 1}
                    </p>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-slate-500">stdin:</span>
                        <pre className="mt-0.5 rounded bg-slate-900 p-1.5 text-slate-200">
                          {tc.input_data}
                        </pre>
                      </div>
                      <div>
                        <span className="text-slate-500">expected stdout:</span>
                        <pre className="mt-0.5 rounded bg-slate-900 p-1.5 text-emerald-300">
                          {tc.expected_output}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
