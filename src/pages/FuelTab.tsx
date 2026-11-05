import { Link } from 'wouter';
import { Card, EmptyState, LinkButton } from '../components/ui';
import { formatDate } from '../domain/dates';
import { formatCents } from '../domain/money';
import { computeFuelStats, pricePerGallonCents } from '../domain/mpg';
import type { Vehicle } from '../domain/schemas';
import { useGarage } from '../store/garageStore';

export function formatMpg(mpg: number) {
  return mpg.toFixed(1);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3">
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="text-xl font-bold tracking-tight">{value}</dd>
    </Card>
  );
}

export function FuelTab({ vehicle }: { vehicle: Vehicle }) {
  const fillUps = useGarage((state) => state.data.fuelFillUps);
  const addHref = `/vehicles/${vehicle.id}/fuel/new`;

  const stats = computeFuelStats(fillUps.filter((fillUp) => fillUp.vehicleId === vehicle.id));

  if (stats.entries.length === 0) {
    return (
      <EmptyState
        title="No fill-ups yet"
        action={
          <LinkButton href={addHref} variant="primary">
            Add fill-up
          </LinkButton>
        }
      >
        MPG appears after your second full tank, because the first one sets the starting point.
      </EmptyState>
    );
  }

  return (
    <>
      <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <Stat
            label="Overall MPG"
            value={stats.overallMpg !== null ? formatMpg(stats.overallMpg) : 'Not enough data'}
          />
        </div>
        <Stat label="Total spent" value={formatCents(stats.totalCostCents)} />
        <Stat label="Total gallons" value={stats.totalGallons.toFixed(1)} />
      </dl>
      <div className="mb-3 flex justify-end">
        <LinkButton href={addHref} variant="primary">
          Add fill-up
        </LinkButton>
      </div>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-200">
          {stats.entries.map(({ fillUp, mpg }) => (
            <li key={fillUp.id}>
              <Link
                href={`/vehicles/${vehicle.id}/fuel/${fillUp.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {formatDate(fillUp.date)}
                    {!fillUp.isFull && (
                      <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800">
                        Partial
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-600">
                    {fillUp.odometer.toLocaleString('en-US')} mi · {fillUp.gallons} gal ·{' '}
                    {formatCents(fillUp.costCents)} ({formatCents(pricePerGallonCents(fillUp))}/gal)
                  </p>
                </div>
                <p className="shrink-0 text-right">
                  {mpg !== null ? (
                    <>
                      <span className="text-lg font-bold">{formatMpg(mpg)}</span>{' '}
                      <span className="text-xs text-slate-600">MPG</span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-600" title="Needs a full tank before it">
                      No MPG
                    </span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-2 text-xs text-slate-600">
        MPG is measured between full tanks, and a skipped fill-up will make it read high.
      </p>
    </>
  );
}
