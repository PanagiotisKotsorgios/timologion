import type { ReactNode } from "react";
import { PluginGate } from "@/components/layout/PluginGate";

export default function CrmLayout({ children }: { children: ReactNode }) {
  return <PluginGate code="crm">{children}</PluginGate>;
}
