import { type ReactNode, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const main = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // A hash route change is silent to screen readers, so move focus to the new content.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on each location change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    main.current?.focus();
    window.scrollTo?.(0, 0);
  }, [location]);

  return (
    <div className="min-h-dvh">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2">
          <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-bold">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-lg bg-brand-500 text-slate-950"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                <path d="M12 3 2 9v12h3V11h14v10h3V9L12 3Zm-5 10v2h10v-2H7Zm0 4v2h10v-2H7Z" />
              </svg>
            </span>
            Garage
          </Link>
          <nav aria-label="Main">
            <Link
              href="/settings"
              className="flex min-h-11 items-center px-2 text-sm font-medium text-slate-200 hover:text-white"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>
      <main ref={main} tabIndex={-1} className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
