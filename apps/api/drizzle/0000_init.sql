CREATE TABLE "report_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_revisions_version_positive" CHECK ("report_revisions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'unread' NOT NULL,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_status_check" CHECK ("reports"."status" in ('unread', 'draft', 'signed')),
	CONSTRAINT "reports_version_positive" CHECK ("reports"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_name" text NOT NULL,
	"patient_reference" text NOT NULL,
	"modality" text NOT NULL,
	"body_part" text NOT NULL,
	"performed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"study_id" uuid NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_revisions" ADD CONSTRAINT "report_revisions_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_images" ADD CONSTRAINT "study_images_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_revisions_report_version_unique" ON "report_revisions" USING btree ("report_id","version");--> statement-breakpoint
CREATE INDEX "report_revisions_report_id_idx" ON "report_revisions" USING btree ("report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_study_id_unique" ON "reports" USING btree ("study_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "studies_patient_reference_unique" ON "studies" USING btree ("patient_reference");--> statement-breakpoint
CREATE INDEX "studies_performed_at_idx" ON "studies" USING btree ("performed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "study_images_study_position_unique" ON "study_images" USING btree ("study_id","position");--> statement-breakpoint
CREATE INDEX "study_images_study_id_idx" ON "study_images" USING btree ("study_id");