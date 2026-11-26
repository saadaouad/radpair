import { Component, type ReactNode } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { Sentry } from '@/instrument.ts';
import { Button } from '@/components/ui/button.tsx';

const ErrorNotice = ({ message, action }: { message: string; action: ReactNode }) => {
  return (
    <div className="rounded-xl border border-dashed px-4 py-8">
      <p className="text-sm">{message}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
};

const homeLink = (
  <Button asChild variant="outline">
    <Link to="/">Back to worklist</Link>
  </Button>
);

export const RouteError = () => {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;

  return (
    <ErrorNotice
      action={homeLink}
      message={missing ? 'This page does not exist.' : 'This page could not be shown.'}
    />
  );
};

export const NotFound = () => {
  return <ErrorNotice action={homeLink} message="This page does not exist." />;
};

type ErrorBoundaryProps = {
  children: ReactNode;
  message?: string;
  resetKey?: string;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error('Something went wrong.') };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
    Sentry.captureException(error);
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <ErrorNotice
        action={
          <Button onClick={this.reset} type="button" variant="outline">
            Try again
          </Button>
        }
        message={this.props.message ?? 'This page could not be shown.'}
      />
    );
  }
}
