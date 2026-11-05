import { formatDate } from '../domain/dates';
import { policyStatus, telHref, vehicleNames } from '../domain/insurance';
import type { InsurancePolicy, Vehicle } from '../domain/schemas';
import { PolicyBadge } from './StatusBadge';
import { Card, LinkButton } from './ui';

export function PolicyCard({
  policy,
  vehicles,
  today,
}: {
  policy: InsurancePolicy;
  vehicles: Vehicle[];
  today: string;
}) {
  const status = policyStatus(policy, today);
  const tel = telHref(policy.phone);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="font-semibold">{policy.company}</h2>
            <PolicyBadge status={status} />
          </div>
          <p className="text-sm text-slate-600">{vehicleNames(policy, vehicles)}</p>
        </div>
        <LinkButton href={`/insurance/${policy.id}`}>
          Edit<span className="sr-only">: {policy.company}</span>
        </LinkButton>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-600">Policy number</dt>
          <dd className="font-medium break-all">{policy.policyNumber}</dd>
        </div>
        <div>
          <dt className="text-slate-600">{status === 'expired' ? 'Expired' : 'Expires'}</dt>
          <dd className="font-medium">{formatDate(policy.expirationDate)}</dd>
        </div>
        {policy.phone && (
          <div>
            <dt className="text-slate-600">Phone</dt>
            <dd className="font-medium">
              {tel ? (
                <a href={tel} className="text-brand-700 underline underline-offset-2">
                  {policy.phone}
                </a>
              ) : (
                policy.phone
              )}
            </dd>
          </div>
        )}
      </dl>
      {policy.notes && (
        <p className="mt-3 text-sm whitespace-pre-line text-slate-700">{policy.notes}</p>
      )}
    </Card>
  );
}
