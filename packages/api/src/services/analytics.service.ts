import { randomUUID } from "node:crypto";

import { db } from "@car-health-genius/db";
import { analyticsEvent } from "@car-health-genius/db/schema/analyticsEvent";

export const MONETIZATION_EVENTS = {
  PAYWALL_VIEW: "paywall_view",
  UPGRADE_START: "upgrade_start",
  UPGRADE_SUCCESS: "upgrade_success",
  SUBSCRIPTION_CHURN: "subscription_churn",
} as const;

export type MonetizationEventName = (typeof MONETIZATION_EVENTS)[keyof typeof MONETIZATION_EVENTS];

type JsonRecord = Record<string, unknown>;

export type TrackAnalyticsEventInput = {
  eventName: MonetizationEventName;
  userId?: string;
  channel: "web" | "native" | "server";
  source?: string;
  eventKey?: string;
  occurredAt?: Date;
  properties?: JsonRecord;
};

export async function trackAnalyticsEvent(input: TrackAnalyticsEventInput) {
  const eventKey = input.eventKey ?? randomUUID();

  const rows = await db
    .insert(analyticsEvent)
    .values({
      eventName: input.eventName,
      eventKey,
      userId: input.userId,
      channel: input.channel,
      source: input.source,
      properties: input.properties,
      occurredAt: input.occurredAt ?? new Date(),
    })
    .onConflictDoNothing({
      target: analyticsEvent.eventKey,
    })
    .returning({ id: analyticsEvent.id, eventKey: analyticsEvent.eventKey });

  return {
    inserted: rows.length > 0,
    eventKey,
  };
}
