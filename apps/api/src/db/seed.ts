import { sql } from 'drizzle-orm';

import { imageCount, imageId, reportId, revisionId, seedStudies } from '@/db/catalog.ts';
import { closeDatabase, db } from '@/db/connection.ts';
import { reportRevisions, reports, studies, studyImages } from '@/db/schema.ts';
import { env } from '@/env.ts';

const studyNumber = (reference: string) => reference.slice(-2);

for (const entry of seedStudies) {
  const number = studyNumber(entry.patientReference);

  await db
    .insert(studies)
    .values({
      id: entry.id,
      patientName: entry.patientName,
      patientReference: entry.patientReference,
      modality: entry.modality,
      bodyPart: entry.bodyPart,
      performedAt: new Date(entry.performedAt)
    })
    .onConflictDoUpdate({
      target: studies.id,
      set: {
        patientName: entry.patientName,
        patientReference: entry.patientReference,
        modality: entry.modality,
        bodyPart: entry.bodyPart,
        performedAt: new Date(entry.performedAt)
      }
    });

  await db
    .insert(studyImages)
    .values(
      Array.from({ length: imageCount }, (_, index) => {
        const position = index + 1;
        const path = `/studies/${entry.slug}-${position}.svg`;
        return {
          id: imageId(number, position),
          studyId: entry.id,
          url: path,
          thumbnailUrl: path,
          position
        };
      })
    )
    .onConflictDoNothing();

  await db
    .insert(reports)
    .values({
      id: reportId(number),
      studyId: entry.id,
      content: entry.content,
      version: 1,
      status: entry.status,
      signedAt: entry.signedAt ? new Date(entry.signedAt) : null
    })
    .onConflictDoNothing();

  await db
    .insert(reportRevisions)
    .values({
      id: revisionId(number),
      reportId: reportId(number),
      version: 1,
      content: entry.content
    })
    .onConflictDoNothing();
}

const counts = await db.execute<{
  studies: number;
  images: number;
  reports: number;
  revisions: number;
}>(sql`
  select
    (select count(*) from studies)::int as studies,
    (select count(*) from study_images)::int as images,
    (select count(*) from reports)::int as reports,
    (select count(*) from report_revisions)::int as revisions
`);

const row = counts.rows[0];
console.log(
  `Seed complete for APP_ENV=${env.APP_ENV}: ${row?.studies ?? 0} studies, ${row?.images ?? 0} images, ${row?.reports ?? 0} reports, ${row?.revisions ?? 0} revisions`
);
await closeDatabase();
