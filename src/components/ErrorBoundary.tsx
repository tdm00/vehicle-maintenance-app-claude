import { Component, type ReactNode } from 'react';
import { garageStore } from '../store/garageStore';
import { serialize } from '../store/storage';
import { downloadText } from './download';

/** The last line of defense: a rendering bug must never cost the user their data. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-700">
          Your data is safe. Download a copy, then reload the page.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-11 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
            onClick={() =>
              downloadText('garage-recovery.json', serialize(garageStore.getState().data))
            }
          >
            Download my data
          </button>
          <button
            type="button"
            className="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-slate-300"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </main>
    );
  }
}
