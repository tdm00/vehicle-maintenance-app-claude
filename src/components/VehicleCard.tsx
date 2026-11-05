import { Link } from 'wouter';
import type { Vehicle } from '../domain/schemas';
import { Card } from './ui';
import { VehicleGraphic } from './VehicleGraphic';

export function vehicleName(vehicle: Pick<Vehicle, 'year' | 'make' | 'model'>) {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

export function VehicleCard({
  vehicle,
  odometer,
  badge,
}: {
  vehicle: Vehicle;
  odometer: number;
  badge?: string;
}) {
  return (
    <Link href={`/vehicles/${vehicle.id}`} className="group block rounded-2xl">
      <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="bg-gradient-to-b from-slate-200 to-slate-100 px-8 py-4">
          <VehicleGraphic
            bodyType={vehicle.bodyType}
            color={vehicle.color}
            className="mx-auto h-24 w-full max-w-56"
          />
        </div>
        <div className="p-4">
          <h3 className="truncate font-semibold">{vehicle.description}</h3>
          <p className="truncate text-sm text-slate-600">{vehicleName(vehicle)}</p>
          <div className="mt-2 flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-700">{odometer.toLocaleString('en-US')} mi</span>
            {badge && <span className="font-medium text-brand-700">{badge}</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
