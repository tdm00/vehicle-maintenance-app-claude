import { Link } from 'wouter';
import { useGarage } from '../store/garageStore';

const MESSAGES = {
  unavailable: 'This browser is blocking storage, so your changes will be lost when you close it.',
  writeFailed: "Your latest change couldn't be saved, because browser storage may be full.",
};

export function StorageBanner() {
  const warning = useGarage((state) => state.warning);
  if (!warning) return null;

  return (
    <div role="alert" className="bg-red-700 text-white">
      <p className="mx-auto max-w-5xl px-4 py-2 text-sm font-medium">
        {MESSAGES[warning]}{' '}
        <Link href="/settings" className="underline underline-offset-2">
          Download a backup
        </Link>
      </p>
    </div>
  );
}
