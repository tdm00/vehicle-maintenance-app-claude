import { type FormEvent, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import {
  type FieldErrors,
  focusFirstError,
  toFieldErrors,
  toNumber,
} from '../components/formErrors';
import {
  BackLink,
  Button,
  Card,
  ConfirmDialog,
  PageTitle,
  TextAreaField,
  TextField,
} from '../components/ui';
import { vehicleName } from '../components/VehicleCard';
import { toLocalIso } from '../domain/dates';
import { centsToInput, parseDollars } from '../domain/money';
import { currentOdometer, isBelowKnownOdometer } from '../domain/odometer';
import { serviceRecordSchema, type Vehicle } from '../domain/schemas';
import { useGarage } from '../store/garageStore';
import { NotFoundPage } from './NotFoundPage';

export function ServiceFormPage() {
  const { id, recordId, typeId } = useParams<{ id: string; recordId?: string; typeId?: string }>();
  const data = useGarage((state) => state.data);
  const vehicle = data.vehicles.find((entry) => entry.id === id);
  const record = data.serviceRecords.find((entry) => entry.id === recordId);
  if (!vehicle || (recordId && !record)) return <NotFoundPage />;
  return (
    <ServiceForm key={recordId ?? 'new'} vehicle={vehicle} recordId={recordId} typeId={typeId} />
  );
}

function ServiceForm({
  vehicle,
  recordId,
  typeId,
}: {
  vehicle: Vehicle;
  recordId?: string;
  typeId?: string;
}) {
  const [, navigate] = useLocation();
  const data = useGarage((state) => state.data);
  const saveServiceRecord = useGarage((state) => state.saveServiceRecord);
  const deleteServiceRecord = useGarage((state) => state.deleteServiceRecord);
  const form = useRef<HTMLFormElement>(null);

  const existing = data.serviceRecords.find((entry) => entry.id === recordId);
  const known = currentOdometer(vehicle, data.serviceRecords, data.fuelFillUps);

  const [date, setDate] = useState(existing?.date ?? toLocalIso(new Date()));
  const [odometer, setOdometer] = useState(
    existing ? String(existing.odometer ?? '') : String(known),
  );
  const [selected, setSelected] = useState<string[]>(
    existing?.serviceTypeIds ?? (typeId ? [typeId] : []),
  );
  const [cost, setCost] = useState(
    existing?.costCents !== undefined ? centsToInput(existing.costCents) : '',
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirming, setConfirming] = useState(false);

  const backHref = `/vehicles/${vehicle.id}${existing ? '/service' : ''}`;
  const options = data.serviceTypes.filter(
    (type) =>
      selected.includes(type.id) ||
      (!type.isHidden && type.powertrains.includes(vehicle.powertrain)),
  );

  function toggle(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((entry) => entry !== id),
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const costCents = cost.trim() === '' ? undefined : parseDollars(cost);
    const parsed = serviceRecordSchema.safeParse({
      id: recordId ?? 'new',
      vehicleId: vehicle.id,
      date,
      odometer: toNumber(odometer),
      serviceTypeIds: selected,
      costCents: costCents ?? undefined,
      notes,
    });
    const fieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);
    if (costCents === null) fieldErrors.costCents = 'Enter an amount, such as 45.50';
    if (!parsed.success || costCents === null) {
      setErrors(fieldErrors);
      focusFirstError(form.current);
      return;
    }
    saveServiceRecord({ ...parsed.data, id: recordId });
    navigate(`/vehicles/${vehicle.id}/service`);
  }

  const belowKnown = !existing && isBelowKnownOdometer(toNumber(odometer), known);

  return (
    <div className="mx-auto max-w-xl">
      <BackLink href={backHref}>Back to vehicle</BackLink>
      <PageTitle>{existing ? 'Edit service' : 'Log service'}</PageTitle>
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
            label="Mileage (optional)"
            inputMode="numeric"
            value={odometer}
            onChange={(event) => setOdometer(event.target.value)}
            error={errors.odometer}
            hint={
              belowKnown
                ? `This is below the current ${known.toLocaleString('en-US')} mi. That's fine for older work.`
                : 'Without a mileage, reminders use the date only.'
            }
          />
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-slate-800">Services performed</legend>
            <div className="grid gap-x-4 sm:grid-cols-2">
              {options.map((type) => (
                <label key={type.id} className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-brand-700"
                    checked={selected.includes(type.id)}
                    aria-invalid={!!errors.serviceTypeIds}
                    onChange={(event) => toggle(type.id, event.target.checked)}
                  />
                  {type.name}
                </label>
              ))}
            </div>
            {errors.serviceTypeIds && (
              <p className="mt-1 text-sm font-medium text-red-700">{errors.serviceTypeIds}</p>
            )}
            <Link
              href="/settings"
              className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-brand-700 underline underline-offset-2"
            >
              Manage this list
            </Link>
          </fieldset>
          <TextField
            label="Cost (optional)"
            inputMode="decimal"
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            error={errors.costCents}
          />
          <TextAreaField
            label="Notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
          />
          <div className="flex flex-wrap justify-between gap-3 pt-2">
            {existing ? (
              <Button variant="danger" onClick={() => setConfirming(true)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="primary">
              {existing ? 'Save changes' : 'Save service'}
            </Button>
          </div>
        </form>
      </Card>
      {confirming && recordId && (
        <ConfirmDialog
          title="Delete this service record?"
          confirmLabel="Delete record"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            deleteServiceRecord(recordId);
            navigate(`/vehicles/${vehicle.id}/service`);
          }}
        >
          Maintenance suggestions will update. This can't be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}
