CREATE TABLE "support_issue" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"issue_summary" text NOT NULL,
	"issue_details" text,
	"include_diagnostic_bundle" boolean DEFAULT false NOT NULL,
	"consented_to_diagnostic_bundle" boolean DEFAULT false NOT NULL,
	"consent_captured_at" timestamp,
	"diagnostic_bundle" jsonb,
	"priority_tier" text DEFAULT 'standard' NOT NULL,
	"priority_reason" text NOT NULL,
	"sla_target_minutes" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_switch" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"reason" text,
	"changed_by_user_id" text,
	"effective_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "alternate_window_start" timestamp;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "alternate_window_end" timestamp;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "partner_responded_at" timestamp;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "support_issue" ADD CONSTRAINT "support_issue_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_switch" ADD CONSTRAINT "safety_switch_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_issue_user_id_idx" ON "support_issue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_issue_status_idx" ON "support_issue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_issue_created_at_idx" ON "support_issue" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "safety_switch_scope_uq" ON "safety_switch" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "safety_switch_enabled_idx" ON "safety_switch" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "safety_switch_effective_at_idx" ON "safety_switch" USING btree ("effective_at");--> statement-breakpoint
CREATE INDEX "booking_partner_responded_at_idx" ON "booking" USING btree ("partner_responded_at");