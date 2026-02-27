CREATE TABLE "billing_webhook_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'polar' NOT NULL,
	"event_type" text NOT NULL,
	"provider_event_key" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dtc_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"dtc_code" varchar(16) NOT NULL,
	"category" text DEFAULT 'powertrain' NOT NULL,
	"default_severity_class" text DEFAULT 'service_soon' NOT NULL,
	"driveability" text DEFAULT 'drivable' NOT NULL,
	"summary_template" text NOT NULL,
	"rationale_template" text,
	"safety_critical" boolean DEFAULT false NOT NULL,
	"diy_allowed" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'internal_seed' NOT NULL,
	"source_version" text DEFAULT 'v1' NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "billing_webhook_event_provider_event_key_uq" ON "billing_webhook_event" USING btree ("provider_event_key");--> statement-breakpoint
CREATE INDEX "billing_webhook_event_provider_event_type_idx" ON "billing_webhook_event" USING btree ("provider","event_type");--> statement-breakpoint
CREATE INDEX "billing_webhook_event_status_idx" ON "billing_webhook_event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_webhook_event_received_at_idx" ON "billing_webhook_event" USING btree ("received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dtc_knowledge_dtc_code_uq" ON "dtc_knowledge" USING btree ("dtc_code");--> statement-breakpoint
CREATE INDEX "dtc_knowledge_default_severity_idx" ON "dtc_knowledge" USING btree ("default_severity_class");--> statement-breakpoint
CREATE INDEX "dtc_knowledge_safety_critical_idx" ON "dtc_knowledge" USING btree ("safety_critical");--> statement-breakpoint
INSERT INTO "dtc_knowledge" ("dtc_code", "category", "default_severity_class", "driveability", "summary_template", "rationale_template", "safety_critical", "diy_allowed", "source", "source_version")
VALUES
	('P0117', 'powertrain', 'service_now', 'do_not_drive', 'Engine coolant temperature sensor indicates dangerously low signal.', 'Cooling system sensor anomalies can indicate overheating risk or wiring fault and should be inspected immediately.', true, false, 'internal_seed', 'v1'),
	('P0171', 'powertrain', 'service_soon', 'limited', 'Fuel system is running too lean on bank 1.', 'A lean mixture can worsen drivability and emissions; service soon to avoid catalyst stress.', false, false, 'internal_seed', 'v1'),
	('P0300', 'powertrain', 'service_soon', 'limited', 'Random or multiple cylinder misfire detected.', 'Persistent misfires can damage the catalytic converter and reduce safe drivability.', false, false, 'internal_seed', 'v1'),
	('P0420', 'powertrain', 'service_soon', 'drivable', 'Catalyst system efficiency is below threshold.', 'Catalyst efficiency faults are often non-immediate but should be diagnosed before further emissions degradation.', false, false, 'internal_seed', 'v1'),
	('U0100', 'network', 'service_now', 'limited', 'Lost communication with ECM/PCM control module.', 'Control-module communication loss can impact core powertrain behavior and should be treated as urgent.', true, false, 'internal_seed', 'v1')
ON CONFLICT ("dtc_code") DO UPDATE SET
	"category" = EXCLUDED."category",
	"default_severity_class" = EXCLUDED."default_severity_class",
	"driveability" = EXCLUDED."driveability",
	"summary_template" = EXCLUDED."summary_template",
	"rationale_template" = EXCLUDED."rationale_template",
	"safety_critical" = EXCLUDED."safety_critical",
	"diy_allowed" = EXCLUDED."diy_allowed",
	"source" = EXCLUDED."source",
	"source_version" = EXCLUDED."source_version";
