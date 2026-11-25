import type { ReportResponse, StudyResponse } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { StatusBadge } from '@/components/status-badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useFetch } from '@/hooks/use-fetch.ts';
import { formatExamDate } from '@/lib/format.ts';
import { fetchStudyImages, fetchStudyReport } from '@/lib/reports.ts';
import { fetchStudy } from '@/lib/studies.ts';

const ReportWorkspace = lazy(() =>
  import('@/components/report/editor.tsx').then((module) => ({ default: module.ReportWorkspace }))
);

export const StudyPage = () => {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const search = params.toString();
  const worklistHref = search.length > 0 ? `/?${search}` : '/';
  const enabled = id.length > 0;
  const study = useFetch(['study', id], () => fetchStudy(id), { enabled });
  const images = useFetch(['study-images', id], () => fetchStudyImages(id), { enabled });
  const report = useFetch(['study-report', id], () => fetchStudyReport(id), { enabled });
  const failed = study.isError || images.isError || report.isError;
  const failureMessage = [study.error, images.error, report.error].find(
    (error): error is Error => error instanceof Error
  );

  const retry = () => {
    void study.refetch();
    void images.refetch();
    void report.refetch();
  };

  return (
    <section className="space-y-6">
      <Button asChild className="-ml-2" size="sm" variant="ghost">
        <Link to={worklistHref}>Back to worklist</Link>
      </Button>

      {study.isPending ? <p className="text-sm text-muted-foreground">Loading the study.</p> : null}
      {failed ? (
        <div className="rounded-xl border border-dashed px-4 py-8">
          <p className="text-sm">{failureMessage?.message ?? 'This study could not be opened.'}</p>
          <Button className="mt-4" onClick={retry} type="button" variant="outline">
            Try again
          </Button>
        </div>
      ) : null}
      {study.data && !failed ? (
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
          {images.data && report.data ? (
            <Suspense
              fallback={<p className="text-sm text-muted-foreground">Loading the report.</p>}
            >
              <ReportWorkspace
                images={images.data}
                key={report.data.id}
                onSigned={(signed) => applySignedReport(queryClient, signed)}
                readOnly={report.data.status === 'signed'}
                report={report.data}
              />
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground">Loading the report.</p>
          )}
        </div>
      ) : null}
    </section>
  );
};

const applySignedReport = (
  queryClient: ReturnType<typeof useQueryClient>,
  signed: ReportResponse
) => {
  queryClient.setQueryData(['study-report', signed.studyId], signed);
  queryClient.setQueryData<StudyResponse>(['study', signed.studyId], (current) =>
    current ? { ...current, status: 'signed' } : current
  );
  queryClient.setQueryData<StudyResponse[]>(['studies'], (current) =>
    current?.map((study) => (study.id === signed.studyId ? { ...study, status: 'signed' } : study))
  );
};
