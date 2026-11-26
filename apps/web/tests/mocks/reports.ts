import type { ReportResponse, StudyImageResponse, StudyResponse } from '@repo/contracts';

export const studyId = '10000000-0000-4000-8000-000000000006';
export const reportId = '30000000-0000-4000-8000-000000000006';
export const firstImageId = '20000000-0000-4000-8000-000000000061';
export const secondImageId = '20000000-0000-4000-8000-000000000062';

const timestamps = {
  createdAt: '2026-11-18T10:15:00.000Z',
  updatedAt: '2026-11-18T10:15:00.000Z'
};

export const kneeBodyPart = 'Left knee';

export const kneeStudy: StudyResponse = {
  id: studyId,
  patientName: 'Nora Kim',
  patientReference: 'REF-06',
  modality: 'MR',
  bodyPart: kneeBodyPart,
  performedAt: '2026-11-18T10:15:00.000Z',
  status: 'draft',
  reportId
};

export const studies: StudyResponse[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    patientName: 'Amelia Crowe',
    patientReference: 'REF-01',
    modality: 'CT',
    bodyPart: 'Head',
    performedAt: '2026-11-20T09:00:00.000Z',
    status: 'unread',
    reportId: '30000000-0000-4000-8000-000000000001'
  },
  kneeStudy,
  {
    id: '10000000-0000-4000-8000-000000000007',
    patientName: 'Leo Hart',
    patientReference: 'REF-07',
    modality: 'XR',
    bodyPart: 'Right wrist',
    performedAt: '2026-11-12T08:00:00.000Z',
    status: 'signed',
    reportId: '30000000-0000-4000-8000-000000000007'
  }
];

export const kneeImages: StudyImageResponse[] = [
  {
    id: firstImageId,
    studyId,
    url: '/studies/mr-knee-1.svg',
    thumbnailUrl: '/studies/mr-knee-1.svg',
    position: 1
  },
  {
    id: secondImageId,
    studyId,
    url: '/studies/mr-knee-2.svg',
    thumbnailUrl: '/studies/mr-knee-2.svg',
    position: 2
  }
];

export const kneeReport: ReportResponse = {
  id: reportId,
  studyId,
  version: 1,
  status: 'draft',
  signedAt: null,
  ...timestamps,
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Findings' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Marrow edema in the lateral femoral condyle.' }]
      },
      {
        type: 'keyImage',
        attrs: { imageId: firstImageId, caption: 'Edema in the lateral femoral condyle' }
      }
    ]
  }
};

export const emptyReport: ReportResponse = {
  ...kneeReport,
  content: { type: 'doc', content: [{ type: 'paragraph' }] }
};

export const otherTabDocument = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'From the other tab.' }] }]
};
