import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';

import { ErrorBoundary, NotFound } from '@/components/error-boundary.tsx';

const Boom = ({ fail }: { fail: boolean }) => {
  if (fail) {
    throw new Error('The report editor crashed.');
  }
  return <p>Ready</p>;
};

const Host = () => {
  const [fail, setFail] = useState(true);
  return (
    <>
      <button onClick={() => setFail(false)} type="button">
        Fix
      </button>
      <ErrorBoundary>
        <Boom fail={fail} />
      </ErrorBoundary>
    </>
  );
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('keeps the page usable when a child crashes', async () => {
  const user = userEvent.setup();
  render(<Host />);

  expect(screen.getByText('This page could not be shown.')).toBeInTheDocument();
  expect(screen.queryByText('Ready')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Fix' }));
  await user.click(screen.getByRole('button', { name: 'Try again' }));

  expect(screen.getByText('Ready')).toBeInTheDocument();
  expect(screen.queryByText('This page could not be shown.')).not.toBeInTheDocument();
});

it('clears the error when the page changes', () => {
  const { rerender } = render(
    <ErrorBoundary resetKey="/studies/one">
      <Boom fail />
    </ErrorBoundary>
  );

  expect(screen.getByText('This page could not be shown.')).toBeInTheDocument();

  rerender(
    <ErrorBoundary resetKey="/studies/two">
      <Boom fail={false} />
    </ErrorBoundary>
  );

  expect(screen.getByText('Ready')).toBeInTheDocument();
});

it('leaves the shell in place when a route crashes', async () => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <Link to="/">RADPAIR</Link>
            <Outlet />
          </>
        ),
        children: [
          {
            index: true,
            element: (
              <ErrorBoundary>
                <Boom fail />
              </ErrorBoundary>
            )
          },
          { path: '*', element: <NotFound /> }
        ]
      }
    ],
    { initialEntries: ['/'] }
  );

  render(<RouterProvider router={router} />);

  expect(screen.getByRole('link', { name: 'RADPAIR' })).toBeInTheDocument();
  expect(screen.getByText('This page could not be shown.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});

it('shows a missing page inside the shell', async () => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <Link to="/">RADPAIR</Link>
            <Outlet />
          </>
        ),
        children: [{ path: '*', element: <NotFound /> }]
      }
    ],
    { initialEntries: ['/missing'] }
  );

  render(<RouterProvider router={router} />);

  expect(screen.getByRole('link', { name: 'RADPAIR' })).toBeInTheDocument();
  expect(screen.getByText('This page does not exist.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to worklist' })).toHaveAttribute('href', '/');
});
