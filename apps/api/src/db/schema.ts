import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

export const reportStatuses = ['unread', 'draft', 'signed'] as const;
export type ReportStatus = (typeof reportStatuses)[number];

export type ReportContent = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ReportContent[];
  text?: string;
};

export const studies = pgTable(
  'studies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientName: text('patient_name').notNull(),
    patientReference: text('patient_reference').notNull(),
    modality: text('modality').notNull(),
    bodyPart: text('body_part').notNull(),
    performedAt: timestamp('performed_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('studies_patient_reference_unique').on(table.patientReference),
    index('studies_performed_at_idx').on(table.performedAt)
  ]
);

export const studyImages = pgTable(
  'study_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studyId: uuid('study_id')
      .notNull()
      .references(() => studies.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnail_url').notNull(),
    position: integer('position').notNull()
  },
  (table) => [
    uniqueIndex('study_images_study_position_unique').on(table.studyId, table.position),
    index('study_images_study_id_idx').on(table.studyId)
  ]
);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studyId: uuid('study_id')
      .notNull()
      .references(() => studies.id, { onDelete: 'cascade' }),
    content: jsonb('content').$type<ReportContent>().notNull(),
    version: integer('version').notNull().default(1),
    status: text('status').$type<ReportStatus>().notNull().default('unread'),
    signedAt: timestamp('signed_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('reports_study_id_unique').on(table.studyId),
    index('reports_status_idx').on(table.status),
    check('reports_status_check', sql`${table.status} in ('unread', 'draft', 'signed')`),
    check('reports_version_positive', sql`${table.version} > 0`)
  ]
);

export const reportRevisions = pgTable(
  'report_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: jsonb('content').$type<ReportContent>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('report_revisions_report_version_unique').on(table.reportId, table.version),
    index('report_revisions_report_id_idx').on(table.reportId),
    check('report_revisions_version_positive', sql`${table.version} > 0`)
  ]
);

export const studiesRelations = relations(studies, ({ many, one }) => ({
  images: many(studyImages),
  report: one(reports, {
    fields: [studies.id],
    references: [reports.studyId]
  })
}));

export const studyImagesRelations = relations(studyImages, ({ one }) => ({
  study: one(studies, {
    fields: [studyImages.studyId],
    references: [studies.id]
  })
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  study: one(studies, {
    fields: [reports.studyId],
    references: [studies.id]
  }),
  revisions: many(reportRevisions)
}));

export const reportRevisionsRelations = relations(reportRevisions, ({ one }) => ({
  report: one(reports, {
    fields: [reportRevisions.reportId],
    references: [reports.id]
  })
}));

export type Study = typeof studies.$inferSelect;
export type StudyImage = typeof studyImages.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type ReportRevision = typeof reportRevisions.$inferSelect;
