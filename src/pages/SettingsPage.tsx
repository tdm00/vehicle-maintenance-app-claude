import { Link } from 'wouter';
import { BackupSection } from '../components/BackupSection';
import { intervalText } from '../components/maintenanceText';
import { Card, LinkButton, PageTitle } from '../components/ui';
import type { ServiceType } from '../domain/schemas';
import { useGarage } from '../store/garageStore';

function serviceSummary(type: ServiceType) {
  if (type.isHidden) return 'Hidden';
  const text = intervalText({ miles: type.intervalMiles, months: type.intervalMonths });
  const isDefault = !type.isCustom && !type.intervalsEdited && text !== 'No reminder';
  return isDefault ? `Default: ${text.toLowerCase()}` : text;
}

export function SettingsPage() {
  const serviceTypes = useGarage((state) => state.data.serviceTypes);

  return (
    <>
      <PageTitle>Settings</PageTitle>
      <BackupSection />
      <section aria-labelledby="services-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="services-heading" className="text-lg font-semibold">
              Service list
            </h2>
            <p className="text-sm text-slate-600">
              The services you can log. Defaults are adjusted for each vehicle's age, powertrain,
              and mileage. Edit one to set your own interval for every vehicle.
            </p>
          </div>
          <LinkButton href="/settings/services/new" variant="primary">
            Add service
          </LinkButton>
        </div>
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {serviceTypes.map((type) => (
              <li key={type.id}>
                <Link
                  href={`/settings/services/${type.id}`}
                  className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className={type.isHidden ? 'text-slate-600 line-through' : 'font-medium'}>
                    {type.name}
                  </span>
                  <span className="text-right text-sm text-slate-600">{serviceSummary(type)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
      <p className="mt-8 text-center text-xs text-slate-600">Garage version {__APP_VERSION__}</p>
    </>
  );
}
