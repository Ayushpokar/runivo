import { useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { Navbar } from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { ProblemsPage } from './pages/ProblemsPage';
import { ProblemWorkspacePage } from './pages/ProblemWorkspacePage';

export function App() {
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(
    null
  );
  const [authModalMode, setAuthModalMode] = useState<
    'login' | 'register' | null
  >(null);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar
          onNavigateHome={() => setSelectedProblemId(null)}
          onOpenAuth={(mode) => setAuthModalMode(mode)}
        />

        {selectedProblemId === null ? (
          <ProblemsPage
            onSelectProblem={(id) => setSelectedProblemId(id)}
            onRequireAuth={() => setAuthModalMode('login')}
          />
        ) : (
          <ProblemWorkspacePage
            problemId={selectedProblemId}
            onBack={() => setSelectedProblemId(null)}
            onRequireAuth={() => setAuthModalMode('login')}
          />
        )}

        {authModalMode !== null && (
          <AuthModal
            initialMode={authModalMode}
            onClose={() => setAuthModalMode(null)}
          />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;
