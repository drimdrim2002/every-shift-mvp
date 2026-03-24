# GEMINI.md - EveryShift MVP

## Development Environment Baseline

- Default local environment: **macOS (zsh)**
- Do not assume WSL2 unless the user explicitly says they are on Windows/WSL.

## Supabase MCP Safety Rule

- Use Supabase MCP for inspection and query drafting only.
- Never execute SQL, migrations, or data-changing operations through Supabase MCP tools.
- This includes tools such as `execute_sql`, `apply_migration`, branch management, or any other remote write action.
- When SQL is needed, prepare the query and present it to the user. The user will run it manually in the Supabase Console.

## Critical Explanation Rule

**VERY IMPORTANT**: Never describe UI, navigation, tabs, panels, flows, or test steps in vague terms.

When explaining UI behavior, UX validation, QA steps, or implementation status, the agent **MUST** explicitly identify all of the following:

1. **Target Screen or Route**: State the exact screen, route, or component being discussed.
2. **Exact UI Surface**: State which tab, section, panel, modal, table, form, or control the explanation refers to.
3. **User Action**: State exactly what the user or tester should click, open, enter, or navigate to.
4. **Expected Result**: State the exact visible result, redirect result, or data result that should occur.
5. **Scope Boundary**: Clearly separate route-guard checks, screen-level checks, and in-screen tab/content checks.

The agent **MUST NOT** say things like:

- "check the screen structure"
- "test the tab behavior"
- "verify the shell policy"
- "confirm the UI"

unless it immediately specifies **which exact screen**, **which exact tab/section**, **which exact action**, and **which exact expected outcome**.

If multiple screens or routes are involved, the agent must separate them explicitly instead of blending them into one vague explanation.

If the user asks how to test something, the answer must be written as a concrete verification guide, not as a high-level or ambiguous summary.

## UI Test Execution Rule

- When UI verification is needed, agents may execute the check directly through **Playwright MCP** instead of stopping at a written test plan.
- Before starting a Playwright MCP UI test that requires authentication, the agent may ask the user which account should be used for the current verification run.
- Playwright MCP account catalog:
  - P3 role/state fixture accounts, all with password `5t4r3e@W1q`:
    - `p3-admin-active@example.com`
    - `p3-admin-pending@example.com`
    - `p3-admin-rejected@example.com`
    - `p3-no-membership@example.com`
    - `p3-super@example.com`
    - `p3-user-active@example.com`
  - default `admin_active` account:
    - email: `sindeaf@gmail.com`
    - password: `5t4r3e@W1q`
  - default `super_active` account:
    - email: `admin@everyshift.com`
    - password: `admin123456`
- If the user does not provide a different account and explicitly wants the UI test to proceed, use the default account that matches the scenario. For generic admin verification, use `sindeaf@gmail.com`. For super-admin verification, use `admin@everyshift.com`. For P3 access-state matrix verification, prefer the matching `p3-*` fixture account.
- The agent must still explain which exact route, UI surface, user action, and expected result will be validated.
- If the selected account is not suitable for the target scenario (for example, onboarding-complete state when onboarding-incomplete verification is required), the agent must say so clearly and request a different account or fixture path before continuing.

## Project Overview

This is a Vue.js 3 application for generating nurse schedules, designed to significantly reduce the time spent on manual scheduling. It's a single-page application (SPA) built with Vite, using the Composition API with `<script setup>`. The application is written in TypeScript and styled with Tailwind CSS and Naive UI. State management is handled by Pinia, and the backend is powered by Supabase for database and authentication.

The core feature of the application is a multi-step workflow to create a schedule:

1.  **Basic Info:** Set the month for the schedule.
2.  **Site Info:** Define the required number of staff for each shift per day.
3.  **Initial Data:** Input initial schedule data into a grid.
4.  **AI Solver:** (Mocked) Generate the schedule.
5.  **Results:** View and edit the generated schedule, and export it to Excel.

## Building and Running

### Prerequisites

- Node.js 18+
- pnpm (recommended)
- Supabase account

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    pnpm install
    ```

### Environment Variables

1.  Create a `.env.local` file by copying `.env.example`.
2.  Fill in the required Supabase credentials:
    ```
    VITE_SUPABASE_URL=<your-supabase-url>
    VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
    ```

### Development Server

To run the development server:

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

To create a production build:

```bash
pnpm build
```

### Running Tests

- **Unit Tests (Vitest):**
  ```bash
  pnpm test:unit
  ```
- **End-to-End Tests (Playwright):**
  ```bash
  pnpm test:e2e
  ```

## Development Conventions

### Code Style

- The project uses ESLint and Prettier for code linting and formatting.
- Use `pnpm lint` to check for linting errors and `pnpm format` to format the code.

### Git Workflow

- Create feature branches from the `main` branch.
- Run `pnpm lint` to ensure code quality before creating a pull request.

### State Management

- Global application state is managed using Pinia.
- There are separate stores for authentication (`auth.ts`), organization data (`organization.ts`), and the schedule workflow (`schedule.ts`).

### Routing

- The application uses Vue Router for navigation.
- Routes are defined in `src/router/index.ts`.
- Navigation guards are used for authentication and to enforce the correct order of the scheduling steps.

### Backend

- The backend is provided by Supabase.
- Database schema migrations are located in the `supabase/migrations` directory.
- Seed data for development is in `supabase/seed.sql`.
