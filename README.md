# Zeevracht Calculator

Interne Team Freight Forwarding transportcalculator voor LCL en FCL.

## Techniek

- React
- TypeScript
- Vite
- Lokale data, geen externe database

## Lokaal starten

```bash
pnpm install
pnpm run dev
```

## Productiebuild

```bash
pnpm run build
```

De build-output komt in `dist/`.

## Tests

```bash
pnpm run test:lcl
pnpm run test:fcl
```

## Deploy

Dit is een Vite/React static web app. Gebruik voor deployment:

- build command: `pnpm run build`
- output directory: `dist`
- Node package manager: `pnpm`

Let op: de Excel-bronbestanden in `tools/data` zijn lokaal bedoeld voor het opnieuw genereren van tariefdata en worden niet mee gecommit.
