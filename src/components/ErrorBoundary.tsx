import { Component, type ReactNode } from 'react';

/** Catches render crashes so the player sees a recover screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { err: String((e as Error)?.message ?? e) }; }
  componentDidCatch(e: unknown) { console.warn('[magic] crash caught', e); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 p-6">
        <div className="glass-panel rounded-2xl p-6 max-w-sm text-center text-slate-200">
          <h2 className="gold-gradient-text font-cinzel font-black text-xl mb-2">The spell fizzled</h2>
          <p className="text-xs text-slate-400 mb-4 break-words">{this.state.err}</p>
          <button className="px-5 py-2 rounded-lg bg-amber-500 text-black font-bold" onClick={() => location.reload()}>Reload</button>
        </div>
      </div>
    );
  }
}
