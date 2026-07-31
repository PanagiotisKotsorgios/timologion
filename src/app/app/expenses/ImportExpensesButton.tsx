"use client";

import {
  CsvImportButton,
  type CsvColumnSpec,
} from "@/components/ui/CsvImportDialog";
import { importExpensesCsvAction } from "./actions";

const COLUMNS: CsvColumnSpec[] = [
  {
    header: "issueDate",
    aliases: ["Ημερομηνία"],
    required: true,
    hint: "YYYY-MM-DD ή DD/MM/YYYY",
  },
  {
    header: "netAmount",
    aliases: ["Καθαρή αξία"],
    required: true,
    hint: "Καθαρή αξία (χωρίς ΦΠΑ) σε ευρώ. Δέχεται κόμμα (12,50).",
  },
  {
    header: "vatRate",
    aliases: ["ΦΠΑ %"],
    hint: "Συντελεστής ΦΠΑ (0, 6, 13, 24). Προεπιλογή: 24.",
  },
  {
    header: "supplierVat",
    aliases: ["ΑΦΜ προμηθευτή"],
    hint: "Αν βρεθεί υπάρχων προμηθευτής με αυτό το ΑΦΜ, συνδέεται μαζί του",
  },
  {
    header: "supplierName",
    aliases: ["Προμηθευτής"],
    hint: "Αν ο ΑΦΜ είναι νέος + έχεις όνομα εδώ, δημιουργείται αυτόματα προμηθευτής",
  },
  {
    header: "reference",
    aliases: ["Αρ. παραστατικού"],
    hint: "Π.χ. «ΤΠΥ 000123»",
  },
  {
    header: "category",
    aliases: ["Κατηγορία"],
    hint: "Ενοίκιο, Καύσιμα, κ.λπ.",
  },
  {
    header: "myDataType",
    aliases: ["Κωδικός myDATA"],
    hint: "expense_wholesale, purchase_eu_acquisition, payroll κ.λπ. (δες πλατφόρμα για πλήρη λίστα)",
  },
  { header: "description", aliases: ["Περιγραφή"] },
  { header: "notes", aliases: ["Σημειώσεις"] },
];

export function ImportExpensesButton() {
  return (
    <CsvImportButton
      entityLabel="εξόδων"
      templateFilename="timologion-expenses-template.csv"
      columns={COLUMNS}
      action={importExpensesCsvAction}
    />
  );
}
