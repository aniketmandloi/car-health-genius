import WebhooksClient from "./webhooks-client";

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing Webhook Events</h1>
        <p className="text-sm text-muted-foreground">
          Inspect incoming billing webhook payloads and their processing status.
        </p>
      </div>
      <WebhooksClient />
    </div>
  );
}
