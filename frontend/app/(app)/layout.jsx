import { AppShell } from "@/components/app/AppShell";

export default function AuthenticatedLayout({ children }) {
  return <AppShell fullBleed>{children}</AppShell>;
}
