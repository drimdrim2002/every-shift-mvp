# REFINED_PRD

# 1. Project Overview

## 1.1 Problem Definition

Shift work is essential in organizations that operate 24/7, such as hospitals, police departments, fire stations, and factories. Managing these shift schedules is highly complex for the following reasons:

- There are many constraints to consider, such as vacations, public holidays, and labor law compliance.
- Individual employee preferences must be reflected, such as preferred and non-preferred working hours.
- A balance is needed between required staffing levels and actual staff availability.
- Shifts must be distributed fairly.
- Worker fatigue and health must be managed.

Currently, many organizations still create schedules manually using spreadsheets, which is time-consuming and prone to errors.

## 1.2 Goals

EveryShift is a cloud-based solution designed to efficiently solve the employee rostering problem. Its primary goals are as follows:

- Provide a user-friendly interface for entering and managing requirements
- Provide dashboards to monitor fairness and efficiency
- Support shift patterns across various industries
- Reflect real-time changes and enable integrated communication
- Deliver automated scheduling using an AI-based optimization engine (OptaPlanner)

# 2. Technical Stack

- The system is divided into Frontend, Backend, and AI Solver.
- The call structure is Frontend ↔ Backend ↔ AI Solver.

## 2.1 Frontend

- Vue 3.5.17
- TypeScript 5.8.3
- Vite 6.3.5
- Naive UI 2.42.0
- Tailwind CSS 3.4.17

## 2.2 Backend

- TypeScript
- Supabase-based authentication and login
- Data management using Supabase PostgreSQL

## 2.3 AI Solver

- Google Cloud Run: Java
- Development is already complete, and this project only covers calling the AI Solver and handling its responses.

# 3. User Permission Management

Supports Supabase-based email/password authentication.

- Role-based access control (RBAC)
  - **super**: Has full permissions across the entire project
  - **admin**: Has full permissions to manage the organization they belong to
  - **user**: Has permitted access only to the menus and actions granted to them

# 5. Sign Up and Login

## 5.1 Sign Up

During sign-up, the user enters or selects the following information:

- Name (or nickname)
- Email
- Role
  - The user can choose either `admin` or `user`.
  - `super` is created directly in Supabase, not through the UI.
- If `admin` is selected:
  - Select and load organization information from the `public.organization` table in Supabase DB.
  - If no organization information exists, create organization information in the next step.
  - Move to the organization creation screen, enter the required information, and proceed to the next step.
    - The organization creation screen should reuse the screen from `6.2 Organization Management`.
    - In other words, do not create a separate menu only for sign-up. Reuse the existing menu.
  - After all information is entered and the user proceeds to the next step, show a message that approval is pending.
  - The user can log in only after being approved by the superuser.
- If `user` is selected:
  - Select an organization from the `public.organization` table in Supabase DB.
  - Confirm the selected organization and then choose the following details:
    - Select job type
    - Select shift time type
    - Select work site
    - Select possessed skills and specialties
    - Select rank and review credits
  - After all information is entered and the user proceeds to the next step, show a message that approval is pending.
  - The user can log in only after being approved by the superuser or the admin of the selected organization.

## 5.2 Login

- Only authenticated users can log in.
- Users can log in using their registered email information.
- Google account and Kakao account integration will be completed later.

## 5.3 [New] New Organization Onboarding

This is a process that guides the first approved `admin` user after their initial login so they can configure the service's core features and learn how to use it.

- **Setup Wizard**
  1. On the `admin` user's first login, a setup wizard modal is launched together with a welcome message.
  2. **Step 1 (Confirm Organization Information)**: Show the organization information entered during sign-up and guide the user to add required information such as shift time types (for example, day shift, night shift, three-shift rotation) and major work sites (for example, emergency ward, surgical ward).
  3. **Step 2 (Guide Employee Registration)**: Direct the user to the `Employee Management` menu so they can register the first `user`. Apply a highlight effect to that menu together with guide text.
  4. **Step 3 (Guide Schedule Request)**: Direct the user to the `Excel Upload` menu and guide them through template download and sample data entry.
  5. After all steps are completed, show the message "You are now ready to use EveryShift!" and move the user to the dashboard screen.
- Implementation invariants for step keys, completion ownership, and admin-only forcing are fixed in `docs/migration/P3_ONBOARDING_STATE_MACHINE.md`.

# 6. Master Management

## 6.1 Account Management

Account information can be viewed, created, updated, and deleted.

Only users with `super` or `admin` accounts can see this menu. Users with `user` accounts cannot see this menu.

### When logged in with a Super account

- Can view, create, update, and delete accounts for all organizations
- Can approve, reject, and process withdrawals for sign-ups across all organizations

### When logged in with an admin account

- Can view accounts in their own organization
- Can approve, reject, and process withdrawals for sign-ups in their own organization

## 6.2 Organization Management

Organization information can be viewed, created, updated, and deleted.

