# LedgerSync

LedgerSync compares a company’s daily ledger export with the matching NIBSS / bank settlement file, so finance can see matched items, amount breaks, and missing rows without lining up two spreadsheets.

Built for recon analysts, controllers, and internal audit at Nigerian banks, fintechs, and corporates that settle through NIBSS, RTGS, or an acquirer.

This copy is a working demo: files are matched in the browser, and work is saved locally until a server, login, and database are connected.

## How to use

Start it:

```sh
pnpm install
pnpm dev
```

Open [http://localhost:5173/](http://localhost:5173/).

**Run a recon.** + NEW RUN → set the date → upload the ledger CSV and the NIBSS / settlement file (CSV or TXT) → START RUN. Need a trial pair? Use bundled samples.

Files need headers: `date, description, amount, currency, reference, counterparty`.

**Read the result.** Filter by status. Click a row for amounts and notes. MARK / ESCALATE / FLAG writes a trail on that item. DUP means the same reference appeared twice. Switch runs from history. Export Audit Report for a text pack of exceptions.

**Reports** generate a download (and keep it in history). **Rules** change matching tolerances for the next run. **Settings → General** exports or imports this browser’s workspace, or restores sample data.

Nothing is on a server yet. If you clear site data, the work is gone unless you exported it.
