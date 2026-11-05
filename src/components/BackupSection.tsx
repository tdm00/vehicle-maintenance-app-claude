import { type ChangeEvent, useState } from 'react';
import { useLocation } from 'wouter';
import { formatDate, toLocalIso } from '../domain/dates';
import type { GarageData } from '../domain/schemas';
import { useGarage } from '../store/garageStore';
import { MAX_IMPORT_BYTES, parseImport, serialize } from '../store/storage';
import { downloadText } from './download';
import { Button, Card, ConfirmDialog } from './ui';

export function BackupSection() {
  const [, navigate] = useLocation();
  const data = useGarage((state) => state.data);
  const replaceData = useGarage((state) => state.replaceData);
  const markBackedUp = useGarage((state) => state.markBackedUp);
  const quarantined = useGarage((state) => state.quarantined);
  const [pending, setPending] = useState<GarageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const damaged = quarantined();

  function backup() {
    const today = toLocalIso(new Date());
    const copy = { ...data, settings: { ...data.settings, lastBackupAt: today } };
    downloadText(`garage-backup-${today}.json`, serialize(copy));
    markBackedUp(today);
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > MAX_IMPORT_BYTES) {
      setError('The file is larger than the 5 MB limit. Nothing was changed.');
    } else {
      const result = parseImport(await file.text());
      if (result.kind === 'ok') setPending(result.data);
      else if (result.kind === 'newer') {
        setError('This backup is from a newer version. Open the latest release to restore it.');
      } else setError(`${result.reason} Nothing was changed.`);
    }
    input.value = '';
  }

  return (
    <section aria-labelledby="backup-heading" className="mb-8">
      <h2 id="backup-heading" className="text-lg font-semibold">
        Backup
      </h2>
      <p className="mb-3 text-sm text-slate-600">
        Your data lives only in this browser. A backup file is how you move it to another browser or
        device, or keep it safe if browser data is cleared. Backup files aren't encrypted and
        include your insurance policy numbers, so store them somewhere safe.
      </p>
      <Card className="p-4">
        <p className="text-sm text-slate-700">
          Last backup:{' '}
          <strong>
            {data.settings.lastBackupAt ? formatDate(data.settings.lastBackupAt) : 'Never'}
          </strong>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={backup}>
            Download backup
          </Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600">
            Restore from file
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={chooseFile}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
        {damaged.length > 0 && (
          <div className="mt-4 border-t border-slate-200 pt-3">
            <p className="text-sm text-slate-700">
              Saved data that couldn't be read was kept here, in case it can be repaired.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {damaged.map((text, index) => (
                <Button
                  key={text}
                  onClick={() => downloadText(`garage-damaged-${index + 1}.json`, text)}
                >
                  Download damaged copy {index + 1}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>
      {pending && (
        <ConfirmDialog
          title="Replace all data?"
          confirmLabel="Replace my data"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            replaceData(pending);
            setPending(null);
            navigate('/');
          }}
        >
          <p>
            This backup has {pending.vehicles.length} vehicle(s). Everything currently in this
            browser will be replaced.
          </p>
          <Button className="mt-3" onClick={backup}>
            Download current data first
          </Button>
        </ConfirmDialog>
      )}
    </section>
  );
}
