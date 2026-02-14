# API Specification: Planning Request

This document describes the JSON structure for the `PlanningRequest` API, which is used to trigger the schedule generation process.
The endpoint accepts a JSON object with the following structure.

## Overview

The request body consists of five main sections:

1.  **`organization`**: Basic organization info and time frame settings.
2.  **`employees`**: List of employees available for scheduling.
3.  **`history`**: Historical assignments (fixed past data).
4.  **`undesirable`**: Employee requests or undesirable shifts (future data).
5.  **`requirements`**: Daily staffing requirements per shift.

---

## JSON Structure

### Root Object

| Field          | Type   | Required | Description                                                                  |
| :------------- | :----- | :------- | :--------------------------------------------------------------------------- |
| `organization` | Object | Yes      | Organization details and schedule parameters.                                |
| `employees`    | Array  | Yes      | List of employees.                                                           |
| `history`      | Array  | No       | List of past assignments before `firstDraftDate` (Off/O assignments excluded). |
| `undesirable`  | Array  | No       | List of employee off requests on or after `firstDraftDate`.                  |
| `requirements` | Array  | Yes      | Staffing requirements for each shift per day.                                |

---

### 1. Organization (`organization`)

Defines the context and the time range for the schedule.

| Field                | Type    | Format       | Description                                                                   |
| :------------------- | :------ | :----------- | :---------------------------------------------------------------------------- |
| `id`                 | String  | UUID         | Unique identifier for the organization.                                       |
| `name`               | String  | -            | Name of the organization (e.g., "Severance Hospital").                        |
| `type`               | String  | -            | Type of organization (e.g., "hospital").                                      |
| `shifts`             | Array   | -            | List of planning shift definitions (D/E/N only).                             |
| `lastHistoricalDate` | String  | `yyyy-MM-dd` | The last date of the historical data period.                                  |
| `publishLength`      | Integer | -            | Number of days to publish (not directly used in calculation logic currently). |
| `firstDraftDate`     | String  | `yyyy-MM-dd` | The start date of the planning period (schedule draft).                       |
| `draftLength`        | Integer | -            | The length of the planning period in days.                                    |

#### Shift Object (`organization.shifts[]`)

| Field        | Type   | Format     | Description                                         |
| :----------- | :----- | :--------- | :-------------------------------------------------- |
| `id`         | String | UUID       | Unique identifier for the shift.                    |
| `code`       | String | -          | Short code for the shift (e.g., "D", "E", "N").     |
| `name`       | String | -          | Display name of the shift (e.g., "Day", "Evening"). |
| `start_time` | String | `HH:mm:ss` | Shift start time.                                   |
| `end_time`   | String | `HH:mm:ss` | Shift end time.                                     |

---

### 2. Employees (`employees`)

List of all employees to be scheduled.

| Field              | Type          | Description                                                             |
| :----------------- | :------------ | :---------------------------------------------------------------------- |
| `employee_id`      | String        | Unique identifier for the employee.                                     |
| `name`             | String        | Employee name. (Defaults to `employee_id` if null).                     |
| `available_shifts` | Array<String> | List of shift codes (e.g., `["D", "E", "N"]`) the employee can perform. |
| `skill_set`        | Array<String> | List of skills/roles (e.g., `["ALL"]`).                                 |

---

### 3. History (`history`)

Represents confirmed past schedules used for constraint checking.

| Field         | Type    | Format       | Description                                                            |
| :------------ | :------ | :----------- | :--------------------------------------------------------------------- |
| `employee_id` | String  | UUID         | ID of the employee.                                                    |
| `shift_id`    | String  | UUID         | ID of the assigned shift (`D/E/N`, Off/O is excluded).                |
| `date`        | String  | `yyyy-MM-dd` | Date of the assignment (`date < firstDraftDate`).                     |
| `is_locked`   | Boolean | -            | Always `true` (hard constraint).                                       |

### 4. Undesirable (`undesirable`)

Represents future off requests/undesirable days.

| Field         | Type    | Format       | Description                                                |
| :------------ | :------ | :----------- | :--------------------------------------------------------- |
| `employee_id` | String  | UUID         | ID of the employee.                                        |
| `date`        | String  | `yyyy-MM-dd` | Requested date (`date >= firstDraftDate`).                 |
| `is_locked`   | Boolean | -            | Always `false` (soft constraint).                          |

---

### 5. Requirements (`requirements`)

Defines how many employees are needed for each shift on each day of the planning period.

| Field           | Type    | Description                                                      |
| :-------------- | :------ | :--------------------------------------------------------------- |
| `shiftId`       | String  | ID of the shift.                                                 |
| `dayIndex`      | Integer | 0-based index from `firstDraftDate`. (e.g., 0 is the first day). |
| `employeeCount` | Integer | Required number of employees for this shift on this day.         |

---

## Example Request Body

```json
{
  "organization": {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Severance Hospital",
    "type": "hospital",
    "shifts": [
      {
        "id": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
        "code": "D",
        "name": "Day",
        "start_time": "08:00:00",
        "end_time": "16:00:00"
      }
    ],
    "lastHistoricalDate": "2025-11-26",
    "firstDraftDate": "2025-12-01",
    "publishLength": 4,
    "draftLength": 31
  },
  "employees": [
    {
      "employee_id": "3515886c-6359-4919-9c02-682565bb93c7",
      "name": "John Doe",
      "available_shifts": ["D", "E", "N"],
      "skill_set": ["ALL"]
    }
  ],
  "history": [
    {
      "employee_id": "3515886c-6359-4919-9c02-682565bb93c7",
      "shift_id": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
      "date": "2025-11-30",
      "is_locked": true
    }
  ],
  "undesirable": [
    {
      "employee_id": "3515886c-6359-4919-9c02-682565bb93c7",
      "date": "2025-12-03",
      "is_locked": false
    }
  ],
  "requirements": [
    {
      "shiftId": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
      "dayIndex": 0,
      "employeeCount": 3
    }
  ]
}
```
