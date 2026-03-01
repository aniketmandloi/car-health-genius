import ReviewQueueClient from "./review-queue-client";

export default function ReviewQueuePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Review Queue</h1>
        <p className="text-sm text-muted-foreground">
          Review flagged AI recommendations that require human validation before
          serving to users.
        </p>
      </div>
      <ReviewQueueClient />
    </div>
  );
}
