import { Link } from 'wouter';
import { formatDate } from '../domain/dates';
import { policyStatus, vehicleNames } from '../domain/insurance';
import type { MaintenanceItem, TaskList as Tasks } from '../domain/maintenance';
import type { InsurancePolicy, Vehicle } from '../domain/schemas';
import { describeItem } from './maintenanceText';
import { PolicyBadge, StatusBadge } from './StatusBadge';
import { Card } from './ui';

export const GUIDANCE_NOTE =
  "Suggestions are general guidance based on the vehicle's type, age, and mileage. Check the owner's manual for its exact schedule.";

function logLink(item: MaintenanceItem) {
  return `/vehicles/${item.vehicle.id}/service/new/${item.serviceType.id}`;
}

function TaskRow({ item }: { item: MaintenanceItem }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{item.serviceType.name}</span>
          <StatusBadge status={item.status} />
        </div>
        <p className="truncate text-sm text-slate-600">
          <Link href={`/vehicles/${item.vehicle.id}`} className="underline underline-offset-2">
            {item.vehicle.description}
          </Link>{' '}
          · {describeItem(item)}
        </p>
      </div>
      <Link
        href={logLink(item)}
        className="flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        Log it
        <span className="sr-only">
          : {item.serviceType.name} for {item.vehicle.description}
        </span>
      </Link>
    </li>
  );
}

function PolicyRow({
  policy,
  vehicles,
  today,
}: {
  policy: InsurancePolicy;
  vehicles: Vehicle[];
  today: string;
}) {
  const status = policyStatus(policy, today);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{policy.company} insurance</span>
          <PolicyBadge status={status} />
        </div>
        <p className="truncate text-sm text-slate-600">
          {vehicleNames(policy, vehicles)} · {status === 'expired' ? 'Expired' : 'Expires'}{' '}
          {formatDate(policy.expirationDate)}
        </p>
      </div>
      <Link
        href={`/insurance/${policy.id}`}
        className="flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        Update<span className="sr-only">: {policy.company} insurance</span>
      </Link>
    </li>
  );
}

export function TaskList({
  tasks,
  vehicles,
  today,
}: {
  tasks: Tasks;
  vehicles: Vehicle[];
  today: string;
}) {
  const { actionable, noRecord, insurance } = tasks;

  return (
    <section aria-labelledby="tasks-heading" className="mb-8">
      <h2 id="tasks-heading" className="mb-3 text-lg font-semibold">
        Needs attention
      </h2>
      <Card className="overflow-hidden">
        {actionable.length + insurance.length > 0 ? (
          <ul className="divide-y divide-slate-200">
            {insurance.map((policy) => (
              <PolicyRow key={policy.id} policy={policy} vehicles={vehicles} today={today} />
            ))}
            {actionable.map((item) => (
              <TaskRow key={`${item.vehicle.id}-${item.serviceType.id}`} item={item} />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-5 text-sm text-slate-700">
            <span aria-hidden="true">✓ </span>Nothing is due right now.
          </p>
        )}
        {noRecord.map(({ vehicle, items }) => (
          <details key={vehicle.id} className="group border-t border-slate-200">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700">
              <span aria-hidden="true" className="transition-transform group-open:rotate-90">
                ›
              </span>
              {vehicle.description}: {items.length} with no service on record
            </summary>
            <ul className="divide-y divide-slate-200 border-t border-slate-200">
              {items.map((item) => (
                <TaskRow key={item.serviceType.id} item={item} />
              ))}
            </ul>
          </details>
        ))}
      </Card>
      <p className="mt-2 text-xs text-slate-600">{GUIDANCE_NOTE}</p>
    </section>
  );
}
