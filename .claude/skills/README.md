# EveryShift MVP Skills

## Overview

This directory contains **Claude Code skills** for the EveryShift MVP project. Skills follow the **SKILL.md open standard** (YAML frontmatter + Markdown) and are designed to generate code following project conventions.

## Available Skills

### 🎨 `/component` - Vue Component Generator

**Trigger**: `/component <ComponentName> [options]`

Generate Vue 3 Single File Components with TypeScript, Naive UI, and Tailwind CSS.

**Usage:**
```bash
# Basic component
/component ShiftSelector --props="shifts:string[],selectedShift:string" --emits="select"

# Form component
/component EmployeeForm --type=form --props="employee:Employee" --emits="submit,cancel"

# Grid component
/component ScheduleGrid --type=grid
```

**Reference:** [component-generator/SKILL.md](component-generator/SKILL.md)

---

### 🔧 `/composable` - Vue Composable Generator

**Trigger**: `/composable <ComposableName> [options]`

Generate Vue 3 composables with reactive state, TypeScript types, and cleanup patterns.

**Usage:**
```bash
# Basic composable
/composable useScheduleData --refs="status,error,data" --computed="isLoading"

# Polling composable
/composable useAISolver --refs="status,progress" --polling
```

**Reference:** [composable-generator/SKILL.md](composable-generator/SKILL.md)

---

### 📦 `/store` - Pinia Store Generator

**Trigger**: `/store <StoreName> [options]`

Generate Pinia stores with Composition API, TypeScript, and optional persistence.

**Usage:**
```bash
# Basic store
/store auth

# Store with persistence
/store schedule --persist

# Multi-step wizard store
/store schedule --actions="nextStep,prevStep,canProceed"
```

**Reference:** [pinia-store-generator/SKILL.md](pinia-store-generator/SKILL.md)

---

## Skills vs MCP

| Skills | MCP Servers |
|--------|-------------|
| Share knowledge/instructions | Extend functionality with tools |
| Run in Anthropic's sandbox | Self-hosted protocol |
| No server deployment | Requires server deployment |
| **Best for**: Code generation patterns | **Best for**: External system integration |

**Recommended:** Use both together for maximum productivity.

---

## Project-Specific Patterns

### Naive UI Integration

All components use `src/utils/message.ts` for Naive UI global API:

```typescript
import { message } from '@/utils/message';

message.success('저장되었습니다');
message.error('오류가 발생했습니다');
```

### TypeScript Conventions

- **Components**: PascalCase (e.g., `ShiftSelector`)
- **Composables**: camelCase with "use" prefix (e.g., `useScheduleGrid`)
- **Stores**: camelCase (e.g., `auth` → `useAuthStore()`)
- **Types**: PascalCase (e.g., `ScheduleAssignment`)

### File Organization

```
src/
├── components/
│   └── schedule/
├── composables/
├── stores/
├── api/
└── types/
```

---

## Directory Structure

Each skill follows the SKILL.md standard:

```
skill-name/
├── SKILL.md              # Required: YAML + Markdown
├── reference/            # Templates, patterns
│   └── *.template
├── examples/             # Usage examples
│   └── *.example.md
└── scripts/              # Executable scripts (optional)
```

---

## Additional Resources

- **[SKILL.md Standard](https://www.mintlify.com/blog/skill-md)** - Open standard format
- **[SkillsMP Marketplace](https://skillsmp.com/zh)** - Share and discover skills
- **[Anthropic Skills Guide](https://github.com/anthropics/skills)** - Official documentation

---

## Contribution

To add a new skill:

1. Create directory under `.claude/skills/`
2. Add `SKILL.md` with proper frontmatter
3. Add templates to `reference/`
4. Add examples to `examples/`
5. Update this README

---

## Maintenance

Keep skills updated with:
- Latest project patterns
- New component libraries
- Evolving best practices
- Community feedback

---

**Version:** 1.0.0
**Last Updated:** 2026-02-09
**Project:** EveryShift MVP
