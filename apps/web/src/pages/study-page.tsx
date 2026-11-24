import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';

import { StatusBadge } from '@/components/status-badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { formatExamDate } from '@/lib/format.ts';
import { fetchStudy } from '@/lib/studies.ts';

export const StudyPage = () => {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const search = params.toString();
  const worklistHref = search.length > 0 ? `/?${search}` : '/';
  const study = useQuery({
    queryKey: ['study', id],
    queryFn: () => fetchStudy(id),
    enabled: id.length > 0
  });

  return (
    <section className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={worklistHref}>Back to worklist</Link>
      </Button>

      {study.isPending ? <p className="text-sm text-muted-foreground">Loading the study.</p> : null}
      {study.isError ? (
        <div className="rounded-xl border border-dashed px-4 py-8">
          <p className="text-sm">This study could not be opened.</p>
          <Button className="mt-4" onClick={() => study.refetch()} type="button" variant="outline">
            Try again
          </Button>
        </div>
      ) : null}
      {study.data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{study.data.patientReference}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{study.data.patientName}</h1>
            </div>
            <StatusBadge status={study.data.status} />
          </div>
          <dl className="grid gap-4 rounded-xl border bg-card p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Modality</dt>
              <dd className="mt-1 font-medium">{study.data.modality}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Body part</dt>
              <dd className="mt-1 font-medium">{study.data.bodyPart}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Exam date</dt>
              <dd className="mt-1 font-medium">{formatExamDate(study.data.performedAt)}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
};
