/**
 * Wrapp / myDATA return validation errors as English strings crafted for
 * developers ("Vat category must have value 7 for this invoice type",
 * "Classification type E3_561_002 is forbidden for..."). These are
 * meaningless — and slightly scary — to accountants and shop owners.
 *
 * This module translates the most common validator responses into plain
 * Greek that names what the user needs to change on their draft. When we
 * see a message we don't recognize we leave it alone (better an ugly
 * English string than an incorrect Greek paraphrase).
 *
 * The rule set is data-driven: `[pattern, greek]` pairs, checked in order.
 * Patterns are case-insensitive substrings; the first match wins per
 * segment (Wrapp joins multiple errors with ";" — we translate each).
 */

type Rule = { match: RegExp; el: string };

const RULES: Rule[] = [
  // ── VAT category / amount mismatches ───────────────────────────────
  {
    match: /vat category must have value 7 for this invoice type/i,
    el: "Ο τύπος αυτού του παραστατικού απαιτεί κατηγορία ΦΠΑ «Χωρίς ΦΠΑ» (κατ. 7). Άφησε το ποσοστό ΦΠΑ στο 0% σε όλες τις γραμμές.",
  },
  {
    match: /vat amount must have value 0 for this invoice type/i,
    el: "Για αυτόν τον τύπο παραστατικού το ποσό ΦΠΑ πρέπει να είναι 0€. Επεξεργάσου τις γραμμές ώστε να μην έχουν ΦΠΑ.",
  },
  {
    match:
      /vatamount is not correct according to the given[:\s]*vatcategory/i,
    el: "Το ποσό ΦΠΑ δεν ταιριάζει με την κατηγορία ΦΠΑ της γραμμής. Έλεγξε τα ποσοστά ΦΠΑ (0/6/13/24) και ξαναπροσπάθησε.",
  },

  // ── Counterpart / country ──────────────────────────────────────────
  {
    match:
      /counterpart's? country for this invoice type must be in europe but not greece/i,
    el: "Ο πελάτης πρέπει να ανήκει σε χώρα της Ε.Ε. εκτός Ελλάδας (ενδοκοινοτική συναλλαγή). Άνοιξε την καρτέλα του πελάτη και όρισε ισχύον κωδικό χώρας Ε.Ε. (π.χ. DE, IT, FR).",
  },
  {
    match: /counterpart's? country for this invoice type must not be in europe/i,
    el: "Ο πελάτης πρέπει να ανήκει σε χώρα εκτός Ε.Ε. (τρίτη χώρα). Ενημέρωσε τη χώρα του πελάτη πριν την έκδοση.",
  },
  {
    match: /counterpart.*must not be null|counterpart is required/i,
    el: "Δεν έχεις επιλέξει πελάτη — αυτός ο τύπος παραστατικού απαιτεί συγκεκριμένο πελάτη (όχι ανώνυμος καταναλωτής).",
  },
  {
    match: /counterpart.*country.*must be greece|counterpart.*country.*= *gr/i,
    el: "Ο πελάτης πρέπει να είναι Έλληνας (κωδικός χώρας GR) για αυτόν τον τύπο παραστατικού.",
  },
  {
    match: /account δεν πρέπει να είναι κενό|account.*must not be empty/i,
    el: "Λείπει το ΑΦΜ ή η επωνυμία του πελάτη. Άνοιξε την καρτέλα και συμπλήρωσέ τα.",
  },

  // ── Classification mismatches ─────────────────────────────────────
  {
    match:
      /classification type (\S+) is forbidden for classification category (\S+) combined with invoice type (\S+)/i,
    el: "Ο συνδυασμός κατηγορίας/τύπου εσόδου δεν είναι έγκυρος για αυτόν τον τύπο παραστατικού (myDATA). Ενημέρωσε τη ρύθμιση κατηγοριοποίησης της γραμμής ή στείλε το ID του παραστατικού στην υποστήριξη ώστε να διορθώσουμε τη χαρτογράφηση.",
  },
  {
    match:
      /could not load.*valid validation doc for classification with category (\S+) and type (\S+)/i,
    el: "Ο τύπος παραστατικού δεν επιτρέπει την τρέχουσα κατηγοριοποίηση εσόδου (myDATA). Στείλε το ID του παραστατικού στην υποστήριξη — χρειάζεται μικρή αλλαγή στη χαρτογράφηση.",
  },
  {
    match:
      /incomeclassification is forbidden for invoice detail/i,
    el: "Ο τύπος παραστατικού δεν επιτρέπει κατηγοριοποίηση εσόδου στις γραμμές. Στείλε το ID στην υποστήριξη — θα αφαιρέσουμε τη γραμμή κατηγοριοποίησης.",
  },
  {
    match:
      /classification with type (\S+) and category (\S+) not found in invoice summary/i,
    el: "Λείπει η συνολική κατηγοριοποίηση εσόδου του παραστατικού. Στείλε το ID στην υποστήριξη ώστε να προστεθεί.",
  },

  // ── Επιπλέον φόροι ─────────────────────────────────────────────────
  {
    match: /othertaxespercentcategory is mandatory for this invoice type/i,
    el: "Αυτός ο τύπος παραστατικού απαιτεί καταχώρηση Επιπλέον Φόρου (π.χ. φόρος διαμονής). Πρόσθεσε γραμμή στο πεδίο «Επιπλέον φόροι» με σωστή κατηγορία και ποσό.",
  },
  {
    match: /othertaxesamount cannot exist.*must be null.*othertaxespercentcategory is null/i,
    el: "Έχεις βάλει ποσό «Επιπλέον φόρου» χωρίς να επιλέξεις κατηγορία. Είτε επίλεξε κατηγορία, είτε αφαίρεσε το ποσό.",
  },
  {
    match: /the sum of gross values of the invoice lines doesn't match/i,
    el: "Τα σύνολα των γραμμών δεν συμφωνούν με το συνολικό μεικτό ποσό του παραστατικού. Αν έχεις προσθέσει «Επιπλέον φόρους», ελέγξε ότι τα ποσά ταιριάζουν.",
  },
  {
    match: /the sum of vat amount of the invoice lines doesn't match/i,
    el: "Τα σύνολα ΦΠΑ των γραμμών δεν συμφωνούν με το συνολικό ΦΠΑ του παραστατικού. Άνοιξε το πρόχειρο και έλεγξε τα ποσά ΦΠΑ.",
  },

  // ── Δελτίο αποστολής ──────────────────────────────────────────────
  {
    match:
      /delivery detail dispatch time must be greater than or equal to invoice issue time/i,
    el: "Η ώρα αποστολής του δελτίου πρέπει να είναι ίση ή μεταγενέστερη από την ώρα έκδοσης του παραστατικού. Άνοιξε την επεξεργασία και πρόσθεσε ώρα αποστολής μετά την ώρα έκδοσης.",
  },
  {
    match: /vehicle number.*required|vehicle number.*must not be empty/i,
    el: "Λείπει ο αριθμός κυκλοφορίας οχήματος στο δελτίο αποστολής.",
  },
  {
    match: /destination address.*required/i,
    el: "Λείπει η διεύθυνση παράδοσης στο δελτίο αποστολής.",
  },

  // ── Correlated / MARK ─────────────────────────────────────────────
  {
    match: /correlated invoices.*required|missing mark|mark.*required/i,
    el: "Λείπει το MARK του γονικού παραστατικού. Επίλεξε το γονικό στο πεδίο «Συσχετιζόμενο παραστατικό» ή δώσε το MARK χειροκίνητα.",
  },

  // ── Foreign currency ──────────────────────────────────────────────
  {
    match: /currency.*required|currency.*must not be null/i,
    el: "Για συναλλαγές εκτός Ελλάδας απαιτείται 3-ψήφιος κωδικός νομίσματος (π.χ. EUR, USD).",
  },
  {
    match: /exchange rate.*required|exchange rate.*must be greater than 0/i,
    el: "Για συναλλαγές σε ξένο νόμισμα απαιτείται θετική ισοτιμία.",
  },

  // ── Σειρά / αρίθμηση ──────────────────────────────────────────────
  {
    match: /billing book.*not found|invalid billing book/i,
    el: "Η σειρά παραστατικών δεν αναγνωρίζεται από την Wrapp. Άνοιξε τη σειρά στις ρυθμίσεις και πάτησε συγχρονισμό.",
  },
  {
    match: /invoice number.*already used|duplicate invoice number/i,
    el: "Ο αριθμός παραστατικού έχει ήδη χρησιμοποιηθεί σε αυτή τη σειρά. Πρόσθεσε νέα σειρά ή άφησε αυτόματη αρίθμηση.",
  },

  // ── Γενικά ────────────────────────────────────────────────────────
  {
    match: /invoice.*already issued|invoice already exists/i,
    el: "Το παραστατικό έχει ήδη εκδοθεί στην ΑΑΔΕ. Ανανέωσε τη σελίδα για να δεις το MARK.",
  },

  // ── Settlement (17.x) — «καλυπτόμενο» κείμενο ώστε ο χρήστης να
  //    καταλαβαίνει ότι δεν είναι δικό του λάθος, είναι δομικός περιορισμός.
  {
    match: /measurementunit per line is forbidden for this invoice type/i,
    el: "Αυτός ο τύπος παραστατικού (τακτοποίηση/μισθοδοσία/αποσβέσεις) δεν δέχεται μονάδα μέτρησης στις γραμμές. Χρειάζεται ειδική διαβίβαση από λογιστική εφαρμογή ή από το portal της ΑΑΔΕ.",
  },
  {
    match: /quantity per line is forbidden for this invoice type/i,
    el: "Αυτός ο τύπος παραστατικού (τακτοποίηση/μισθοδοσία/αποσβέσεις) δεν δέχεται ποσότητα στις γραμμές. Χρειάζεται ειδική διαβίβαση από λογιστική εφαρμογή ή από το portal της ΑΑΔΕ.",
  },
  {
    match: /payment methods is forbidden for this invoice type/i,
    el: "Αυτός ο τύπος παραστατικού δεν δέχεται τρόπο πληρωμής. Δοκίμασε ξανά μετά την επόμενη ενημέρωση.",
  },
  {
    match: /vat category must have value 8 for this invoice type/i,
    el: "Ο τύπος αυτού του παραστατικού απαιτεί ΦΠΑ κατηγορίας «Απαλλασσόμενα» (κατ. 8). Άφησε το ποσοστό ΦΠΑ στο 0% σε όλες τις γραμμές.",
  },
  {
    match:
      /when vatcategory has value 7, element vatexemptioncategory is mandatory/i,
    el: "Ο τύπος αυτού του παραστατικού απαιτεί λόγο απαλλαγής ΦΠΑ. Άνοιξε το πρόχειρο και βεβαιώσου ότι έχεις επιλέξει σωστή χώρα πελάτη (Ε.Ε./τρίτης) — ο κωδικός απαλλαγής προστίθεται αυτόματα.",
  },
  {
    match:
      /expensesclassification is mandatory for invoice detail|incomeclassification is forbidden for invoice detail/i,
    el: "Αυτός ο τύπος παραστατικού απαιτεί ταξινόμηση εξόδων (όχι εσόδων). Οι εγγραφές τακτοποίησης 17.x διαβιβάζονται μόνο από λογιστική εφαρμογή ή από το portal της ΑΑΔΕ.",
  },
];

/**
 * Translate a Wrapp / myDATA error message to plain Greek.
 * Splits on ";" (Wrapp's own separator) so multi-error responses are
 * translated segment-by-segment. Unrecognized segments are kept as-is,
 * but the entire message gets a Greek prefix so at least it reads like
 * an app error and not a raw API dump.
 */
export function translateWrappError(raw: string | null | undefined): string {
  if (!raw) return "Άγνωστο σφάλμα κατά τη διαβίβαση.";
  const cleaned = raw.trim();
  if (!cleaned) return "Άγνωστο σφάλμα κατά τη διαβίβαση.";

  const segments = cleaned.split(/\s*;\s*/).filter(Boolean);
  const translated = segments.map((seg) => {
    for (const rule of RULES) {
      if (rule.match.test(seg)) return rule.el;
    }
    return seg;
  });

  const unique = Array.from(new Set(translated));
  if (unique.length === 1) return unique[0] ?? cleaned;
  return unique.map((t, i) => `${i + 1}) ${t}`).join(" ");
}
