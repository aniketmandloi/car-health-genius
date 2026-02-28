import { TRPCError } from "@trpc/server";

export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "alternate",
  "rejected",
  "confirmed",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingActor = "customer" | "partner";

const PARTNER_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["accepted", "alternate", "rejected"],
  accepted: [],
  alternate: [],
  rejected: [],
  confirmed: [],
};

const CUSTOMER_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: [],
  accepted: ["confirmed"],
  alternate: ["confirmed"],
  rejected: [],
  confirmed: [],
};

export function isTerminalBookingStatus(status: BookingStatus): boolean {
  return status === "rejected" || status === "confirmed";
}

function allowedTransitionsForActor(
  actor: BookingActor,
): Record<BookingStatus, readonly BookingStatus[]> {
  return actor === "partner" ? PARTNER_TRANSITIONS : CUSTOMER_TRANSITIONS;
}

export function assertBookingTransition(input: {
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  actor: BookingActor;
}) {
  if (input.fromStatus === input.toStatus) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Booking is already in the requested status",
      cause: {
        businessCode: "BOOKING_NOOP_TRANSITION",
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actor: input.actor,
      },
    });
  }

  const allowed = allowedTransitionsForActor(input.actor)[input.fromStatus];
  if (!allowed.includes(input.toStatus)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid booking transition",
      cause: {
        businessCode: "INVALID_BOOKING_STATE_TRANSITION",
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        actor: input.actor,
      },
    });
  }

  return {
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    actor: input.actor,
    isTerminal: isTerminalBookingStatus(input.toStatus),
  };
}

