import { EmptyState, LinkButton, PageTitle } from '../components/ui';
import { VehicleCard } from '../components/VehicleCard';
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
      <section aria-labelledby="vehicles-heading">
        <h2 id="vehicles-heading" className="sr-only">
          Vehicles
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              odometer={currentOdometer(vehicle, data.serviceRecords, data.fuelFillUps)}
            />
          ))}
        </div>
      </section>
    </>
  );
}
