import { TaskList } from '../components/TaskList';
import { EmptyState, LinkButton, PageTitle } from '../components/ui';
import { VehicleCard } from '../components/VehicleCard';
import { toLocalIso } from '../domain/dates';
import { buildTaskList } from '../domain/maintenance';
import { currentOdometer } from '../domain/odometer';
import { useGarage } from '../store/garageStore';

export function GaragePage() {
  const data = useGarage((state) => state.data);

  if (data.vehicles.length === 0) {
    return (
      <>
        <PageTitle>My Garage</PageTitle>
        <EmptyState
          title="Your garage is empty"
          action={
            <LinkButton href="/vehicles/new" variant="primary">
              Add your first vehicle
            </LinkButton>
          }
        >
          Add a vehicle to track its service history, fuel economy, and upcoming maintenance.
        </EmptyState>
      </>
    );
  }

  const tasks = buildTaskList(data, toLocalIso(new Date()));
  const taskCount = (vehicleId: string) =>
    tasks.actionable.filter((item) => item.vehicle.id === vehicleId).length;

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
      <TaskList tasks={tasks} />
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
