import { Link } from 'wouter';
import { TaskList } from '../components/TaskList';
import { Button, EmptyState, LinkButton, PageTitle } from '../components/ui';
import { VehicleCard } from '../components/VehicleCard';
import { sampleData } from '../data/sampleData';
import { daysBetween, toLocalIso } from '../domain/dates';
import { buildTaskList } from '../domain/maintenance';
import { currentOdometer } from '../domain/odometer';
import { useGarage } from '../store/garageStore';

const BACKUP_NUDGE_DAYS = 30;

export function GaragePage() {
  const data = useGarage((state) => state.data);
  const replaceData = useGarage((state) => state.replaceData);
  const today = toLocalIso(new Date());

  if (data.vehicles.length === 0) {
    return (
      <>
        <PageTitle>My Garage</PageTitle>
        <EmptyState
          title="Your garage is empty"
          action={
            <>
              <LinkButton href="/vehicles/new" variant="primary">
                Add your first vehicle
              </LinkButton>
              <Button onClick={() => replaceData(sampleData(data, today))}>Load sample data</Button>
            </>
          }
        >
          Add a vehicle to track its service history, fuel economy, insurance, and upcoming
          maintenance.
        </EmptyState>
      </>
    );
  }

  const tasks = buildTaskList(data, today);
  const { lastBackupAt } = data.settings;
  const needsBackup = !lastBackupAt || daysBetween(lastBackupAt, today) > BACKUP_NUDGE_DAYS;
  const taskCount = (vehicleId: string) =>
    tasks.actionable.filter((item) => item.vehicle.id === vehicleId).length +
    tasks.insurance.filter((policy) => policy.vehicleIds.includes(vehicleId)).length;

  return (
    <>
      <PageTitle
        action={
          <LinkButton href="/vehicles/new" variant="primary">
            Add vehicle
          </LinkButton>
        }
      >
        My Garage
      </PageTitle>
      {needsBackup && (
        <p className="mb-5 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 ring-1 ring-brand-100">
          {lastBackupAt
            ? "It's been a while since your last backup."
            : "You haven't made a backup."}{' '}
          Your data is stored only in this browser.{' '}
          <Link href="/settings" className="font-semibold underline underline-offset-2">
            Back up now
          </Link>
        </p>
      )}
      <TaskList tasks={tasks} vehicles={data.vehicles} today={today} />
      <section aria-labelledby="vehicles-heading">
        <h2 id="vehicles-heading" className="mb-3 text-lg font-semibold">
          Vehicles
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              odometer={currentOdometer(vehicle, data.serviceRecords, data.fuelFillUps)}
              badge={taskCount(vehicle.id) > 0 ? `${taskCount(vehicle.id)} due` : undefined}
            />
          ))}
        </div>
      </section>
    </>
  );
}
