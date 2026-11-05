import { useState } from 'react';
import { useGarage } from '../store/garageStore';
import { downloadText } from './download';
import { Button, Card, ConfirmDialog } from './ui';

/** Shown instead of the app when saved data can't be used. It never changes that data on its own. */
export function RecoveryScreen() {
  const status = useGarage((state) => state.status);
  const rawSaved = useGarage((state) => state.rawSaved);
  const discardSaved = useGarage((state) => state.discardSaved);
  const [confirming, setConfirming] = useState(false);

  const newer = status === 'newer';

  return (
    <div className="mx-auto max-w-lg">
      <Card className="p-6">
        <h1 className="text-xl font-bold">
          {newer ? 'This data is from a newer version' : "We couldn't read your saved data"}
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          {newer
            ? 'Your garage was saved by a newer version of this app. Open the latest release to use it. Your data has not been changed.'
            : "Your saved data looks damaged. It hasn't been deleted. Download a copy before doing anything else."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() => downloadText('garage-recovery.json', rawSaved() ?? '')}
          >
            Download my data
          </Button>
          {!newer && (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Start over
            </Button>
          )}
        </div>
      </Card>
      {confirming && (
        <ConfirmDialog
          title="Start with an empty garage?"
          confirmLabel="Start over"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            discardSaved();
            setConfirming(false);
          }}
        >
          Make sure you've downloaded your data first.
        </ConfirmDialog>
      )}
    </div>
  );
}
