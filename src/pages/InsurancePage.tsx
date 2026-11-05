import { PolicyCard } from '../components/PolicyCard';
import { EmptyState, LinkButton, PageTitle } from '../components/ui';
import { toLocalIso } from '../domain/dates';
import { useGarage } from '../store/garageStore';

export function InsurancePage() {
  const data = useGarage((state) => state.data);
  const today = toLocalIso(new Date());

  if (data.insurancePolicies.length === 0) {
    return (
      <>
        <PageTitle>Insurance</PageTitle>
        <EmptyState
          title="No insurance on file"
          action={
            <LinkButton href="/insurance/new" variant="primary">
              Add policy
            </LinkButton>
          }
        >
          Add a policy once and attach it to every vehicle it covers.
        </EmptyState>
      </>
    );
  }

  const policies = [...data.insurancePolicies].sort((a, b) =>
    a.expirationDate.localeCompare(b.expirationDate),
  );

  return (
    <>
      <PageTitle
        action={
          <LinkButton href="/insurance/new" variant="primary">
            Add policy
          </LinkButton>
        }
      >
        Insurance
      </PageTitle>
      <div className="space-y-3">
        {policies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} vehicles={data.vehicles} today={today} />
        ))}
      </div>
    </>
  );
}
