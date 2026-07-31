"use client";

import {
  CsvImportButton,
  type CsvColumnSpec,
} from "@/components/ui/CsvImportDialog";
import { importItemsCsvAction } from "./actions";

const COLUMNS: CsvColumnSpec[] = [
  {
    header: "name",
    aliases: ["Ονομασία", "Περιγραφή"],
    required: true,
    hint: "Ονομασία είδους/υπηρεσίας όπως θέλεις να εμφανίζεται στα παραστατικά",
  },
  {
    header: "code",
    aliases: ["Κωδικός"],
    hint: "Εσωτερικός κωδικός (SKU). Αν υπάρχει, ενημερώνεται το υπάρχον είδος αντί να δημιουργηθεί νέο.",
  },
  {
    header: "kind",
    aliases: ["Τύπος"],
    hint: "service (υπηρεσία) ή product (προϊόν). Προεπιλογή: service.",
  },
  {
    header: "unit",
    aliases: ["Μονάδα"],
    hint: "τμχ, κιλά, ώρες κ.λπ. Προεπιλογή: τμχ.",
  },
  {
    header: "defaultPrice",
    aliases: ["Τιμή", "price"],
    hint: "Προτεινόμενη τιμή μονάδας ΧΩΡΙΣ ΦΠΑ",
  },
  {
    header: "vatRate",
    aliases: ["ΦΠΑ %", "vat"],
    hint: "Συντελεστής ΦΠΑ (0, 6, 13, 24). Προεπιλογή: 24.",
  },
  {
    header: "description",
    aliases: ["Σχόλια"],
  },
];

export function ImportButton() {
  return (
    <CsvImportButton
      entityLabel="ειδών / υπηρεσιών"
      templateFilename="timologion-items-template.csv"
      columns={COLUMNS}
      action={importItemsCsvAction}
    />
  );
}
