# Data Dictionary (Sprint 1)

## `vehicle`

- `id` (serial, PK)
- `user_id` (text, FK -> `user.id`)
- `vin` (varchar(17), nullable)
- `make` (text, required)
- `model` (text, required)
- `model_year` (integer, required)
- `engine` (text, nullable)
- `mileage` (integer, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `vehicle_user_id_idx` on `user_id`
- `vehicle_user_vin_uq` unique on (`user_id`, `vin`)

## `diagnostic_event`

- `id` (serial, PK)
- `vehicle_id` (integer, FK -> `vehicle.id`)
- `source` (text, default `obd_scan`)
- `dtc_code` (varchar(16), required)
- `severity` (text, default `unknown`)
- `freeze_frame` (jsonb, nullable)
- `sensor_snapshot` (jsonb, nullable)
- `occurred_at` (timestamp)
- `created_at` (timestamp)

Indexes:

- `diagnostic_event_vehicle_id_idx` on `vehicle_id`
- `diagnostic_event_dtc_code_idx` on `dtc_code`

## `recommendation`

- `id` (serial, PK)
- `diagnostic_event_id` (integer, FK -> `diagnostic_event.id`)
- `recommendation_type` (text, required)
- `urgency` (text, required)
- `confidence` (integer, default `0`)
- `title` (text, required)
- `details` (jsonb, nullable)
- `is_active` (boolean, default `true`)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `recommendation_diagnostic_event_id_idx` on `diagnostic_event_id`

## `estimate`

- `id` (serial, PK)
- `user_id` (text, FK -> `user.id`)
- `vehicle_id` (integer, FK -> `vehicle.id`)
- `diagnostic_event_id` (integer, FK -> `diagnostic_event.id`, nullable)
- `labor_low_cents` (integer, required)
- `labor_high_cents` (integer, required)
- `parts_low_cents` (integer, required)
- `parts_high_cents` (integer, required)
- `currency` (varchar(3), default `USD`)
- `region` (text, required)
- `assumptions` (jsonb, nullable)
- `exclusions` (jsonb, nullable)
- `is_active` (boolean, default `true`)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `estimate_user_id_idx` on `user_id`
- `estimate_vehicle_id_idx` on `vehicle_id`
- `estimate_diagnostic_event_id_idx` on `diagnostic_event_id`
- `estimate_created_at_idx` on `created_at`

## `partner`

- `id` (serial, PK)
- `display_name` (text, required)
- `slug` (text, unique)
- `status` (text, default `active`)
- `launch_metro` (text, required)
- `state` (text, nullable)
- `phone` (text, nullable)
- `website` (text, nullable)
- `accepts_leads` (boolean, default `true`)
- `pricing_policy_flags` (jsonb, nullable)
- `metadata` (jsonb, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `partner_slug_uq` unique on `slug`
- `partner_launch_metro_idx` on `launch_metro`
- `partner_status_idx` on `status`

## `booking`

- `id` (serial, PK)
- `user_id` (text, FK -> `user.id`)
- `vehicle_id` (integer, FK -> `vehicle.id`)
- `diagnostic_event_id` (integer, FK -> `diagnostic_event.id`, nullable)
- `partner_id` (integer, FK -> `partner.id`, nullable)
- `issue_summary` (text, required)
- `preferred_window_start` (timestamp, required)
- `preferred_window_end` (timestamp, required)
- `status` (text, default `requested`)
- `partner_response_note` (text, nullable)
- `requested_at` (timestamp)
- `resolved_at` (timestamp, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `booking_user_id_idx` on `user_id`
- `booking_vehicle_id_idx` on `vehicle_id`
- `booking_partner_id_idx` on `partner_id`
- `booking_status_idx` on `status`
- `booking_preferred_window_start_idx` on `preferred_window_start`

## `maintenance`

- `id` (serial, PK)
- `user_id` (text, FK -> `user.id`)
- `vehicle_id` (integer, FK -> `vehicle.id`)
- `service_type` (text, required)
- `due_mileage` (integer, nullable)
- `due_date` (timestamp, nullable)
- `status` (text, default `scheduled`)
- `last_completed_at` (timestamp, nullable)
- `notes` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `maintenance_user_id_idx` on `user_id`
- `maintenance_vehicle_id_idx` on `vehicle_id`
- `maintenance_status_idx` on `status`
- `maintenance_due_date_idx` on `due_date`

## `subscription`

- `id` (serial, PK)
- `user_id` (text, FK -> `user.id`)
- `provider` (text, default `polar`)
- `provider_subscription_id` (text, unique)
- `plan` (text, default `free`)
- `status` (text, default `inactive`)
- `current_period_start` (timestamp, nullable)
- `current_period_end` (timestamp, nullable)
- `cancel_at` (timestamp, nullable)
- `canceled_at` (timestamp, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `subscription_provider_subscription_id_uq` unique on `provider_subscription_id`
- `subscription_user_id_idx` on `user_id`
- `subscription_status_idx` on `status`

## `entitlement`

- `id` (serial, PK)
- `user_id` (text, FK -> `user.id`)
- `feature_key` (text, required)
- `source` (text, default `subscription`)
- `is_enabled` (boolean, default `false`)
- `granted_at` (timestamp)
- `expires_at` (timestamp, nullable)
- `metadata` (jsonb, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `entitlement_user_feature_key_uq` unique on (`user_id`, `feature_key`)
- `entitlement_user_id_idx` on `user_id`
- `entitlement_feature_key_idx` on `feature_key`
- `entitlement_expires_at_idx` on `expires_at`

## `feedback`

- `id` (serial, PK)
- `user_id` (text, FK -> `user.id`)
- `recommendation_id` (integer, FK -> `recommendation.id`, nullable)
- `diagnostic_event_id` (integer, FK -> `diagnostic_event.id`, nullable)
- `rating` (integer, required)
- `outcome` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamp)

Indexes:

- `feedback_user_id_idx` on `user_id`
- `feedback_recommendation_id_idx` on `recommendation_id`
- `feedback_diagnostic_event_id_idx` on `diagnostic_event_id`

## `repair_outcome`

- `id` (serial, PK)
- `user_id` (text, FK -> `user.id`)
- `vehicle_id` (integer, FK -> `vehicle.id`)
- `diagnostic_event_id` (integer, FK -> `diagnostic_event.id`)
- `estimate_id` (integer, FK -> `estimate.id`, nullable)
- `invoice_amount_cents` (integer, nullable)
- `outcome_status` (text, required)
- `performed_at` (timestamp, nullable)
- `shop_name` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `repair_outcome_user_id_idx` on `user_id`
- `repair_outcome_vehicle_id_idx` on `vehicle_id`
- `repair_outcome_diagnostic_event_id_idx` on `diagnostic_event_id`
- `repair_outcome_outcome_status_idx` on `outcome_status`

## `audit_log`

- `id` (serial, PK)
- `actor_user_id` (text, FK -> `user.id`, nullable)
- `actor_role` (text, required)
- `action` (text, required)
- `target_type` (text, required)
- `target_id` (text, required)
- `change_set` (jsonb, nullable)
- `request_id` (text, nullable)
- `correlation_id` (text, nullable)
- `created_at` (timestamp)

Indexes:

- `audit_log_actor_user_id_idx` on `actor_user_id`
- `audit_log_target_idx` on (`target_type`, `target_id`)
- `audit_log_created_at_idx` on `created_at`

## Sprint 2 Additions

### `user` (auth extension)

- `role` (text, required, default `user`)
- `banned` (boolean, required, default `false`)
- `ban_reason` (text, nullable)
- `ban_expires` (timestamp, nullable)

### `session` (auth extension)

- `impersonated_by` (text, nullable)

### `vehicle` (new fields)

- `country_code` (varchar(2), required, default `US`)
- `state_code` (varchar(2), nullable)

Additional index:

- `vehicle_country_code_idx` on `country_code`

### `adapter`

- `id` (serial, PK)
- `vendor` (text, required)
- `model` (text, required)
- `slug` (text, required, unique)
- `connection_type` (text, required, default `bluetooth`)
- `ios_supported` (boolean, required, default `false`)
- `android_supported` (boolean, required, default `false`)
- `status` (text, required, default `active`)
- `firmware_notes` (text, nullable)
- `metadata` (jsonb, nullable)
- `last_validated_at` (timestamp, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `adapter_slug_uq` unique on `slug`
- `adapter_status_idx` on `status`
- `adapter_vendor_idx` on `vendor`

### `partner_membership`

- `id` (serial, PK)
- `user_id` (text, FK -> `user.id`)
- `partner_id` (integer, FK -> `partner.id`)
- `membership_role` (text, required, default `agent`)
- `status` (text, required, default `active`)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Indexes:

- `partner_membership_user_partner_uq` unique on (`user_id`, `partner_id`)
- `partner_membership_user_id_idx` on `user_id`
- `partner_membership_partner_id_idx` on `partner_id`
- `partner_membership_status_idx` on `status`
