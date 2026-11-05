import { type ComponentProps, type ReactNode, useEffect, useId, useRef } from 'react';
import { Link } from 'wouter';

const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50';

const VARIANTS = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary: 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50',
  danger: 'bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50',
  dangerSolid: 'bg-red-700 text-white hover:bg-red-800',
};

type Variant = keyof typeof VARIANTS;

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return (
    <button type="button" {...props} className={`${BASE} ${VARIANTS[variant]} ${className}`} />
  );
}

export function LinkButton({
  variant = 'secondary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; className?: string }) {
  return <Link {...props} className={`${BASE} ${VARIANTS[variant]} ${className}`} />;
}

export function Card({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={`rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}
    />
  );
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {action}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-1 px-1 text-sm font-medium text-slate-700 hover:text-slate-950"
    >
      <span aria-hidden="true">←</span> {children}
    </Link>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="px-6 py-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </Card>
  );
}

const CONTROL =
  'block min-h-11 w-full rounded-xl border-0 bg-white px-3 py-2 text-base text-slate-900 ring-1 ring-slate-300 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-600';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

function FieldShell({
  id,
  label,
  error,
  hint,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

export function TextField({ label, error, hint, ...props }: FieldProps & ComponentProps<'input'>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        type="text"
        {...props}
        className={CONTROL}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  children,
  ...props
}: FieldProps & ComponentProps<'select'>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        {...props}
        className={CONTROL}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  ...props
}: FieldProps & ComponentProps<'textarea'>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        rows={3}
        {...props}
        className={CONTROL}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
      />
    </FieldShell>
  );
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-6 shadow-xl"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-2 text-sm text-slate-700">{children}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="dangerSolid" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
