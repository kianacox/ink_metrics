import { AppChrome } from "@/components/shared/app-chrome";
import { AppQueryClientProvider } from "@/components/providers/query-client-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppQueryClientProvider>
      <AppChrome>{children}</AppChrome>
    </AppQueryClientProvider>
  );
}
