# Repository Guidelines

## Project Structure & Module Organization

This repository is a Vite, React, and TypeScript movement-analysis frontend.

- `src/main.tsx` boots the React app.
- `src/app/` contains app-level wiring such as routing and providers.
- `src/features/` groups domain code by workflow: `analysis`, `dashboard`, `doctor`, and `patient`.
- `src/components/` contains reusable layout and UI primitives.
- `src/hooks/` and `src/lib/` contain shared utilities.
- `src/styles/globals.css` and `tailwind.config.ts` define global styling.
- `dist/` is build output and should not be edited manually.

Keep new code close to its feature unless it is clearly reusable across multiple areas.

## Build, Test, and Development Commands

Use npm scripts from the repository root:

```bash
npm run dev
npm run build
npm run preview
```

- `npm run dev` starts the local Vite development server.
- `npm run build` runs TypeScript checking with `tsc --noEmit`, then creates a production build.
- `npm run preview` serves the built app locally for production-like checks.

Run `npm install` after dependency changes or a fresh checkout.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Prefer `.tsx` for components and pages, `.ts` for data, types, hooks, and utilities.

- Components and pages: `PascalCase`, for example `PatientRecordPage.tsx`.
- Hooks: `useCamelCase`, for example `useDebounce.ts`.
- Utility functions: `camelCase`, for example `formatDate.ts`.
- Types should live near their feature in `types/`.

Follow the existing Tailwind CSS style. Keep UI changes consistent with the current component primitives in `src/components/ui`.

## Testing Guidelines

No automated test framework or `npm test` script is currently configured. For now, validate changes with:

```bash
npm run build
```

For UI changes, also run the dev server and manually check the affected route. If tests are added later, place them beside the related feature or component and document the new command in `package.json`.

## Commit & Pull Request Guidelines

Local Git history could not be inspected in this checkout because Git reports dubious repository ownership, so no project-specific commit convention is confirmed. Use concise, imperative commit messages such as:

```text
Add patient symptom report fields
Fix doctor dashboard task tabs
```

Pull requests should include a short summary, affected routes or features, validation steps, and screenshots for visible UI changes. Link related issues or project notes when available.

## Security & Configuration Tips

Do not commit secrets, local logs, or generated build artifacts. Keep environment-specific values outside source files, and prefer typed mock data under `src/features/*/data` for prototype workflows.
