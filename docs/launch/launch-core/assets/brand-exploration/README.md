# EveryShift Logo Exploration

This folder archives the generated PNG boards from the launch-core logo exploration and the selected cropped logo files used by the app.

## Exploration Boards

| File                                        | Description                                            |
| ------------------------------------------- | ------------------------------------------------------ |
| `everyshift-logo-initial-options-1.png`     | Initial logo exploration board, source batch 019dc27b. |
| `everyshift-logo-initial-options-2.png`     | Initial logo exploration board, source batch 019dc27b. |
| `everyshift-logo-a-lowercase-variants.png`  | Lowercase wordmark variants.                           |
| `everyshift-logo-b-roster-variants.png`     | Roster/grid themed variants.                           |
| `everyshift-logo-c-color-variants.png`      | Color system variants.                                 |
| `everyshift-logo-d-depth-variants.png`      | Depth and shadow variants.                             |
| `everyshift-logo-e-no-outline-variants.png` | No-outline variants.                                   |

## Selected Crops

| File                                    | Selected Variant | App Asset                        |
| --------------------------------------- | ---------------- | -------------------------------- |
| `everyshift-logo-selected-main-e1.png`  | E1               | `src/assets/brand/main_logo.png` |
| `everyshift-logo-selected-solid-e8.png` | E8               | `src/assets/brand/solid_log.png` |
| `everyshift-logo-selected-saas-e4.png`  | E4               | `src/assets/brand/saas_log.png`  |

Source generated images remain in `/Users/brown/.codex/generated_images/` and were not deleted.

## App Export Rules

- `main_logo.png` is for light UI surfaces only (`bg-white`, public header, app header).
- Export with true transparency; do not embed a white `bKGD` chunk or bake white anti-aliasing for a light page.
- When re-cropping from exploration boards, run `-background white -alpha background` (or equivalent) before committing so dark OS/browser modes do not show white halos around the wordmark.
- MVP does not ship a dark-mode logo variant; keep `color-scheme: light` on public and app shells instead of adding `dark:` logo swaps.
