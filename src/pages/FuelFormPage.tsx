import { type FormEvent, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  type FieldErrors,
  focusFirstError,
  toFieldErrors,
  toNumber,
} from '../components/formErrors';
import { BackLink, Button, Card, ConfirmDialog, PageTitle, TextField } from '../components/ui';
import { vehicleName } from '../components/VehicleCard';
import { toLocalIso } from '../domain/dates';
import { centsToInput, parseDollars } from '../domain/money';
import { currentOdometer, isBelowKnownOdometer } from '../domain/odometer';
import { fuelFillUpSchema, type Vehicle } from '../domain/schemas';
import { useGarage } from '../store/garageStore';
import { NotFoundPage } from './NotFoundPage';

export function FuelFormPage() {
  const { id, fillUpId } = useParams<{ id: string; fillUpId?: string }>();
  const data = useGarage((state) => state.data);
  const vehicle = data.vehicles.find((entry) => entry.id === id);
  const fillUp = data.fuelFillUps.find((entry) => entry.id === fillUpId);
  if (!vehicle || (fillUpId && !fillUp)) return <NotFoundPage />;
  return <FuelForm key={fillUpId ?? 'new'} vehicle={vehicle} fillUpId={fillUpId} />;
}

function FuelForm({ vehicle, fillUpId }: { vehicle: Vehicle; fillUpId?: string }) {
  const [, navigate] = useLocation();
  const data = useGarage((state) => state.data);
  const saveFuelFillUp = useGarage((state) => state.saveFuelFillUp);
  const deleteFuelFillUp = useGarage((state) => state.deleteFuelFillUp);
  const form = useRef<HTMLFormElement>(null);

  const existing = data.fuelFillUps.find((entry) => entry.id === fillUpId);
  const known = currentOdometer(vehicle, data.serviceRecords, data.fuelFillUps);
  const listHref = `/vehicles/${vehicle.id}/fuel`;

  const [date, setDate] = useState(existing?.date ?? toLocalIso(new Date()));
  const [odometer, setOdometer] = useState(existing ? String(existing.odometer) : '');
  const [gallons, setGallons] = useState(existing ? String(existing.gallons) : '');
  const [cost, setCost] = useState(existing ? centsToInput(existing.costCents) : '');
  const [isFull, setIsFull] = useState(existing?.isFull ?? true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirming, setConfirming] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const costCents = parseDollars(cost);
    const parsed = fuelFillUpSchema.safeParse({
      id: fillUpId ?? 'new',
      vehicleId: vehicle.id,
      date,
      odometer: toNumber(odometer),
      gallons: toNumber(gallons),
      costCents: costCents ?? undefined,
      isFull,
    });
    if (!parsed.success) {
      const fieldErrors = toFieldErrors(parsed.error);
      if (costCents === null) fieldErrors.costCents = 'Enter an amount, such as 45.50';
      setErrors(fieldErrors);
      focusFirstError(form.current);
      return;
    }
    saveFuelFillUp({ ...parsed.data, id: fillUpId });
    navigate(listHref);
  }

  const belowKnown = !existing && isBelowKnownOdometer(toNumber(odometer), known);

  return (
    <div className="mx-auto max-w-xl">
      <BackLink href={listHref}>Back to fuel log</BackLink>
      <PageTitle>{existing ? 'Edit fill-up' : 'Add fill-up'}</PageTitle>
      <p className="-mt-3 mb-4 text-sm text-slate-600">
        {vehicle.description} · {vehicleName(vehicle)}
      </p>
      <Card className="p-5">
        <form ref={form} noValidate onSubmit={submit} className="space-y-4">
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            error={errors.date}
          />
          <TextField
            label="Mileage at fill-up"
            inputMode="numeric"
            value={odometer}
            onChange={(event) => setOdometer(event.target.value)}
            error={errors.odometer}
            hint={
              belowKnown
                ? `This is below the current ${known.toLocaleString('en-US')} mi. That's fine for an older fill-up.`
                : `Current mileage is ${known.toLocaleString('en-US')} mi.`
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Gallons"
              inputMode="decimal"
              value={gallons}
              onChange={(event) => setGallons(event.target.value)}
              error={errors.gallons}
            />
            <TextField
              label="Total cost"
              inputMode="decimal"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              error={errors.costCents}
            />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-brand-700"
              checked={isFull}
              onChange={(event) => setIsFull(event.target.checked)}
            />
            Filled to full
          </label>
          <div className="flex flex-wrap justify-between gap-3 pt-2">
            {existing ? (
              <Button variant="danger" onClick={() => setConfirming(true)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="primary">
              {existing ? 'Save changes' : 'Save fill-up'}
            </Button>
          </div>
        </form>
      </Card>
      {confirming && fillUpId && (
        <ConfirmDialog
          title="Delete this fill-up?"
          confirmLabel="Delete fill-up"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            deleteFuelFillUp(fillUpId);
            navigate(listHref);
          }}
        >
          MPG will be recalculated. This can't be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}
