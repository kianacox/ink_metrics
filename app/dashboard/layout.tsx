import { AppChrome } from "@/components/shared/app-chrome";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppChrome>{children}</AppChrome>;
}
