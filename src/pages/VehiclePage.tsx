import { useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { BackLink, Button, ConfirmDialog, LinkButton } from '../components/ui';
import { vehicleName } from '../components/VehicleCard';
import { VehicleGraphic } from '../components/VehicleGraphic';
import { BODY_TYPE_LABELS, POWERTRAIN_LABELS } from '../data/vehicles';
import { currentOdometer } from '../domain/odometer';
import { useGarage } from '../store/garageStore';
import { FuelTab } from './FuelTab';
import { InsuranceTab } from './InsuranceTab';
import { MaintenanceTab } from './MaintenanceTab';
import { NotFoundPage } from './NotFoundPage';
import { ServiceHistoryTab } from './ServiceHistoryTab';

export type VehicleTab = 'maintenance' | 'service' | 'fuel' | 'insurance';

const TABS: { id: VehicleTab; label: string; suffix: string }[] = [
  { id: 'maintenance', label: 'Maintenance', suffix: '' },
  { id: 'service', label: 'Service', suffix: '/service' },
  { id: 'fuel', label: 'Fuel', suffix: '/fuel' },
  { id: 'insurance', label: 'Insurance', suffix: '/insurance' },
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
  // Electric vehicles have no fuel log, even if an old link points there.
  const electric = vehicle.powertrain === 'electric';
  const tabs = electric ? TABS.filter((entry) => entry.id !== 'fuel') : TABS;
  const active = electric && tab === 'fuel' ? 'maintenance' : tab;

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

      <nav
        aria-label="Vehicle sections"
        className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-300"
      >
        {tabs.map((entry) => (
          <Link
            key={entry.id}
            href={`/vehicles/${vehicle.id}${entry.suffix}`}
            aria-current={active === entry.id ? 'page' : undefined}
            className={`flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold ${
              active === entry.id
                ? 'border-brand-700 text-brand-800'
                : 'border-transparent text-slate-700 hover:text-slate-950'
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5">
        {active === 'maintenance' && <MaintenanceTab vehicle={vehicle} />}
        {active === 'service' && <ServiceHistoryTab vehicle={vehicle} />}
        {active === 'fuel' && <FuelTab vehicle={vehicle} />}
        {active === 'insurance' && <InsuranceTab vehicle={vehicle} />}
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
          This also deletes its service history and fuel log, and removes it from any insurance
          policy. This can't be undone.
        </ConfirmDialog>
      )}
    </>
  );
}
