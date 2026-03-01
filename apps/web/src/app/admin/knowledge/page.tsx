import DtcKnowledgeClient from "./dtc-knowledge-client";

export default function DtcKnowledgePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">DTC Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">
          Create and update diagnostic trouble code definitions, severity, and
          DIY permissions.
        </p>
      </div>
      <DtcKnowledgeClient />
    </div>
  );
}
