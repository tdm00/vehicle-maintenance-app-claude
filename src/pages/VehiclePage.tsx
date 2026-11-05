import { useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { BackLink, Button, ConfirmDialog, LinkButton } from '../components/ui';
import { vehicleName } from '../components/VehicleCard';
import { VehicleGraphic } from '../components/VehicleGraphic';
import { BODY_TYPE_LABELS, POWERTRAIN_LABELS } from '../data/vehicles';
import { currentOdometer } from '../domain/odometer';
import { useGarage } from '../store/garageStore';
import { MaintenanceTab } from './MaintenanceTab';
import { NotFoundPage } from './NotFoundPage';
import { ServiceHistoryTab } from './ServiceHistoryTab';

export type VehicleTab = 'maintenance' | 'service';

const TABS: { id: VehicleTab; label: string; suffix: string }[] = [
  { id: 'maintenance', label: 'Maintenance', suffix: '' },
  { id: 'service', label: 'Service history', suffix: '/service' },
];

export function VehiclePage({ tab = 'maintenance' }: { tab?: VehicleTab }) {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const data = useGarage((state) => state.data);
  const deleteVehicle = useGarage((state) => state.deleteVehicle);
  const [confirming, setConfirming] = useState(false);

  const vehicle = data.vehicles.find((entry) => entry.id === id);
  if (!vehicle) return <NotFoundPage />;

  const odometer = currentOdometer(vehicle, data.serviceRecords, data.fuelFillUps);

  return (
    <>
      <BackLink href="/">My Garage</BackLink>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 sm:flex">
        <div className="grid place-items-center bg-gradient-to-b from-slate-200 to-slate-100 px-8 py-4 sm:w-64">
          <VehicleGraphic
            bodyType={vehicle.bodyType}
            color={vehicle.color}
            className="h-28 w-full max-w-56"
          />
        </div>
        <div className="min-w-0 flex-1 p-5">
          <h1 className="text-2xl font-bold tracking-tight break-words">{vehicle.description}</h1>
          <p className="text-slate-600">{vehicleName(vehicle)}</p>
          <p className="mt-1 text-sm text-slate-600">
            {BODY_TYPE_LABELS[vehicle.bodyType]} · {POWERTRAIN_LABELS[vehicle.powertrain]}
          </p>
          <p className="mt-2 text-lg font-semibold">{odometer.toLocaleString('en-US')} mi</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <LinkButton href={`/vehicles/${vehicle.id}/edit`}>Edit</LinkButton>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      <nav aria-label="Vehicle sections" className="mt-6 flex gap-1 border-b border-slate-300">
        {TABS.map((entry) => (
          <Link
            key={entry.id}
            href={`/vehicles/${vehicle.id}${entry.suffix}`}
            aria-current={tab === entry.id ? 'page' : undefined}
            className={`-mb-px flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold ${
              tab === entry.id
                ? 'border-brand-700 text-brand-800'
                : 'border-transparent text-slate-700 hover:text-slate-950'
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5">
        {tab === 'maintenance' && <MaintenanceTab vehicle={vehicle} />}
        {tab === 'service' && <ServiceHistoryTab vehicle={vehicle} />}
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Delete ${vehicle.description}?`}
          confirmLabel="Delete vehicle"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            deleteVehicle(vehicle.id);
            navigate('/');
          }}
        >
          This also deletes its service history and fuel log. This can't be undone.
        </ConfirmDialog>
      )}
    </>
  );
}
