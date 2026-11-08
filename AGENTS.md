# LedgerSync

React + Vite + Tailwind CSS app for ledger-to-settlement reconciliation.

## Development

```sh
pnpm install
pnpm dev
```

The Vite server runs on port 5173.

## Project structure

- `src/main.tsx` — React entrypoint; imports `src/index.css` and mounts `src/App.tsx`
- `src/App.tsx` — Application shell, routing, and reconciliation view
- `src/pages/` — Reports, rules, and settings
- `src/components/` — Shared UI
- `src/data/transactions.ts` — Sample run and transaction data
- `src/lib/` — Hash routing and date helpers
- `src/index.css` — Global CSS and Tailwind v4 import
- `index.html` — Vite HTML shell
- `vite.config.ts` — Vite, React, Tailwind, and the `@` alias for `src`

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`

## Styling

Use Tailwind utility classes in JSX. Put global CSS and theme tokens in `src/index.css`. Keep CSS `@import` statements first.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings.
- Ensure JSX tags are closed and braces are balanced.
- Export page and shared components as default exports.
