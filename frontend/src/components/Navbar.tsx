import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onNavigateHome: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export function Navbar({ onNavigateHome, onOpenAuth }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white hover:opacity-90 cursor-pointer"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-black text-slate-950">
              R
            </span>
            <span>Runivo</span>
          </button>

          <nav className="flex items-center gap-1">
            <button
              onClick={onNavigateHome}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800/70 hover:text-white cursor-pointer"
            >
              Problems
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-medium text-slate-200">
                  @{user.username}
                </span>
              </div>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                Sign in
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 cursor-pointer"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
