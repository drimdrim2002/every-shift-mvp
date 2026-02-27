# Automation Scripts

Essential development workflow scripts for quality assurance and validation.

## 📋 Available Scripts

### Pre-Development Scripts 🚀

#### `health-check.sh`

**Purpose**: Complete project health check before starting development **Checks**:

- ✅ Node.js and pnpm versions
- ✅ Dependencies installation
- ✅ TypeScript validation
- ✅ ESLint compliance
- ✅ Build success

**Usage**:

```bash
./scripts/health-check.sh
```

#### `validate-types.sh`

**Purpose**: TypeScript type safety validation **Actions**:

- 🛡️ TypeScript compilation check
- 🔍 ESLint type safety rules
- 🎨 Code formatting check
- 🧹 Remove unused imports

**Usage**:

```bash
./scripts/validate-types.sh
```

### Pre-Commit Scripts ✅

#### `pre-commit-validation.sh`

**Purpose**: Comprehensive validation before committing code **Actions**:

- 🧹 Clean debug statements
- 🎨 Format code
- 🔍 Run ESLint
- 🛡️ Type checking
- 🏗️ Test build

**Usage**:

```bash
./scripts/pre-commit-validation.sh
```

#### `quality-gate.sh`

**Purpose**: Canonical single-entry quality gate for merge/release readiness **Gates**:

1. ✅ Lint (`pnpm lint:check`)
2. ✅ Unit tests (`pnpm test:unit`)
3. ✅ Build (`pnpm build`)
4. ✅ Documentation baseline (`docs/migration/MIGRATION_GOVERNANCE.md` etc.)
5. ✅ No debug statements in `src/`

**Usage**:

```bash
./scripts/quality-gate.sh
```

## 🛠️ Setup Instructions

### Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

### Integration with Development Workflow

1. **Project Setup** (after cloning):

   ```bash
   ./scripts/health-check.sh
   ```

2. **Pre-Commit** (mandatory):

   ```bash
   ./scripts/pre-commit-validation.sh
   ```

3. **Release Ready**:
   ```bash
   ./scripts/quality-gate.sh
   ```

## 📊 Exit Codes

| Exit Code | Meaning              | Action Required      |
| --------- | -------------------- | -------------------- |
| `0`       | ✅ Success           | None - proceed       |
| `1`       | ❌ Validation failed | Fix issues and retry |

## ⚠️ Important Notes

- Scripts are designed for **Linux/macOS environments**
- All scripts include detailed error reporting
- Scripts follow the project's quality gates system
- Scripts prevent common development mistakes

## 🔗 Related Documentation

See main `CLAUDE.md` for:

- Development quality gates requirements
- ESLint and code style rules
- TypeScript error prevention

Migration operating policy:

- `docs/migration/MIGRATION_GOVERNANCE.md`