- Organization information
  - Organization name
  - Organization type
    - Hospital / Fire / Police / Logistics / Manufacturing
  - Work type
    - Shifts
      - Shift work hours can be registered freely.
      - By default, the standard registration is **3-shift rotation**.
        - 3-shift rotation (8~16, 16~24, 24~8)
      - Additional shifts can also be registered.
    - Work constraints
      - Maximum allowed consecutive `N` shifts
      - Average weekly working hours → 40 hours
      - Maximum weekly working hours → 52 hours
      - Weekly days off → 2 days
    - Minimum rest time when changing shifts
      - If the shift changes, sufficient rest time must be guaranteed.
      - This should prevent patterns such as `ND`, `NOD`, and `NE`.
      - D: 24 (32), E: 24 (32), N: 36 (48)
  - Shift time type
    - Possessed skills and specialties
      - The user should be able to understand and enter these naturally through the examples below.
      - For hospital work: cancer, gastroenterology, surgery, orthopedics, emergency, etc.
      - For fire service work: emergency, rescue, paramedic, fire suppression, etc.
  - Rank
    - Rank types for employees can be registered.
      - LV1, LV2, LV3, LV4
  - Work sites
    - Multiple sites within the organization can be registered.
    - The user should be able to understand and enter these naturally through the examples below.
      - For hospitals: cancer ward, emergency ward, surgical ward
      - For fire service: Yongin Fire Station
      - For police: Bundang Police Station
      - For factories: Plant 1, Plant 2, Plant 3
    - The required number of workers for each site can be registered **by day of week**.
      - The required number of workers can be registered by day of week.
      - If needed, additional requirements can optionally be registered based on selected skills and ranks.

Example) Required staffing by site

|     | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D   | 3   | 3   | 3   | 3   | 3   | 3   | 3   |
| E   | 3   | 4   | 4   | 4   | 4   | 4   | 3   |
| N   | 3   | 3   | 3   | 3   | 3   | 3   | 3   |
| H   |     | 1   | 1   | 1   | 1   | 1   |     |

Only users with `super` or `admin` accounts can see this menu. Users with `user` accounts cannot see this menu.

### When logged in with a Super account

- Can view, create, update, and delete information for all organizations
- Organization selection can be made one at a time through a dropdown list at the top

### When logged in with an admin account

- Can view, create, update, and delete information for their own organization

## 6.3 Employee Management

Employee information can be registered, updated, and deleted.

- Employee name, ID, specialty, rank, available shifts, and similar information can be registered.
  - Credits should initially be shown using the rank-based credits registered in the organization information.
- Both direct UI input and Excel upload must be supported.

| Employee Name | ID    | Specialty   | Rank | Shift Type | Site        |
| ------------- | ----- | ----------- | ---- | ---------- | ----------- |
| Brown         | 12345 | Orthopedics | LV1  | D,E,N      | Orthopedics |
| Cony          | 12355 | Orthopedics | LV2  | D,E,N      | Orthopedics |
| Sally         | 12555 | Orthopedics | LV3  | D,E,N      | Orthopedics |
| Ryan          | 54332 | Orthopedics | LV4  | D          | Orthopedics |

### When logged in with a Super account

- Can view and update users in all organizations

### When logged in with an admin account

- Can view and update users in their own organization

### When logged in with a user account

- Can view and update only their own information

# 7. Schedule Creation

The information required for schedule creation is loaded and saved in three steps.

## 7.1 Basic Information Setup

- Planning month
  - By default, next month is selected and shown, and the user can also choose the current month
- Confirm and update the basic information entered in the organization information
  - Organization name and type
  - Registered shifts
  - Work constraints
  - Minimum rest time when changing shifts
- After confirmation, the user can modify the information and move to the next step.

## 7.2 Site Information Setup

In organization information, the required staffing count for each site is registered by day of week.

- This is applied to the planning month configured in `7.1 Basic Information Setup`.

Therefore, the system calculates and shows the required staffing count by day of week based on the planning month. The screen displays the information as shown below, and the user can edit and save it.

|       | This Month | This Month | This Month | This Month | This Month | This Month | This Month | This Month |
| ----- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- |
|       | September  | September  | September  | September  | September  | September  | September  | September  |
|       | Sep 1      | Sep 2      | Sep 3      | Sep 4      | Sep 5      | Sep 6      | Sep 7      | Sep 8      |
| Total | 11         | 11         | 11         | 11         | 11         | 11         | 11         | 11         |
| D     | 3          | 3          | 3          | 3          | 3          | 3          | 3          | 3          |
| N     | 4          | 4          | 4          | 4          | 4          | 4          | 4          | 4          |
| E     | 3          | 3          | 3          | 3          | 3          | 3          | 3          | 3          |
| W     | 1          | 1          | 1          | 1          | 1          | 1          | 1          | 1          |

## 7.3 Schedule

- Development completed

# 8. [New] Notification System

This system effectively delivers interactions between users and major events.

## 8.1 Notification Channels

- **In-app notifications**: Show new notifications through the bell (🔔) icon in the upper-right corner of the screen.
- **Email notifications**: Send notifications to the registered email address when important events occur that require immediate awareness or action.

## 8.2 Notification Types

- Sign-up approval/rejection
- AI engine execution completed
- Organization-wide announcements sent by administrators

## 8.3 Notification Settings

- In `My Info` > `Notification Settings`, users can choose whether to receive in-app notifications and email notifications for each event type.

# 9. Monitoring and Dashboard

## 9.1 Admin Dashboard

Provides a quick view of the organization's scheduling status and supports data-driven decision-making.

### 9.1.1 Fairness Metrics

- **Night/weekend shift status by employee**: A bar chart that compares the number of night and weekend shifts for each employee during a specific period (month)

## 9.2 Employee Dashboard

- Work statistics
  - Users can view counts such as team members' night shifts and weekend shifts.
- Personal work schedule
  - Each individual can review their own schedule in a calendar view.

## 9.3 Data Export and Reporting

- **Filter functionality**: All dashboard charts and data must support filtering by period, work site, and rank.
- **Data export**: Based on filtered dashboard data, the system can generate custom reports and export them in **Excel/CSV format**.

> Detailed implementation-facing contract for dashboard metrics, filters, RBAC landing, and dependency states is maintained in `docs/specs/p9/P9-1.1-dashboard-metrics-filter-spec.md`.
