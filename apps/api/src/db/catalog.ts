import type { ReportContent, ReportStatus } from '@/db/schema.ts';

const id = (kind: '1' | '2' | '3' | '4', tail: string) =>
  `${kind}0000000-0000-4000-8000-${tail.padStart(12, '0')}`;

export const emptyReport = (): ReportContent => ({
  type: 'doc',
  content: [{ type: 'paragraph' }]
});

const paragraph = (text: string): ReportContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }]
});

const heading = (text: string): ReportContent => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text }]
});

export type SeedStudy = {
  id: string;
  slug: string;
  patientName: string;
  patientReference: string;
  modality: string;
  bodyPart: string;
  performedAt: string;
  status: ReportStatus;
  content: ReportContent;
  signedAt: string | null;
};

const study = (
  number: string,
  slug: string,
  patientName: string,
  modality: string,
  bodyPart: string,
  performedAt: string,
  status: ReportStatus,
  content: ReportContent,
  signedAt: string | null
): SeedStudy => ({
  id: id('1', number),
  slug,
  patientName,
  patientReference: `REF-${number}`,
  modality,
  bodyPart,
  performedAt,
  status,
  content,
  signedAt
});

export const seedStudies: SeedStudy[] = [
  study(
    '01',
    'ct-head',
    'Amelia Crowe',
    'CT',
    'Head',
    '2026-11-20T09:10:00.000Z',
    'unread',
    emptyReport(),
    null
  ),
  study(
    '02',
    'mr-lumbar-spine',
    'Jonah Hale',
    'MR',
    'Lumbar spine',
    '2026-11-20T11:40:00.000Z',
    'unread',
    emptyReport(),
    null
  ),
  study(
    '03',
    'xr-chest',
    'Priya Shah',
    'XR',
    'Chest',
    '2026-11-21T08:05:00.000Z',
    'unread',
    emptyReport(),
    null
  ),
  study(
    '04',
    'us-abdomen',
    'Elena Voss',
    'US',
    'Abdomen',
    '2026-11-21T14:20:00.000Z',
    'unread',
    emptyReport(),
    null
  ),
  study(
    '05',
    'ct-chest',
    'Marcus Bell',
    'CT',
    'Chest',
    '2026-11-18T16:30:00.000Z',
    'draft',
    {
      type: 'doc',
      content: [
        heading('Findings'),
        paragraph('Patchy opacity at the right lung base. The remaining lungs are clear.')
      ]
    },
    null
  ),
  study(
    '06',
    'mr-knee',
    'Nora Kim',
    'MR',
    'Left knee',
    '2026-11-18T10:15:00.000Z',
    'draft',
    {
      type: 'doc',
      content: [
        heading('Findings'),
        paragraph('Marrow edema in the lateral femoral condyle.'),
        {
          type: 'keyImage',
          attrs: {
            imageId: id('2', '061'),
            caption: 'Edema in the lateral femoral condyle'
          }
        }
      ]
    },
    null
  ),
  study(
    '07',
    'xr-wrist',
    'Leo Hart',
    'XR',
    'Right wrist',
    '2026-11-12T13:45:00.000Z',
    'signed',
    {
      type: 'doc',
      content: [
        heading('Findings'),
        paragraph('No fracture or dislocation. Alignment is maintained.')
      ]
    },
    '2026-11-12T15:00:00.000Z'
  ),
  study(
    '08',
    'ct-abdomen',
    'Sofia Marin',
    'CT',
    'Abdomen',
    '2026-11-11T07:55:00.000Z',
    'signed',
    {
      type: 'doc',
      content: [
        heading('Findings'),
        paragraph('The appendix is normal. No free air or free fluid.')
      ]
    },
    '2026-11-11T09:10:00.000Z'
  )
];

export const imageId = (studyNumber: string, position: number) =>
  id('2', `${studyNumber}${position}`);

export const reportId = (studyNumber: string) => id('3', studyNumber);

export const revisionId = (studyNumber: string) => id('4', studyNumber);

export const imageCount = 4;
