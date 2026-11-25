import type { StudyResponse } from '@repo/contracts';
import { Link } from 'react-router';

import { StatusBadge } from '@/components/status-badge.tsx';
import { formatExamDate } from '@/lib/format.ts';

export const StudyCards = ({
  studies,
  hrefFor
}: {
  studies: StudyResponse[];
  hrefFor: (id: string) => string;
}) => {
  return (
    <ul className="grid gap-3 lg:hidden">
      {studies.map((study) => (
        <li key={study.id}>
          <Link
            className="block rounded-xl border bg-card p-4 text-card-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            to={hrefFor(study.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{study.patientName}</p>
                <p className="text-sm text-muted-foreground">{study.patientReference}</p>
              </div>
              <StatusBadge status={study.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Modality</dt>
                <dd>{study.modality}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Body part</dt>
                <dd>{study.bodyPart}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Exam date</dt>
                <dd>{formatExamDate(study.performedAt)}</dd>
              </div>
            </dl>
          </Link>
        </li>
      ))}
    </ul>
  );
};
