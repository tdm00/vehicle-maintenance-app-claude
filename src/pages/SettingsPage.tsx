import { Link } from 'wouter';
import { BackupSection } from '../components/BackupSection';
import { Card, LinkButton, PageTitle } from '../components/ui';
import { useGarage } from '../store/garageStore';

function intervalText(miles: number | null, months: number | null) {
  const parts: string[] = [];
  if (miles !== null) parts.push(`${miles.toLocaleString('en-US')} mi`);
  if (months !== null) parts.push(`${months} mo`);
  return parts.length > 0 ? `Every ${parts.join(' or ')}` : 'No reminder';
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
              The services you can log. Edit one to set your own reminder interval.
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
                  <span className="text-right text-sm text-slate-600">
                    {type.isHidden
                      ? 'Hidden'
                      : intervalText(type.intervalMiles, type.intervalMonths)}
                  </span>
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
