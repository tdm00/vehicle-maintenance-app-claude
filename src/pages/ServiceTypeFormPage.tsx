import { type FormEvent, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { type FieldErrors, reportErrors, toFieldErrors, toNumber } from '../components/formErrors';
import { BackLink, Button, Card, PageTitle, TextField } from '../components/ui';
import { POWERTRAINS, serviceTypeSchema } from '../domain/schemas';
import { useGarage } from '../store/garageStore';
import { NotFoundPage } from './NotFoundPage';

export function ServiceTypeFormPage() {
  const { id } = useParams<{ id?: string }>();
  const existing = useGarage((state) => state.data.serviceTypes.find((type) => type.id === id));
  if (id && !existing) return <NotFoundPage />;
  return <ServiceTypeForm key={id ?? 'new'} id={id} />;
}

function ServiceTypeForm({ id }: { id?: string }) {
  const [, navigate] = useLocation();
  const existing = useGarage((state) => state.data.serviceTypes.find((type) => type.id === id));
  const saveServiceType = useGarage((state) => state.saveServiceType);
  const form = useRef<HTMLFormElement>(null);

  const [name, setName] = useState(existing?.name ?? '');
  const [miles, setMiles] = useState(String(existing?.intervalMiles ?? ''));
  const [months, setMonths] = useState(String(existing?.intervalMonths ?? ''));
  const [hidden, setHidden] = useState(existing?.isHidden ?? false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const intervalMiles = toNumber(miles) ?? null;
    const intervalMonths = toNumber(months) ?? null;
    const changedInterval =
      intervalMiles !== (existing?.intervalMiles ?? null) ||
      intervalMonths !== (existing?.intervalMonths ?? null);

    const parsed = serviceTypeSchema.safeParse({
      id: id ?? 'new',
      name,
      intervalMiles,
      intervalMonths,
      powertrains: existing?.powertrains ?? [...POWERTRAINS],
      isCustom: existing?.isCustom ?? true,
      isHidden: hidden,
      intervalsEdited: (existing?.intervalsEdited ?? false) || changedInterval,
    });
    if (!parsed.success) {
      reportErrors(form.current, setErrors, toFieldErrors(parsed.error));
      return;
    }
    saveServiceType({ ...parsed.data, id });
    navigate('/settings');
  }

  return (
    <div className="mx-auto max-w-xl">
      <BackLink href="/settings">Settings</BackLink>
      <PageTitle>{id ? 'Edit service' : 'Add service'}</PageTitle>
      <Card className="p-5">
        <form ref={form} noValidate onSubmit={submit} className="space-y-4">
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={errors.name}
            maxLength={60}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Remind every (miles)"
              inputMode="numeric"
              value={miles}
              onChange={(event) => setMiles(event.target.value)}
              error={errors.intervalMiles}
            />
            <TextField
              label="Remind every (months)"
              inputMode="numeric"
              value={months}
              onChange={(event) => setMonths(event.target.value)}
              error={errors.intervalMonths}
            />
          </div>
          <p className="text-sm text-slate-600">
            Leave both blank for no reminder. Changing an interval overrides the suggested schedule
            for every vehicle.
          </p>
          {id && (
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-brand-700"
                checked={hidden}
                onChange={(event) => setHidden(event.target.checked)}
              />
              Hide from lists and reminders
            </label>
          )}
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary">
              {id ? 'Save changes' : 'Add service'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
