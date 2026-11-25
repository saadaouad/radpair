import type { StudyResponse } from '@repo/contracts';
import { Link } from 'react-router';

import { StatusBadge } from '@/components/status-badge.tsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table.tsx';
import { formatExamDate } from '@/lib/format.ts';

export const StudyTable = ({
  studies,
  hrefFor
}: {
  studies: StudyResponse[];
  hrefFor: (id: string) => string;
}) => {
  return (
    <div className="hidden overflow-hidden rounded-xl border lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Modality</TableHead>
            <TableHead>Body part</TableHead>
            <TableHead>Exam date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studies.map((study) => (
            <TableRow key={study.id}>
              <TableCell>
                <Link
                  className="font-medium underline-offset-4 hover:underline focus-visible:underline"
                  to={hrefFor(study.id)}
                >
                  {study.patientReference}
                  <span className="sr-only">
                    , {study.patientName}, {study.modality} {study.bodyPart}
                  </span>
                </Link>
              </TableCell>
              <TableCell>{study.patientName}</TableCell>
              <TableCell>{study.modality}</TableCell>
              <TableCell>{study.bodyPart}</TableCell>
              <TableCell>{formatExamDate(study.performedAt)}</TableCell>
              <TableCell>
                <StatusBadge status={study.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
