# EveryShift Logo Exploration

This folder archives the generated PNG boards from the launch-core logo exploration and the selected cropped logo files used by the app.

## App Source of Truth

| Asset                                | Role                                      |
| ------------------------------------ | ----------------------------------------- |
| `src/assets/brand/logo-mark.svg`     | Vector mark asset; color via CSS tokens   |
| `src/components/brand/BrandLogo.vue` | App SSOT for all UI chrome logo rendering |

## Legacy Reference

| File                             | Role                                                      |
| -------------------------------- | --------------------------------------------------------- |
| `src/assets/brand/main_logo.png` | Legacy raster wordmark; reference only, not for UI chrome |

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

| File                                    | Selected Variant | Notes                             |
| --------------------------------------- | ---------------- | --------------------------------- |
| `everyshift-logo-selected-main-e1.png`  | E1               | Source for legacy `main_logo.png` |
| `everyshift-logo-selected-solid-e8.png` | E8               | `src/assets/brand/solid_log.png`  |
| `everyshift-logo-selected-saas-e4.png`  | E4               | `src/assets/brand/saas_log.png`   |

Source generated images remain in `/Users/brown/.codex/generated_images/` and were not deleted.

## Export Rules (Legacy Raster)

These rules apply only when re-exporting legacy PNG wordmarks for reference. UI chrome must use `BrandLogo.vue` and `logo-mark.svg`.

- `main_logo.png` is a legacy reference for light UI surfaces only.
- Export with true transparency; do not embed a white `bKGD` chunk or bake white anti-aliasing for a light page.
- When re-cropping from exploration boards, run `-background white -alpha background` (or equivalent) before committing so dark OS/browser modes do not show white halos around the wordmark.
- Brand colors and dark-mode behavior for UI chrome are defined in `DESIGN.md` (Brand Logo Tokens) and `src/components/brand/brand-logo.tokens.css`.
