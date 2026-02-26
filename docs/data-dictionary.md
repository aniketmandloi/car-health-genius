# Data Dictionary (Sprint 0 - E1-S1 Start)

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
