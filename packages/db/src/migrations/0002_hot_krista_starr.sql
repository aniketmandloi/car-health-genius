CREATE TABLE "adapter" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor" text NOT NULL,
	"model" text NOT NULL,
	"slug" text NOT NULL,
	"connection_type" text DEFAULT 'bluetooth' NOT NULL,
	"ios_supported" boolean DEFAULT false NOT NULL,
	"android_supported" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"firmware_notes" text,
	"metadata" jsonb,
	"last_validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_membership" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"partner_id" integer NOT NULL,
	"membership_role" text DEFAULT 'agent' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN "country_code" varchar(2) DEFAULT 'US' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN "state_code" varchar(2);--> statement-breakpoint
ALTER TABLE "partner_membership" ADD CONSTRAINT "partner_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_membership" ADD CONSTRAINT "partner_membership_partner_id_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "adapter_slug_uq" ON "adapter" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "adapter_status_idx" ON "adapter" USING btree ("status");--> statement-breakpoint
CREATE INDEX "adapter_vendor_idx" ON "adapter" USING btree ("vendor");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_membership_user_partner_uq" ON "partner_membership" USING btree ("user_id","partner_id");--> statement-breakpoint
CREATE INDEX "partner_membership_user_id_idx" ON "partner_membership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "partner_membership_partner_id_idx" ON "partner_membership" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "partner_membership_status_idx" ON "partner_membership" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vehicle_country_code_idx" ON "vehicle" USING btree ("country_code");