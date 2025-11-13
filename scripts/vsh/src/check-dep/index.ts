import type { CAC } from 'cac';

import { getPackages } from '@vben/node-utils';

import depcheck from 'depcheck';

// Default configuration
const DEFAULT_CONFIG = {
  // Dependencies to ignore for matching
  ignoreMatches: [
    'vite',
    'vitest',
    'unbuild',
    '@vben/tsconfig',
    '@vben/vite-config',
    '@vben/tailwind-config',
    '@types/*',
    '@vben-core/design',
  ],
  // Packages to ignore
  ignorePackages: [
    '@vben/backend-mock',
    '@vben/commitlint-config',
    '@vben/eslint-config',
    '@vben/node-utils',
    '@vben/prettier-config',
    '@vben/stylelint-config',
    '@vben/tailwind-config',
    '@vben/tsconfig',
    '@vben/vite-config',
    '@vben/vsh',
  ],
  // File patterns to ignore
  ignorePatterns: ['dist', 'node_modules', 'public'],
};

interface DepcheckResult {
  dependencies: string[];
  devDependencies: string[];
  missing: Record<string, string[]>;
}

interface DepcheckConfig {
  ignoreMatches?: string[];
  ignorePackages?: string[];
  ignorePatterns?: string[];
}

interface PackageInfo {
  dir: string;
  packageJson: {
    name: string;
  };
}

/**
 * Clean dependency check results
 * @param unused - Dependency check results
 */
function cleanDepcheckResult(unused: DepcheckResult): void {
  // Remove file: prefix dependency hints, these are local dependencies
  Reflect.deleteProperty(unused.missing, 'file:');

  // Clean path dependencies
  Object.keys(unused.missing).forEach((key) => {
    unused.missing[key] = (unused.missing[key] || []).filter(
      (item: string) => !item.startsWith('/'),
    );
    if (unused.missing[key].length === 0) {
      Reflect.deleteProperty(unused.missing, key);
    }
  });
}

/**
 * Format dependency check results
 * @param pkgName - Package name
 * @param unused - Dependency check results
 */
function formatDepcheckResult(pkgName: string, unused: DepcheckResult): void {
  const hasIssues =
    Object.keys(unused.missing).length > 0 ||
    unused.dependencies.length > 0 ||
    unused.devDependencies.length > 0;

  if (!hasIssues) {
    return;
  }

  console.log('\n📦 Package:', pkgName);

  if (Object.keys(unused.missing).length > 0) {
    console.log('❌ Missing dependencies:');
    Object.entries(unused.missing).forEach(([dep, files]) => {
      console.log(`  - ${dep}:`);
      files.forEach((file) => console.log(`    → ${file}`));
    });
  }

  if (unused.dependencies.length > 0) {
    console.log('⚠️ Unused dependencies:');
    unused.dependencies.forEach((dep) => console.log(`  - ${dep}`));
  }

  if (unused.devDependencies.length > 0) {
    console.log('⚠️ Unused devDependencies:');
    unused.devDependencies.forEach((dep) => console.log(`  - ${dep}`));
  }
}

/**
 * Run dependency check
 * @param config - Configuration options
 */
async function runDepcheck(config: DepcheckConfig = {}): Promise<void> {
  try {
    const finalConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    const { packages } = await getPackages();

    let hasIssues = false;

    await Promise.all(
      packages.map(async (pkg: PackageInfo) => {
        // Skip packages that need to be ignored
        if (finalConfig.ignorePackages.includes(pkg.packageJson.name)) {
          return;
        }

        const unused = await depcheck(pkg.dir, {
          ignoreMatches: finalConfig.ignoreMatches,
          ignorePatterns: finalConfig.ignorePatterns,
        });

        cleanDepcheckResult(unused);

        const pkgHasIssues =
          Object.keys(unused.missing).length > 0 ||
          unused.dependencies.length > 0 ||
          unused.devDependencies.length > 0;

        if (pkgHasIssues) {
          hasIssues = true;
          formatDepcheckResult(pkg.packageJson.name, unused);
        }
      }),
    );

    if (!hasIssues) {
      console.log('\n✅ Dependency check completed, no issues found');
    }
  } catch (error) {
    console.error(
      '❌ Dependency check failed:',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Define dependency check command
 * @param cac - CAC instance
 */
function defineDepcheckCommand(cac: CAC): void {
  cac
    .command('check-dep')
    .option(
      '--ignore-packages <packages>',
      'Packages to ignore, comma separated',
    )
    .option(
      '--ignore-matches <matches>',
      'Dependency patterns to ignore, comma separated',
    )
    .option(
      '--ignore-patterns <patterns>',
      'File patterns to ignore, comma separated',
    )
    .usage('Analyze project dependencies')
    .action(async ({ ignoreMatches, ignorePackages, ignorePatterns }) => {
      const config: DepcheckConfig = {
        ...(ignorePackages && { ignorePackages: ignorePackages.split(',') }),
        ...(ignoreMatches && { ignoreMatches: ignoreMatches.split(',') }),
        ...(ignorePatterns && { ignorePatterns: ignorePatterns.split(',') }),
      };

      await runDepcheck(config);
    });
}

export { defineDepcheckCommand, type DepcheckConfig };
