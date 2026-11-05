import type { PolicyStatus } from '../domain/insurance';
import type { MaintenanceStatus } from '../domain/maintenance';
import { STATUS_LABELS } from './maintenanceText';

const STYLES: Record<MaintenanceStatus, { className: string; icon: string }> = {
  overdue: { className: 'bg-red-100 text-red-800', icon: '!' },
  dueSoon: { className: 'bg-amber-100 text-amber-900', icon: '◷' },
  noRecord: { className: 'bg-slate-200 text-slate-800', icon: '?' },
  ok: { className: 'bg-emerald-100 text-emerald-800', icon: '✓' },
};

export function StatusBadge({
  status,
  label = STATUS_LABELS[status],
}: {
  status: MaintenanceStatus;
  label?: string;
}) {
  const { className, icon } = STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

const POLICY_BADGES: Record<PolicyStatus, { label: string; status: MaintenanceStatus }> = {
  expired: { label: 'Expired', status: 'overdue' },
  expiringSoon: { label: 'Expiring soon', status: 'dueSoon' },
  active: { label: 'Active', status: 'ok' },
};

export function PolicyBadge({ status }: { status: PolicyStatus }) {
  return <StatusBadge {...POLICY_BADGES[status]} />;
}
