import type { ReactNode } from "react";
import { PluginGate } from "@/components/layout/PluginGate";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <PluginGate code="reports">{children}</PluginGate>;
}
