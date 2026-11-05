import { type FormEvent, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { type FieldErrors, reportErrors, toFieldErrors, toNumber } from '../components/formErrors';
import { BackLink, Button, Card, PageTitle, SelectField, TextField } from '../components/ui';
import { VehicleGraphic } from '../components/VehicleGraphic';
import {
  BODY_TYPE_LABELS,
  bodyTypeFor,
  COLOR_OPTIONS,
  MAKES,
  modelsFor,
  POWERTRAIN_LABELS,
  powertrainFor,
} from '../data/vehicles';
import { formatDate } from '../domain/dates';
import { highestLoggedReading } from '../domain/odometer';
import {
  BODY_TYPES,
  type BodyType,
  MIN_YEAR,
  POWERTRAINS,
  type Powertrain,
  type Vehicle,
  vehicleSchema,
} from '../domain/schemas';
import { useGarage } from '../store/garageStore';
import { NotFoundPage } from './NotFoundPage';

const OTHER = '__other';

function yearOptions(today: Date, saved?: number): number[] {
  const newest = today.getFullYear() + 1;
  const years = Array.from({ length: newest - MIN_YEAR + 1 }, (_, index) => newest - index);
  // A saved year outside the range must stay selectable, or the field would open blank.
  return saved === undefined || years.includes(saved) ? years : [saved, ...years];
}

export function VehicleFormPage() {
  const { id } = useParams<{ id?: string }>();
  const existing = useGarage((state) => state.data.vehicles.find((vehicle) => vehicle.id === id));
  if (id && !existing) return <NotFoundPage />;
  return <VehicleForm key={id ?? 'new'} existing={existing} />;
}

function VehicleForm({ existing }: { existing?: Vehicle }) {
  const [, navigate] = useLocation();
  const id = existing?.id;
  const serviceRecords = useGarage((state) => state.data.serviceRecords);
  const fuelFillUps = useGarage((state) => state.data.fuelFillUps);
  const addVehicle = useGarage((state) => state.addVehicle);
  const updateVehicle = useGarage((state) => state.updateVehicle);
  const form = useRef<HTMLFormElement>(null);

  const [description, setDescription] = useState(existing?.description ?? '');
  const [year, setYear] = useState(existing ? String(existing.year) : '');
  const [make, setMake] = useState(existing?.make ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [customMake, setCustomMake] = useState(() =>
    existing ? !MAKES.includes(existing.make) : false,
  );
  const [customModel, setCustomModel] = useState(() =>
    existing ? !modelsFor(existing.make).includes(existing.model) : false,
  );
  const [color, setColor] = useState(existing?.color ?? '#2563eb');
  const [bodyType, setBodyType] = useState<BodyType>(existing?.bodyType ?? 'sedan');
  const [powertrain, setPowertrain] = useState<Powertrain>(existing?.powertrain ?? 'gas');
  const [odometer, setOdometer] = useState(existing ? String(existing.enteredOdometer) : '');
  const [errors, setErrors] = useState<FieldErrors>({});

  function chooseMake(value: string) {
    setModel('');
    setCustomMake(value === OTHER);
    setCustomModel(value === OTHER);
    setMake(value === OTHER ? '' : value);
  }

  function chooseModel(value: string) {
    setCustomModel(value === OTHER);
    if (value === OTHER) {
      setModel('');
      return;
    }
    setModel(value);
    setBodyType(bodyTypeFor(make, value) ?? bodyType);
    setPowertrain(powertrainFor(make, value));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = vehicleSchema.safeParse({
      id: id ?? 'new',
      description,
      make,
      model,
      year: toNumber(year),
      color,
      bodyType,
      powertrain,
      enteredOdometer: toNumber(odometer),
      ignoredServiceTypeIds: existing?.ignoredServiceTypeIds ?? [],
    });
    if (!parsed.success) {
      reportErrors(form.current, setErrors, toFieldErrors(parsed.error));
      return;
    }
    if (id) {
      updateVehicle(parsed.data);
      navigate(`/vehicles/${id}`);
    } else {
      navigate(`/vehicles/${addVehicle(parsed.data)}`);
    }
  }

  // Logged readings outrank this field, so say why saving a lower number won't change the mileage.
  const logged = id ? highestLoggedReading(id, serviceRecords, fuelFillUps) : null;
  const heldUp = logged && logged.odometer > (toNumber(odometer) ?? 0);
  const mileageNote = heldUp
    ? `${logged.source === 'fuel' ? 'A fuel fill-up' : 'A service'} on ${formatDate(logged.date)} logged ${logged.odometer.toLocaleString('en-US')} mi, which sets the current mileage. If that's a typo, correct that entry.`
    : undefined;

  return (
    <div className="mx-auto max-w-xl">
      <BackLink href={id ? `/vehicles/${id}` : '/'}>
        {id ? 'Back to vehicle' : 'My Garage'}
      </BackLink>
      <PageTitle>{id ? 'Edit vehicle' : 'Add vehicle'}</PageTitle>
      <Card className="p-5">
        <div className="mb-5 rounded-xl bg-slate-100 px-6 py-3">
          <VehicleGraphic
            bodyType={bodyType}
            color={color}
            className="mx-auto h-24 w-full max-w-56"
          />
        </div>
        <form ref={form} noValidate onSubmit={submit} className="space-y-4">
          <TextField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            error={errors.description}
            hint="A name you'll recognize, such as “Dad's truck”."
            maxLength={80}
          />
          <SelectField
            label="Year"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            error={errors.year}
          >
            <option value="">Choose a year</option>
            {yearOptions(new Date(), existing?.year).map((option) => (
              <option key={option}>{option}</option>
            ))}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <SelectField
                label="Make"
                value={customMake ? OTHER : make}
                onChange={(event) => chooseMake(event.target.value)}
                error={customMake ? undefined : errors.make}
              >
                <option value="">Choose a make</option>
                {MAKES.map((option) => (
                  <option key={option}>{option}</option>
                ))}
                <option value={OTHER}>Other</option>
              </SelectField>
              {customMake && (
                <TextField
                  label="Make name"
                  value={make}
                  onChange={(event) => setMake(event.target.value)}
                  error={errors.make}
                  maxLength={60}
                />
              )}
            </div>
            <div className="space-y-2">
              {!customMake && (
                <SelectField
                  label="Model"
                  value={customModel ? OTHER : model}
                  onChange={(event) => chooseModel(event.target.value)}
                  error={customModel ? undefined : errors.model}
                  disabled={!make}
                >
                  <option value="">{make ? 'Choose a model' : 'Choose a make first'}</option>
                  {modelsFor(make).map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                  <option value={OTHER}>Other</option>
                </SelectField>
              )}
              {customModel && (
                <TextField
                  label="Model name"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  error={errors.model}
                  maxLength={60}
                />
              )}
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-800">Color</legend>
            <div className="flex flex-wrap items-center gap-1">
              {COLOR_OPTIONS.map((option) => (
                <label
                  key={option.hex}
                  title={option.name}
                  className="relative grid size-11 cursor-pointer place-items-center"
                >
                  <input
                    type="radio"
                    name="color"
                    className="peer sr-only"
                    aria-label={option.name}
                    checked={color === option.hex}
                    onChange={() => setColor(option.hex)}
                  />
                  <span
                    className="size-8 rounded-full ring-1 ring-slate-400 peer-checked:ring-3 peer-checked:ring-brand-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
                    style={{ backgroundColor: option.hex }}
                  />
                </label>
              ))}
              <label className="ml-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="color"
                  aria-label="Custom color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="size-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                Custom
              </label>
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Body style"
              value={bodyType}
              onChange={(event) => setBodyType(event.target.value as BodyType)}
            >
              {BODY_TYPES.map((option) => (
                <option key={option} value={option}>
                  {BODY_TYPE_LABELS[option]}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Powertrain"
              value={powertrain}
              onChange={(event) => setPowertrain(event.target.value as Powertrain)}
            >
              {POWERTRAINS.map((option) => (
                <option key={option} value={option}>
                  {POWERTRAIN_LABELS[option]}
                </option>
              ))}
            </SelectField>
          </div>
          <TextField
            label="Mileage"
            inputMode="numeric"
            value={odometer}
            onChange={(event) => setOdometer(event.target.value)}
            error={errors.enteredOdometer}
            hint={mileageNote}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" variant="primary">
              {id ? 'Save changes' : 'Add vehicle'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
