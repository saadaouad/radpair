import { studyListSchema } from '@repo/contracts';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { ApiErrorNotice, fetchErrorMessage } from '@/components/api-error-notice.tsx';
import { StudyCards } from '@/components/worklist/study-cards.tsx';
import { StudyTable } from '@/components/worklist/study-table.tsx';
import { WorklistSkeleton } from '@/components/worklist/worklist-skeleton.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { useFetch } from '@/hooks/use-fetch.ts';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'draft', label: 'Draft' },
  { id: 'signed', label: 'Signed' }
] as const;

type FilterId = (typeof filters)[number]['id'];

const isFilter = (value: string | null): value is FilterId => {
  return filters.some((filter) => filter.id === value);
};

const studiesEndpoint = (status: FilterId, query: string) => {
  const params = new URLSearchParams();
  if (status !== 'all') {
    params.set('status', status);
  }
  const trimmed = query.trim();
  if (trimmed.length > 0) {
    params.set('search', trimmed);
  }
  const serialized = params.toString();
  return serialized.length > 0 ? `/api/studies?${serialized}` : '/api/studies';
};

export const WorklistPage = () => {
  const [params, setParams] = useSearchParams();
  const requested = params.get('status');
  const status: FilterId = isFilter(requested) ? requested : 'all';
  const query = params.get('q') ?? '';
  const endpoint = useMemo(() => studiesEndpoint(status, query), [query, status]);
  const studies = useFetch(
    ['studies', status, query],
    endpoint,
    (body) => studyListSchema.parse(body).studies,
    { fallback: 'The worklist could not be loaded.' }
  );

  const updateParams = (nextStatus: FilterId, nextQuery: string) => {
    const next = new URLSearchParams(params);
    if (nextStatus === 'all') {
      next.delete('status');
    } else {
      next.set('status', nextStatus);
    }
    if (nextQuery.trim().length === 0) {
      next.delete('q');
    } else {
      next.set('q', nextQuery);
    }
    setParams(next, { replace: true });
  };

  const visible = studies.data ?? [];
  const search = params.toString();
  const studyHref = (id: string) =>
    search.length > 0 ? `/studies/${id}?${search}` : `/studies/${id}`;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Worklist</h1>
        <p className="text-sm text-muted-foreground">
          Studies waiting to be read, drafts in progress, and signed reports.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p id="status-filter-label" className="text-sm font-medium">
            Status
          </p>
          <div
            aria-labelledby="status-filter-label"
            className="flex flex-wrap gap-2"
            role="radiogroup"
          >
            {filters.map((filter) => {
              const selected = filter.id === status;
              return (
                <Button
                  aria-checked={selected}
                  key={filter.id}
                  onClick={() => updateParams(filter.id, query)}
                  role="radio"
                  size="sm"
                  type="button"
                  variant={selected ? 'default' : 'outline'}
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="w-full space-y-2 lg:max-w-sm">
          <label className="text-sm font-medium" htmlFor="worklist-search">
            Search
          </label>
          <Input
            id="worklist-search"
            onChange={(event) => updateParams(status, event.target.value)}
            placeholder="Name, reference, modality, or body part"
            value={query}
          />
        </div>
      </div>

      {studies.isPending ? <WorklistSkeleton /> : null}
      {studies.isError ? (
        <ApiErrorNotice
          message={fetchErrorMessage(studies.error, 'The worklist could not be loaded.')}
          onRetry={() => studies.refetch()}
        />
      ) : null}
      {!studies.isPending && !studies.isError && visible.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No studies match these filters.</p>
          <Button
            className="mt-4"
            onClick={() => updateParams('all', '')}
            type="button"
            variant="outline"
          >
            Clear filters
          </Button>
        </div>
      ) : null}
      {visible.length > 0 ? (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {visible.length === 1 ? '1 study' : `${visible.length} studies`}
          </p>
          <StudyTable hrefFor={studyHref} studies={visible} />
          <StudyCards hrefFor={studyHref} studies={visible} />
        </>
      ) : null}
    </section>
  );
};
