CREATE TABLE IF NOT EXISTS "diy_guide" (
	"id" serial PRIMARY KEY NOT NULL,
	"dtc_code" varchar(16) NOT NULL,
	"title" text NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"difficulty" text NOT NULL,
	"tools" jsonb NOT NULL,
	"parts" jsonb NOT NULL,
	"safety_warnings" jsonb NOT NULL,
	"steps" jsonb NOT NULL,
	"review_status" text DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN IF NOT EXISTS "vetting_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN IF NOT EXISTS "availability" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN IF NOT EXISTS "service_area" jsonb;--> statement-breakpoint
ALTER TABLE "partner" ADD COLUMN IF NOT EXISTS "data_freshness_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diy_guide_dtc_code_idx" ON "diy_guide" USING btree ("dtc_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diy_guide_review_status_idx" ON "diy_guide" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diy_guide_active_idx" ON "diy_guide" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "feedback_user_recommendation_uq" ON "feedback" USING btree ("user_id","recommendation_id");
