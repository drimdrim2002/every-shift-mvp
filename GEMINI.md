# GEMINI.md - EveryShift MVP

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
