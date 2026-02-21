import { useNotificationApi } from "@/hooks/useNotificationApi";
import { Button } from "@/components/ui/button";

export function NotificationSeeder() {
  const { seedNotifications, loading } = useNotificationApi();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={seedNotifications}
        disabled={loading}
        variant="outline"
        className="bg-white/80 backdrop-blur shadow-lg border-yellow-400 text-yellow-600 hover:bg-yellow-50"
      >
        {loading ? "Seeding..." : "⚡ Seed Notifications"}
      </Button>
    </div>
  );
}
