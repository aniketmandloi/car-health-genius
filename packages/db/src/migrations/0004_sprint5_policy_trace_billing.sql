CREATE TABLE "analytics_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"event_key" text NOT NULL,
	"user_id" text,
	"channel" text DEFAULT 'server' NOT NULL,
	"source" text,
	"properties" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"model_version" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_key" text NOT NULL,
	"template_version" text NOT NULL,
	"template_hash" text NOT NULL,
	"template_body" text,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_trace" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" text,
	"correlation_id" text,
	"user_id" text,
	"diagnostic_event_id" integer,
	"recommendation_id" integer,
	"model_registry_id" integer,
	"prompt_template_id" integer,
	"generator_type" text DEFAULT 'rules' NOT NULL,
	"input_hash" varchar(128) NOT NULL,
	"output_summary" text,
	"policy_blocked" boolean DEFAULT false NOT NULL,
	"policy_reasons" jsonb,
	"fallback_applied" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_queue_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"trigger_reason" text NOT NULL,
	"trigger_metadata" jsonb,
	"diagnostic_event_id" integer NOT NULL,
	"recommendation_id" integer,
	"model_trace_id" integer,
	"confidence" integer DEFAULT 0 NOT NULL,
	"urgency" text DEFAULT 'unknown' NOT NULL,
	"policy_blocked" boolean DEFAULT false NOT NULL,
	"claimed_by_user_id" text,
	"claimed_at" timestamp,
	"resolved_by_user_id" text,
	"resolved_at" timestamp,
	"resolution" text,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_trace" ADD CONSTRAINT "model_trace_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_trace" ADD CONSTRAINT "model_trace_diagnostic_event_id_diagnostic_event_id_fk" FOREIGN KEY ("diagnostic_event_id") REFERENCES "public"."diagnostic_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_trace" ADD CONSTRAINT "model_trace_recommendation_id_recommendation_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_trace" ADD CONSTRAINT "model_trace_model_registry_id_model_registry_id_fk" FOREIGN KEY ("model_registry_id") REFERENCES "public"."model_registry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_trace" ADD CONSTRAINT "model_trace_prompt_template_id_prompt_template_id_fk" FOREIGN KEY ("prompt_template_id") REFERENCES "public"."prompt_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue_item" ADD CONSTRAINT "review_queue_item_diagnostic_event_id_diagnostic_event_id_fk" FOREIGN KEY ("diagnostic_event_id") REFERENCES "public"."diagnostic_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue_item" ADD CONSTRAINT "review_queue_item_recommendation_id_recommendation_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue_item" ADD CONSTRAINT "review_queue_item_model_trace_id_model_trace_id_fk" FOREIGN KEY ("model_trace_id") REFERENCES "public"."model_trace"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue_item" ADD CONSTRAINT "review_queue_item_claimed_by_user_id_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue_item" ADD CONSTRAINT "review_queue_item_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_event_event_key_uq" ON "analytics_event" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "analytics_event_event_name_idx" ON "analytics_event" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "analytics_event_occurred_at_idx" ON "analytics_event" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_event_user_id_idx" ON "analytics_event" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "model_registry_provider_model_version_uq" ON "model_registry" USING btree ("provider","model_id","model_version");--> statement-breakpoint
CREATE INDEX "model_registry_status_idx" ON "model_registry" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_template_key_version_uq" ON "prompt_template" USING btree ("template_key","template_version");--> statement-breakpoint
CREATE INDEX "prompt_template_status_idx" ON "prompt_template" USING btree ("status");--> statement-breakpoint
CREATE INDEX "model_trace_created_at_idx" ON "model_trace" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "model_trace_user_id_idx" ON "model_trace" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "model_trace_request_id_idx" ON "model_trace" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "model_trace_diagnostic_event_id_idx" ON "model_trace" USING btree ("diagnostic_event_id");--> statement-breakpoint
CREATE INDEX "model_trace_recommendation_id_idx" ON "model_trace" USING btree ("recommendation_id");--> statement-breakpoint
CREATE INDEX "review_queue_item_status_idx" ON "review_queue_item" USING btree ("status");--> statement-breakpoint
CREATE INDEX "review_queue_item_created_at_idx" ON "review_queue_item" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "review_queue_item_claimed_by_user_id_idx" ON "review_queue_item" USING btree ("claimed_by_user_id");--> statement-breakpoint
CREATE INDEX "review_queue_item_diagnostic_event_id_idx" ON "review_queue_item" USING btree ("diagnostic_event_id");