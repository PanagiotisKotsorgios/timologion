import type { ReactNode } from "react";
import { PluginGate } from "@/components/layout/PluginGate";

export default function PosLayout({ children }: { children: ReactNode }) {
  return <PluginGate code="pos">{children}</PluginGate>;
}
