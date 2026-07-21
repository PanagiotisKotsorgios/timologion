import "server-only";

const BRAND_NAVY = "#0f1f39";
const CANVAS_BG = "#f6f7fb";

function shell(body: string): string {
  return `<!doctype html>
<html lang="el">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:${CANVAS_BG};font-family:'Manrope',-apple-system,'Segoe UI',Arial,sans-serif;color:${BRAND_NAVY};">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">
<div style="background:#fff;border-radius:24px;padding:36px 28px;border:1px solid rgba(15,31,57,0.08);">
${body}
</div>
<p style="margin:24px 0 0;font-size:12px;color:#64748b;text-align:center;">
© ${new Date().getFullYear()} timologion. Το email αυτό απεστάλη επειδή έγινε αίτημα ή ενέργεια στον λογαριασμό σου.
</p>
</div>
</body>
</html>`;
}

export function passwordResetTemplate({
  name,
  url,
  ipAddress,
}: {
  name: string;
  url: string;
  ipAddress?: string | null;
}) {
  const subject = "Επαναφορά κωδικού · timologion";
  const html = shell(`
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${BRAND_NAVY};opacity:.6;">Ασφάλεια λογαριασμού</p>
    <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;letter-spacing:-.02em;color:${BRAND_NAVY};">Επαναφορά κωδικού</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Γεια σου ${escapeHtml(name || "")},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Λάβαμε αίτημα επαναφοράς κωδικού για τον λογαριασμό σου. Πάτησε το κουμπί παρακάτω για να ορίσεις νέο κωδικό.</p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${url}" style="display:inline-block;background:${BRAND_NAVY};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">Επαναφορά κωδικού</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#475569;">Αν το κουμπί δεν λειτουργεί, αντίγραψε τον σύνδεσμο:</p>
    <p style="margin:0 0 16px;word-break:break-all;font-size:12px;color:#475569;"><a href="${url}" style="color:${BRAND_NAVY};">${url}</a></p>
    <p style="margin:16px 0 0;font-size:13px;color:#475569;">Ο σύνδεσμος λήγει σε <strong>30 λεπτά</strong> και μπορεί να χρησιμοποιηθεί μία φορά.</p>
    ${ipAddress ? `<p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Το αίτημα προήλθε από IP: <code>${escapeHtml(ipAddress)}</code>.</p>` : ""}
    <p style="margin:24px 0 0;font-size:13px;color:#475569;">Αν δεν ζήτησες αυτή την αλλαγή, αγνόησε αυτό το email — ο κωδικός σου παραμένει ασφαλής.</p>
  `);
  const text = `Επαναφορά κωδικού · timologion

Γεια σου ${name || ""},

Λάβαμε αίτημα επαναφοράς κωδικού. Ακολούθησε τον σύνδεσμο για να ορίσεις νέο κωδικό (λήγει σε 30 λεπτά):

${url}

Αν δεν ζήτησες αυτή την αλλαγή, αγνόησε αυτό το email.
`;
  return { subject, html, text };
}

export function testEmailTemplate({ toEmail }: { toEmail: string }) {
  const subject = "Δοκιμαστικό email · timologion";
  const html = shell(`
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${BRAND_NAVY};opacity:.6;">Δοκιμαστική αποστολή</p>
    <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;letter-spacing:-.02em;color:${BRAND_NAVY};">Επιτυχής παράδοση</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Αυτό το email εστάλη προς <strong>${escapeHtml(toEmail)}</strong> από τη σύνδεση Brevo της πλατφόρμας timologion.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Αν το βλέπεις στο inbox σου, οι ρυθμίσεις email της πλατφόρμας είναι σωστές.</p>
  `);
  const text = `timologion · Δοκιμαστικό email\n\nΑυτό το email εστάλη προς ${toEmail} από τη σύνδεση Brevo της πλατφόρμας timologion.\n`;
  return { subject, html, text };
}

export function emailVerifyTemplate({
  name,
  url,
}: {
  name: string;
  url: string;
}) {
  const subject = "Επιβεβαίωση email · timologion";
  const html = shell(`
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${BRAND_NAVY};opacity:.6;">Επιβεβαίωση</p>
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;letter-spacing:-.02em;color:${BRAND_NAVY};">Επιβεβαίωσε το email σου</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Γεια σου ${escapeHtml(name || "")},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Ένα ακόμη γρήγορο βήμα: πάτησε το κουμπί για να επιβεβαιώσεις ότι αυτό το email είναι δικό σου. Θα ξεκλειδώσει την έκδοση παραστατικών από τον λογαριασμό σου.</p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${url}" style="display:inline-block;background:${BRAND_NAVY};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">Επιβεβαίωση email</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#475569;">Αν το κουμπί δεν λειτουργεί:</p>
    <p style="margin:0 0 16px;word-break:break-all;font-size:12px;color:#475569;"><a href="${url}" style="color:${BRAND_NAVY};">${url}</a></p>
    <p style="margin:16px 0 0;font-size:13px;color:#475569;">Ο σύνδεσμος λήγει σε 24 ώρες.</p>
  `);
  const text = `Επιβεβαίωση email · timologion\n\nΓεια σου ${name || ""},\n\nΕπιβεβαίωσε το email σου ακολουθώντας τον σύνδεσμο:\n${url}\n\nΟ σύνδεσμος λήγει σε 24 ώρες.\n`;
  return { subject, html, text };
}

