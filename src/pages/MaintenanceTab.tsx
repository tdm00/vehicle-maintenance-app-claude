import { Link } from 'wouter';
import { describeItem, intervalText } from '../components/maintenanceText';
import { StatusBadge } from '../components/StatusBadge';
import { GUIDANCE_NOTE } from '../components/TaskList';
import { Button, Card, LinkButton } from '../components/ui';
import { toLocalIso } from '../domain/dates';
import { evaluateVehicle } from '../domain/maintenance';
import type { Vehicle } from '../domain/schemas';
import { useGarage } from '../store/garageStore';

export function MaintenanceTab({ vehicle }: { vehicle: Vehicle }) {
  const data = useGarage((state) => state.data);
  const setServiceIgnored = useGarage((state) => state.setServiceIgnored);

  const items = evaluateVehicle(data, vehicle, toLocalIso(new Date()));
  const ignored = data.serviceTypes.filter((type) =>
    vehicle.ignoredServiceTypeIds.includes(type.id),
  );

  return (
    <>
      <div className="mb-3 flex justify-end">
        <LinkButton href={`/vehicles/${vehicle.id}/service/new`} variant="primary">
          Log service
        </LinkButton>
      </div>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-200">
          {items.map((item) => (
            <li key={item.serviceType.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium">{item.serviceType.name}</span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-sm text-slate-600">{describeItem(item)}</p>
                <p className="text-xs text-slate-600">{intervalText(item.interval)}</p>
              </div>
              <div className="flex shrink-0 items-center">
                <Link
                  href={`/vehicles/${vehicle.id}/service/new/${item.serviceType.id}`}
                  className="flex min-h-11 items-center px-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  Log it<span className="sr-only">: {item.serviceType.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setServiceIgnored(vehicle.id, item.serviceType.id, true)}
                  className="flex min-h-11 items-center px-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  N/A<span className="sr-only">: {item.serviceType.name}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-2 text-xs text-slate-600">{GUIDANCE_NOTE}</p>

      {ignored.length > 0 && (
        <section aria-labelledby="ignored-heading" className="mt-6">
          <h2 id="ignored-heading" className="mb-2 text-sm font-semibold text-slate-800">
            Marked as not applicable
          </h2>
          <div className="flex flex-wrap gap-2">
            {ignored.map((type) => (
              <Button key={type.id} onClick={() => setServiceIgnored(vehicle.id, type.id, false)}>
                Restore {type.name}
              </Button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
