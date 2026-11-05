import { PolicyCard } from '../components/PolicyCard';
import { EmptyState, LinkButton } from '../components/ui';
import { toLocalIso } from '../domain/dates';
import { policiesForVehicle } from '../domain/insurance';
import type { Vehicle } from '../domain/schemas';
import { useGarage } from '../store/garageStore';

export function InsuranceTab({ vehicle }: { vehicle: Vehicle }) {
  const data = useGarage((state) => state.data);
  const addHref = `/insurance/new/${vehicle.id}`;
  const policies = policiesForVehicle(data.insurancePolicies, vehicle.id);

  if (policies.length === 0) {
    return (
      <EmptyState
        title="No insurance on file"
        action={
          <LinkButton href={addHref} variant="primary">
            Add policy
          </LinkButton>
        }
      >
        Keep your policy details handy, and get a reminder before it expires.
      </EmptyState>
    );
  }

  const today = toLocalIso(new Date());
  return (
    <>
      <div className="mb-3 flex justify-end">
        <LinkButton href={addHref} variant="primary">
          Add policy
        </LinkButton>
      </div>
      <div className="space-y-3">
        {policies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} vehicles={data.vehicles} today={today} />
        ))}
      </div>
    </>
  );
}
