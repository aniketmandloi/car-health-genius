CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"change_set" jsonb,
	"request_id" text,
	"correlation_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vehicle_id" integer NOT NULL,
	"diagnostic_event_id" integer,
	"partner_id" integer,
	"issue_summary" text NOT NULL,
	"preferred_window_start" timestamp NOT NULL,
	"preferred_window_end" timestamp NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"partner_response_note" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlement" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"feature_key" text NOT NULL,
	"source" text DEFAULT 'subscription' NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimate" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vehicle_id" integer NOT NULL,
	"diagnostic_event_id" integer,
	"labor_low_cents" integer NOT NULL,
	"labor_high_cents" integer NOT NULL,
	"parts_low_cents" integer NOT NULL,
	"parts_high_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"region" text NOT NULL,
	"assumptions" jsonb,
	"exclusions" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"recommendation_id" integer,
	"diagnostic_event_id" integer,
	"rating" integer NOT NULL,
	"outcome" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"launch_metro" text NOT NULL,
	"state" text,
	"phone" text,
	"website" text,
	"accepts_leads" boolean DEFAULT true NOT NULL,
	"pricing_policy_flags" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vehicle_id" integer NOT NULL,
	"service_type" text NOT NULL,
	"due_mileage" integer,
	"due_date" timestamp,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"last_completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'polar' NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at" timestamp,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_outcome" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vehicle_id" integer NOT NULL,
	"diagnostic_event_id" integer NOT NULL,
	"estimate_id" integer,
	"invoice_amount_cents" integer,
	"outcome_status" text NOT NULL,
	"performed_at" timestamp,
	"shop_name" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_diagnostic_event_id_diagnostic_event_id_fk" FOREIGN KEY ("diagnostic_event_id") REFERENCES "public"."diagnostic_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_partner_id_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_diagnostic_event_id_diagnostic_event_id_fk" FOREIGN KEY ("diagnostic_event_id") REFERENCES "public"."diagnostic_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_recommendation_id_recommendation_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_diagnostic_event_id_diagnostic_event_id_fk" FOREIGN KEY ("diagnostic_event_id") REFERENCES "public"."diagnostic_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance" ADD CONSTRAINT "maintenance_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_outcome" ADD CONSTRAINT "repair_outcome_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_outcome" ADD CONSTRAINT "repair_outcome_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_outcome" ADD CONSTRAINT "repair_outcome_diagnostic_event_id_diagnostic_event_id_fk" FOREIGN KEY ("diagnostic_event_id") REFERENCES "public"."diagnostic_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_outcome" ADD CONSTRAINT "repair_outcome_estimate_id_estimate_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimate"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_actor_user_id_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "booking_user_id_idx" ON "booking" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "booking_vehicle_id_idx" ON "booking" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "booking_partner_id_idx" ON "booking" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "booking_status_idx" ON "booking" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_preferred_window_start_idx" ON "booking" USING btree ("preferred_window_start");--> statement-breakpoint
CREATE UNIQUE INDEX "entitlement_user_feature_key_uq" ON "entitlement" USING btree ("user_id","feature_key");--> statement-breakpoint
CREATE INDEX "entitlement_user_id_idx" ON "entitlement" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entitlement_feature_key_idx" ON "entitlement" USING btree ("feature_key");--> statement-breakpoint
CREATE INDEX "entitlement_expires_at_idx" ON "entitlement" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "estimate_user_id_idx" ON "estimate" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "estimate_vehicle_id_idx" ON "estimate" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "estimate_diagnostic_event_id_idx" ON "estimate" USING btree ("diagnostic_event_id");--> statement-breakpoint
CREATE INDEX "estimate_created_at_idx" ON "estimate" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_recommendation_id_idx" ON "feedback" USING btree ("recommendation_id");--> statement-breakpoint
CREATE INDEX "feedback_diagnostic_event_id_idx" ON "feedback" USING btree ("diagnostic_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_slug_uq" ON "partner" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "partner_launch_metro_idx" ON "partner" USING btree ("launch_metro");--> statement-breakpoint
CREATE INDEX "partner_status_idx" ON "partner" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_user_id_idx" ON "maintenance" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "maintenance_vehicle_id_idx" ON "maintenance" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "maintenance_status_idx" ON "maintenance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_due_date_idx" ON "maintenance" USING btree ("due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_provider_subscription_id_uq" ON "subscription" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_user_id_idx" ON "subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "repair_outcome_user_id_idx" ON "repair_outcome" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "repair_outcome_vehicle_id_idx" ON "repair_outcome" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "repair_outcome_diagnostic_event_id_idx" ON "repair_outcome" USING btree ("diagnostic_event_id");--> statement-breakpoint
CREATE INDEX "repair_outcome_outcome_status_idx" ON "repair_outcome" USING btree ("outcome_status");