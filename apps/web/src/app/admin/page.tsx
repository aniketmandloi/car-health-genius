import AdminDashboardClient from "./admin-dashboard-client";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Monetization funnel, AI model traces, and audit activity.
        </p>
      </div>
      <AdminDashboardClient />
    </div>
  );
}
