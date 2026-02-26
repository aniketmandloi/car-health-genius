# Adapter QA Matrix (Sprint 2 Seed)

Date: February 26, 2026

## Scope

This matrix seeds `FR-003` validation for Sprint 3 hardware work.

## Test Scenarios

1. Pairing and connection success.
2. DTC read with freeze-frame capture.
3. DTC clear flow with explicit warning acknowledgment.
4. Reconnect after app restart.
5. Offline retry and failure recovery behavior.

## Platform Coverage

| Adapter Slug | iOS Pairing | iOS Read | iOS Clear | Android Pairing | Android Read | Android Clear | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pending-v1` | Pending | Pending | Pending | Pending | Pending | Pending | Populate from launch-compatible list |

## Environment Prerequisites

1. Use Expo development client (not Expo Go) for BLE integrations.
2. Validate against latest OS major + one previous major for iOS and Android.
3. Capture firmware version and app build number with each run.
