"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button
      type="button"
      icon={Printer}
      size="sm"
      onClick={() => window.print()}
    >
      Εκτύπωση
    </Button>
  );
}
