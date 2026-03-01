import AdaptersClient from "./adapters-client";

export default function AdaptersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Adapter Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Manage supported OBD adapters — create, update, and archive entries.
        </p>
      </div>
      <AdaptersClient />
    </div>
  );
}
