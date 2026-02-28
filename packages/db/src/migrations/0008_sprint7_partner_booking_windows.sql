ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "alternate_window_start" timestamp;
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "alternate_window_end" timestamp;
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "partner_responded_at" timestamp;
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_partner_responded_at_idx" ON "booking" USING btree ("partner_responded_at");
