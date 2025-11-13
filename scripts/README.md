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

#### `verify-crud-apis.sh`

**Purpose**: Verify CRUD API completeness for organization entities **Checks**:

- ✅ Create functions exist
- ✅ Read functions exist
- ✅ Update functions exist
- ✅ Delete functions exist (Critical!)

**Usage**:

```bash
./scripts/verify-crud-apis.sh
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

**Purpose**: Enforce all quality gates (5-gate system) **Gates**:

1. ✅ TypeScript Compliance
2. ✅ ESLint Compliance
3. ✅ Build Success
4. ✅ No Debug Code
5. ✅ CRUD Completeness

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

2. **Development Start**:

   ```bash
   ./scripts/verify-crud-apis.sh
   ```

3. **Pre-Commit** (mandatory):

   ```bash
   ./scripts/pre-commit-validation.sh
   ```

4. **Release Ready**:
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
- Scripts follow the project's 5 Gates System
- Scripts prevent common development mistakes

## 🔗 Related Documentation

See main `CLAUDE.md` for:

- Development Gates requirements
- ESLint and code style rules
- CRUD completeness guidelines
- TypeScript error prevention
