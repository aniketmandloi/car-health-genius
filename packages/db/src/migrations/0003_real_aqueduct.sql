CREATE TABLE "obd_session" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_key" text NOT NULL,
	"user_id" text NOT NULL,
	"vehicle_id" integer NOT NULL,
	"adapter_id" integer,
	"adapter_slug" text,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vehicle_id" integer NOT NULL,
	"obd_session_id" integer,
	"event_type" text NOT NULL,
	"event_ref_id" integer,
	"source" text DEFAULT 'system' NOT NULL,
	"payload" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recall_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"cache_key" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"model_year" integer NOT NULL,
	"source" text DEFAULT 'nhtsa_recalls' NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"payload" jsonb NOT NULL,
	"retrieved_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diagnostic_event" ADD COLUMN "obd_session_id" integer;--> statement-breakpoint
ALTER TABLE "diagnostic_event" ADD COLUMN "ingest_idempotency_key" varchar(80);--> statement-breakpoint
ALTER TABLE "diagnostic_event" ADD COLUMN "captured_at" timestamp;--> statement-breakpoint
ALTER TABLE "diagnostic_event" ADD COLUMN "ingested_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "obd_session" ADD CONSTRAINT "obd_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obd_session" ADD CONSTRAINT "obd_session_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obd_session" ADD CONSTRAINT "obd_session_adapter_id_adapter_id_fk" FOREIGN KEY ("adapter_id") REFERENCES "public"."adapter"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_event" ADD CONSTRAINT "timeline_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_event" ADD CONSTRAINT "timeline_event_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_event" ADD CONSTRAINT "timeline_event_obd_session_id_obd_session_id_fk" FOREIGN KEY ("obd_session_id") REFERENCES "public"."obd_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "obd_session_session_key_uq" ON "obd_session" USING btree ("session_key");--> statement-breakpoint
CREATE INDEX "obd_session_user_id_idx" ON "obd_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "obd_session_vehicle_id_idx" ON "obd_session" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "obd_session_status_idx" ON "obd_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "obd_session_started_at_idx" ON "obd_session" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "timeline_event_user_id_idx" ON "timeline_event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "timeline_event_vehicle_id_idx" ON "timeline_event" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "timeline_event_obd_session_id_idx" ON "timeline_event" USING btree ("obd_session_id");--> statement-breakpoint
CREATE INDEX "timeline_event_event_type_idx" ON "timeline_event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "timeline_event_occurred_at_idx" ON "timeline_event" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recall_snapshot_cache_key_uq" ON "recall_snapshot" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "recall_snapshot_lookup_idx" ON "recall_snapshot" USING btree ("make","model","model_year");--> statement-breakpoint
CREATE INDEX "recall_snapshot_expires_at_idx" ON "recall_snapshot" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "diagnostic_event" ADD CONSTRAINT "diagnostic_event_obd_session_id_obd_session_id_fk" FOREIGN KEY ("obd_session_id") REFERENCES "public"."obd_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagnostic_event_obd_session_id_idx" ON "diagnostic_event" USING btree ("obd_session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diagnostic_event_ingest_idempotency_key_uq" ON "diagnostic_event" USING btree ("ingest_idempotency_key");