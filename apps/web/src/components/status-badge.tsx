import type { StudyResponse } from '@repo/contracts';

import { Badge } from '@/components/ui/badge.tsx';
import { statusLabel } from '@/lib/format.ts';

const variantFor = (status: StudyResponse['status']) => {
  if (status === 'signed') {
    return 'default' as const;
  }
  if (status === 'draft') {
    return 'secondary' as const;
  }
  return 'outline' as const;
};

export const StatusBadge = ({ status }: { status: StudyResponse['status'] }) => {
  return <Badge variant={variantFor(status)}>{statusLabel(status)}</Badge>;
};
