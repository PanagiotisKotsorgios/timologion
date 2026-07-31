"use client";

import {
  CsvImportButton,
  type CsvColumnSpec,
} from "@/components/ui/CsvImportDialog";
import { importClientsCsvAction } from "./actions";

const COLUMNS: CsvColumnSpec[] = [
  {
    header: "legalName",
    aliases: ["Επωνυμία", "Νόμιμη επωνυμία"],
    required: true,
    hint: "Επίσημη επωνυμία επιχείρησης ή ονοματεπώνυμο ιδιώτη",
  },
  { header: "vatNumber", aliases: ["ΑΦΜ"], hint: "9-ψήφιος ΑΦΜ" },
  { header: "tradeName", aliases: ["Διακριτικός τίτλος"] },
  { header: "taxOffice", aliases: ["ΔΟΥ"] },
  { header: "activity", aliases: ["Δραστηριότητα"] },
  { header: "addressLine", aliases: ["Διεύθυνση"] },
  { header: "city", aliases: ["Πόλη"] },
  { header: "postalCode", aliases: ["Τ.Κ."] },
  { header: "country", hint: "2-γράμματος κωδικός (GR, CY, DE...). Προεπιλογή: GR" },
  { header: "email" },
  { header: "phone", aliases: ["Τηλέφωνο"] },
  { header: "notes", aliases: ["Σημειώσεις"] },
];

export function ImportClientsButton() {
  return (
    <CsvImportButton
      entityLabel="πελατών"
      templateFilename="timologion-clients-template.csv"
      columns={COLUMNS}
      action={importClientsCsvAction}
    />
  );
}