export function welcomeTemplate({
  name,
  appUrl,
}: {
  name: string;
  appUrl: string;
}) {
  const subject = "Καλωσόρισες στο timologion 👋";
  const html = shell(`
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${BRAND_NAVY};opacity:.6;">Καλωσόρισες</p>
    <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;letter-spacing:-.02em;color:${BRAND_NAVY};">Ο λογαριασμός σου είναι έτοιμος</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Γεια σου ${escapeHtml(name || "")},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Ξεκίνα σε τρία βήματα:</p>
    <ol style="margin:0 0 20px;padding-left:18px;font-size:15px;line-height:1.9;color:${BRAND_NAVY};">
      <li>Καταχώρησε τα στοιχεία της επιχείρησής σου (ΑΦΜ, ΔΟΥ, έδρα).</li>
      <li>Πρόσθεσε τους πρώτους πελάτες και τα είδη ή τις υπηρεσίες που πουλάς.</li>
      <li>Ενεργοποίησε τη σύνδεση με τον πάροχο και εξέδωσε το πρώτο σου παραστατικό.</li>
    </ol>
    <p style="margin:24px 0;text-align:center;">
      <a href="${appUrl}/app" style="display:inline-block;background:${BRAND_NAVY};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">Άνοιξε το dashboard</a>
    </p>
    <p style="margin:20px 0 0;font-size:13px;color:#475569;">Χρειάζεσαι βοήθεια; Απάντησε σε αυτό το email ή επικοινώνησε στο <a href="mailto:support@timologion.gr" style="color:${BRAND_NAVY};">support@timologion.gr</a>.</p>
  `);
  const text = `Καλωσόρισες στο timologion!\n\nΓεια σου ${name || ""},\n\nΞεκίνα από: ${appUrl}/app\n\nΓια βοήθεια: support@timologion.gr\n`;
  return { subject, html, text };
}

export function documentToClientTemplate({
  clientName,
  senderName,
  docType,
  docNumber,
  docTotal,
  documentUrl,
  note,
}: {
  clientName: string;
  senderName: string;
  docType: string;
  docNumber: string;
  docTotal: string;
  documentUrl: string;
  note?: string | null;
}) {
  const subject = `${docType} ${docNumber} από ${senderName}`;
  const html = shell(`
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${BRAND_NAVY};opacity:.6;">Νέο παραστατικό</p>
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;letter-spacing:-.02em;color:${BRAND_NAVY};">${escapeHtml(docType)} ${escapeHtml(docNumber)}</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Γεια σου ${escapeHtml(clientName)},</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Σου στέλνουμε παραστατικό συνολικής αξίας <strong style="color:${BRAND_NAVY};">${escapeHtml(docTotal)}</strong>. Μπορείς να το κατεβάσεις ή να το δεις στον παρακάτω σύνδεσμο.</p>
    ${
      note
        ? `<div style="margin:16px 0;padding:14px 16px;border-left:4px solid ${BRAND_NAVY};background:#f8fafc;border-radius:6px;font-size:14px;line-height:1.55;color:${BRAND_NAVY};white-space:pre-line;">${escapeHtml(note)}</div>`
        : ""
    }
    <p style="margin:24px 0;text-align:center;">
      <a href="${documentUrl}" style="display:inline-block;background:${BRAND_NAVY};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">Άνοιγμα παραστατικού</a>
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#475569;">Με εκτίμηση,<br />${escapeHtml(senderName)}</p>
  `);
  const text = `${docType} ${docNumber} από ${senderName}\n\nΓεια σου ${clientName},\n\nΣου στέλνουμε παραστατικό συνολικής αξίας ${docTotal}.\n\n${note ? note + "\n\n" : ""}Δες το εδώ: ${documentUrl}\n\nΜε εκτίμηση,\n${senderName}\n`;
  return { subject, html, text };
}

export function weeklyDigestTemplate({
  name,
  appUrl,
  unpaidCount,
  unpaidTotal,
  issuedCount,
  issuedTotal,
}: {
  name: string;
  appUrl: string;
  unpaidCount: number;
  unpaidTotal: string;
  issuedCount: number;
  issuedTotal: string;
}) {
  const subject = "Η εβδομαδιαία σύνοψη · timologion";
  const html = shell(`
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${BRAND_NAVY};opacity:.6;">Εβδομαδιαία σύνοψη</p>
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;letter-spacing:-.02em;color:${BRAND_NAVY};">Η εικόνα της εβδομάδας</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Γεια σου ${escapeHtml(name || "")},</p>
    <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 8px;margin:16px 0;">
      <tr>
        <td style="padding:16px;background:#f8fafc;border-radius:12px;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${BRAND_NAVY};opacity:.6;">Ανεξόφλητα</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:${BRAND_NAVY};">${escapeHtml(unpaidTotal)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#475569;">${unpaidCount} παραστατικά</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px;background:#f8fafc;border-radius:12px;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${BRAND_NAVY};opacity:.6;">Εκδοθέντα εβδομάδας</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:800;color:${BRAND_NAVY};">${escapeHtml(issuedTotal)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#475569;">${issuedCount} παραστατικά</p>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0;text-align:center;">
      <a href="${appUrl}/app/reports" style="display:inline-block;background:${BRAND_NAVY};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">Δες όλες τις αναφορές</a>
    </p>
  `);
  const text = `Εβδομαδιαία σύνοψη · timologion\n\nΑνεξόφλητα: ${unpaidTotal} (${unpaidCount} παραστατικά)\nΕκδοθέντα εβδομάδας: ${issuedTotal} (${issuedCount})\n\n${appUrl}/app/reports\n`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
