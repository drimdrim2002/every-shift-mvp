import type { CAC } from 'cac';

import { extname } from 'node:path';

import { getStagedFiles } from '@vben/node-utils';

import { circularDepsDetect } from 'circular-dependency-scanner';

// Default configuration
const DEFAULT_CONFIG = {
  allowedExtensions: ['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx', '.vue'],
  ignoreDirs: [
    'dist',
    '.turbo',
    'output',
    '.cache',
    'scripts',
    'internal',
    'packages/effects/request/src/',
    'packages/@core/ui-kit/menu-ui/src/',
    'packages/@core/ui-kit/popup-ui/src/',
  ],
  threshold: 0, // Threshold for circular dependencies
} as const;

// Type definitions
type CircularDependencyResult = string[];

interface CheckCircularConfig {
  allowedExtensions?: string[];
  ignoreDirs?: string[];
  threshold?: number;
}

interface CommandOptions {
  config?: CheckCircularConfig;
  staged: boolean;
  verbose: boolean;
}

// Cache mechanism
const cache = new Map<string, CircularDependencyResult[]>();

/**
 * Format the output of circular dependencies
 * @param circles - Circular dependency results
 */
function formatCircles(circles: CircularDependencyResult[]): void {
  if (circles.length === 0) {
    console.log('✅ No circular dependencies found');
    return;
  }

  console.log('⚠️ Circular dependencies found:');
  circles.forEach((circle, index) => {
    console.log(`\nCircular dependency #${index + 1}:`);
    circle.forEach((file) => console.log(`  → ${file}`));
  });
}

/**
 * Check circular dependencies in the project
 * @param options - Check options
 * @param options.staged - Whether to only check staged files
 * @param options.verbose - Whether to show detailed information
 * @param options.config - Custom configuration
 * @returns Promise<void>
 */
async function checkCircular({
  config = {},
  staged,
  verbose,
}: CommandOptions): Promise<void> {
  try {
    // Merge configuration
    const finalConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Generate ignore pattern
    const ignorePattern = `**/{${finalConfig.ignoreDirs.join(',')}}/**`;

    // Check cache
    const cacheKey = `${staged}-${process.cwd()}-${ignorePattern}`;
    if (cache.has(cacheKey)) {
      const cachedResults = cache.get(cacheKey);
      if (cachedResults) {
        verbose && formatCircles(cachedResults);
      }
      return;
    }

    // Detect circular dependencies
    const results = await circularDepsDetect({
      absolute: staged,
      cwd: process.cwd(),
      ignore: [ignorePattern],
    });

    if (staged) {
      let files = await getStagedFiles();
      const allowedExtensions = new Set(finalConfig.allowedExtensions);

      // Filter file list
      files = files.filter((file) => allowedExtensions.has(extname(file)));

      const circularFiles: CircularDependencyResult[] = [];

      for (const file of files) {
        for (const result of results) {
          const resultFiles = result.flat();
          if (resultFiles.includes(file)) {
            circularFiles.push(result);
          }
        }
      }

      // Update cache
      cache.set(cacheKey, circularFiles);
      verbose && formatCircles(circularFiles);
    } else {
      // Update cache
      cache.set(cacheKey, results);
      verbose && formatCircles(results);
    }

    // If circular dependencies are found, only output warning information
    if (results.length > 0) {
      console.log(
        '\n⚠️ Warning: Circular dependencies found, please check and fix',
      );
    }
  } catch (error) {
    console.error(
      '❌ Error checking circular dependencies:',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Define command for checking circular dependencies
 * @param cac - CAC instance
 */
function defineCheckCircularCommand(cac: CAC): void {
  cac
    .command('check-circular')
    .option('--staged', 'Only check staged files')
    .option('--verbose', 'Show detailed information')
    .option('--threshold <number>', 'Threshold for circular dependencies', {
      default: 0,
    })
    .option('--ignore-dirs <dirs>', 'Directories to ignore, comma separated')
    .usage('Analyze project circular dependencies')
    .action(async ({ ignoreDirs, staged, threshold, verbose }) => {
      const config: CheckCircularConfig = {
        threshold: Number(threshold),
        ...(ignoreDirs && { ignoreDirs: ignoreDirs.split(',') }),
      };

      await checkCircular({
        config,
        staged,
        verbose: verbose ?? true,
      });
    });
}

export { type CheckCircularConfig, defineCheckCircularCommand };
