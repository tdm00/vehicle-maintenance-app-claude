import { useState } from 'react';

const KEY = 'garage.skeleton';

export function App() {
  const [count, setCount] = useState(() => Number(localStorage.getItem(KEY) ?? 0));

  function increment() {
    const next = count + 1;
    localStorage.setItem(KEY, String(next));
    setCount(next);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Garage</h1>
      <button
        type="button"
        className="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
        onClick={increment}
      >
        Count: {count}
      </button>
    </main>
  );
}
