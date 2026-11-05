import { Link } from 'wouter';
import { Card, EmptyState, LinkButton } from '../components/ui';
import { formatDate } from '../domain/dates';
import { formatCents } from '../domain/money';
import type { ServiceRecord, ServiceType, Vehicle } from '../domain/schemas';
import { useGarage } from '../store/garageStore';

export function serviceNames(record: ServiceRecord, types: ServiceType[]): string {
  return record.serviceTypeIds
    .map((id) => types.find((type) => type.id === id)?.name ?? 'Removed service')
    .join(', ');
}

export function ServiceHistoryTab({ vehicle }: { vehicle: Vehicle }) {
  const data = useGarage((state) => state.data);
  const addHref = `/vehicles/${vehicle.id}/service/new`;

  const records = data.serviceRecords
    .filter((record) => record.vehicleId === vehicle.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (records.length === 0) {
    return (
      <EmptyState
        title="No service history yet"
        action={
          <LinkButton href={addHref} variant="primary">
            Log service
          </LinkButton>
        }
      >
        Log past and future work to keep maintenance suggestions accurate.
      </EmptyState>
    );
  }

  const totalCents = records.reduce((sum, record) => sum + (record.costCents ?? 0), 0);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-700">
          Total spent: <strong>{formatCents(totalCents)}</strong>
        </p>
        <LinkButton href={addHref} variant="primary">
          Log service
        </LinkButton>
      </div>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-200">
          {records.map((record) => (
            <li key={record.id}>
              <Link
                href={`/vehicles/${vehicle.id}/service/${record.id}`}
                className="block px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{serviceNames(record, data.serviceTypes)}</span>
                  {record.costCents !== undefined && (
                    <span className="shrink-0 text-sm font-medium">
                      {formatCents(record.costCents)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {formatDate(record.date)}
                  {record.odometer !== undefined &&
                    ` · ${record.odometer.toLocaleString('en-US')} mi`}
                </p>
                {record.notes && <p className="mt-1 text-sm text-slate-700">{record.notes}</p>}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
