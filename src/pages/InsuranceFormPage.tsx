import { type FormEvent, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { type FieldErrors, reportErrors, toFieldErrors } from '../components/formErrors';
import {
  BackLink,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LinkButton,
  PageTitle,
  TextAreaField,
  TextField,
} from '../components/ui';
import { insurancePolicySchema } from '../domain/schemas';
import { useGarage } from '../store/garageStore';
import { NotFoundPage } from './NotFoundPage';

export function InsuranceFormPage() {
  const { id, vehicleId } = useParams<{ id?: string; vehicleId?: string }>();
  const data = useGarage((state) => state.data);

  if (id && !data.insurancePolicies.some((policy) => policy.id === id)) return <NotFoundPage />;
  if (!id && data.vehicles.length === 0) {
    return (
      <EmptyState
        title="Add a vehicle first"
        action={
          <LinkButton href="/vehicles/new" variant="primary">
            Add vehicle
          </LinkButton>
        }
      >
        Insurance policies are attached to the vehicles they cover.
      </EmptyState>
    );
  }
  return <InsuranceForm key={id ?? 'new'} id={id} vehicleId={vehicleId} />;
}

function InsuranceForm({ id, vehicleId }: { id?: string; vehicleId?: string }) {
  const [, navigate] = useLocation();
  const vehicles = useGarage((state) => state.data.vehicles);
  const existing = useGarage((state) =>
    state.data.insurancePolicies.find((policy) => policy.id === id),
  );
  const saveInsurancePolicy = useGarage((state) => state.saveInsurancePolicy);
  const deleteInsurancePolicy = useGarage((state) => state.deleteInsurancePolicy);
  const form = useRef<HTMLFormElement>(null);

  const [company, setCompany] = useState(existing?.company ?? '');
  const [policyNumber, setPolicyNumber] = useState(existing?.policyNumber ?? '');
  const [expirationDate, setExpirationDate] = useState(existing?.expirationDate ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const chosen = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const [selected, setSelected] = useState<string[]>(
    existing?.vehicleIds ?? (chosen ? [chosen.id] : []),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirming, setConfirming] = useState(false);

  const backHref = chosen ? `/vehicles/${chosen.id}/insurance` : '/insurance';

  function toggle(entry: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, entry] : current.filter((value) => value !== entry),
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = insurancePolicySchema.safeParse({
      id: id ?? 'new',
      vehicleIds: selected,
      company,
      policyNumber,
      expirationDate,
      phone,
      notes,
    });
    const fieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);
    // A policy left with no vehicles can still be edited once none exist to choose.
    if (selected.length === 0 && vehicles.length > 0) {
      fieldErrors.vehicleIds = 'Choose at least one vehicle';
    }
    if (!parsed.success || fieldErrors.vehicleIds) {
      reportErrors(form.current, setErrors, fieldErrors);
      return;
    }
    saveInsurancePolicy({ ...parsed.data, id });
    navigate(backHref);
  }

  return (
    <div className="mx-auto max-w-xl">
      <BackLink href={backHref}>Back to insurance</BackLink>
      <PageTitle>{id ? 'Edit policy' : 'Add policy'}</PageTitle>
      <Card className="p-5">
        <form ref={form} noValidate onSubmit={submit} className="space-y-4">
          <TextField
            label="Company"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            error={errors.company}
            maxLength={80}
          />
          <TextField
            label="Policy number"
            value={policyNumber}
            onChange={(event) => setPolicyNumber(event.target.value)}
            error={errors.policyNumber}
            hint="Stored unencrypted in this browser and in backup files."
            maxLength={60}
          />
          <TextField
            label="Expiration date"
            type="date"
            value={expirationDate}
            onChange={(event) => setExpirationDate(event.target.value)}
            error={errors.expirationDate}
            hint={id ? 'Renewed? Enter the new expiration date.' : undefined}
          />
          <TextField
            label="Phone (optional)"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={errors.phone}
            maxLength={30}
          />
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-slate-800">Vehicles covered</legend>
            <div className="grid gap-x-4 sm:grid-cols-2">
              {vehicles.map((vehicle) => (
                <label key={vehicle.id} className="flex min-h-11 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 accent-brand-700"
                    checked={selected.includes(vehicle.id)}
                    aria-invalid={!!errors.vehicleIds}
                    onChange={(event) => toggle(vehicle.id, event.target.checked)}
                  />
                  {vehicle.description}
                </label>
              ))}
            </div>
            {errors.vehicleIds && (
              <p className="mt-1 text-sm font-medium text-red-700">{errors.vehicleIds}</p>
            )}
          </fieldset>
          <TextAreaField
            label="Notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
          />
          <div className="flex flex-wrap justify-between gap-3 pt-2">
            {id ? (
              <Button variant="danger" onClick={() => setConfirming(true)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="primary">
              {id ? 'Save changes' : 'Save policy'}
            </Button>
          </div>
        </form>
      </Card>
      {confirming && id && (
        <ConfirmDialog
          title="Delete this policy?"
          confirmLabel="Delete policy"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            deleteInsurancePolicy(id);
            navigate(backHref);
          }}
        >
          This removes it from every vehicle it covers. This can't be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}
