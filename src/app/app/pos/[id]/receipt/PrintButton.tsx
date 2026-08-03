"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * "Εκτύπωση" for an issued receipt = open the official Wrapp thermal
 * PDF in a new tab and let the browser's built-in viewer handle print.
 * Never call window.print() on our own page — we render a visual echo,
 * not the compliance-relevant document. Wrapp's PDF is the receipt.
 */
export function PrintButton({ thermalPdfUrl }: { thermalPdfUrl: string }) {
  return (
    <Button
      type="button"
      icon={Printer}
      size="sm"
      onClick={() => window.open(thermalPdfUrl, "_blank", "noopener")}
    >
      Εκτύπωση
    </Button>
  );
}
