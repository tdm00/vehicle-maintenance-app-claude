import { EmptyState, LinkButton } from '../components/ui';

export function NotFoundPage() {
  return (
    <EmptyState
      title="We couldn't find that page"
      action={
        <LinkButton href="/" variant="primary">
          Back to My Garage
        </LinkButton>
      }
    >
      It may have been deleted.
    </EmptyState>
  );
}
