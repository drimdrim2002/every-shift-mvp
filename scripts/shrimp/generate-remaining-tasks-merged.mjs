#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_INPUT = '.shrimp-data/tasks.json';
const DEFAULT_OUTPUT = 'docs/migration/REMAINING_TASKS_MERGED.md';
const KNOWN_PHASES = Array.from({ length: 11 }, (_, i) => `P${i}`);
const STATUS_ORDER = ['completed', 'in_progress', 'pending'];

function parseArgs(argv) {
  const args = {
    mode: 'write',
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--mode') {
      args.mode = argv[i + 1];
      i += 1;
    } else if (token === '--input') {
      args.input = argv[i + 1];
      i += 1;
    } else if (token === '--output') {
      args.output = argv[i + 1];
      i += 1;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  node scripts/shrimp/generate-remaining-tasks-merged.mjs --mode <write|check> [--input <path>] [--output <path>]',
      '',
      'Modes:',
      '  write  Generate and overwrite output markdown file.',
      '  check  Compare generated content with output file and fail on mismatch.',
    ].join('\n'),
  );
}

function cleanText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/\r\n/g, '\n').replace(/\n+/g, ' ').trim();
}

function escapeCell(value) {
  return cleanText(value).replace(/\|/g, '\\|');
}

function formatMinutesCompact(minutes) {
  if (!Number.isFinite(minutes)) {
    return '-';
  }
  return `${minutes}m`;
}

function formatMinutesKorean(minutes) {
  if (!Number.isFinite(minutes)) {
    return '-';
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시간 ${m}분`;
}

function extractTaskCode(name) {
  const first = cleanText(name).split(/\s+/)[0] ?? '';
  return /^P\d+-/.test(first) ? first : '';
}

function parseTaskCode(name) {
  const code = extractTaskCode(name);
  const match = code.match(/^P(\d+)-(.+)$/);
  if (!match) {
    return null;
  }

  const phaseNum = Number(match[1]);
  const parts = match[2].split(/[.-]/).map((part) => {
    if (/^\d+$/.test(part)) {
      return Number(part);
    }
    return part;
  });

  return {
    phaseNum,
    parts,
    raw: code,
  };
}

function compareParsedCodes(a, b) {
  if (a && b) {
    if (a.phaseNum !== b.phaseNum) {
      return a.phaseNum - b.phaseNum;
    }

    const maxLen = Math.max(a.parts.length, b.parts.length);
    for (let i = 0; i < maxLen; i += 1) {
      const av = a.parts[i];
      const bv = b.parts[i];
      if (av === undefined) {
        return -1;
      }
      if (bv === undefined) {
        return 1;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av !== bv) {
          return av - bv;
        }
      } else if (String(av) !== String(bv)) {
        return String(av).localeCompare(String(bv));
      }
    }
    return 0;
  }

  if (a && !b) {
    return -1;
  }
  if (!a && b) {
    return 1;
  }
  return 0;
}

function resolvePhase(task) {
  const phase = cleanText(task.phase);
  if (/^P\d+$/.test(phase)) {
    return phase;
  }
  const code = parseTaskCode(task.name);
  if (code) {
    return `P${code.phaseNum}`;
  }
  return 'Unknown';
}

function ensureTaskShape(task) {
  const required = ['id', 'name', 'status'];
  const missing = required.filter((key) => !(key in task));
  if (missing.length > 0) {
    throw new Error(`Task ${task.id ?? '<unknown>'} missing required fields: ${missing.join(', ')}`);
  }
  if (!Array.isArray(task.dependencies)) {
    task.dependencies = [];
  }
  if (!Number.isFinite(task.estimatedMinutes)) {
    task.estimatedMinutes = null;
  }
}

function collectGraphMetrics(tasks, idToTask) {
  const missingTargets = [];
  const adj = new Map();
  const incoming = new Map();

  for (const task of tasks) {
    adj.set(task.id, []);
    incoming.set(task.id, 0);
  }

  for (const task of tasks) {
    for (const dep of task.dependencies) {
      const depId = dep?.taskId;
      if (typeof depId !== 'string' || depId.length === 0) {
        continue;
      }
      if (!idToTask.has(depId)) {
        missingTargets.push({ from: task.id, to: depId });
        continue;
      }
      adj.get(depId).push(task.id);
      incoming.set(task.id, (incoming.get(task.id) ?? 0) + 1);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  let hasCycle = false;

  function dfs(id) {
    if (visiting.has(id)) {
      hasCycle = true;
      return;
    }
    if (visited.has(id) || hasCycle) {
      return;
    }
    visiting.add(id);
    for (const next of adj.get(id) ?? []) {
      dfs(next);
      if (hasCycle) {
        return;
      }
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id);
      if (hasCycle) {
        break;
      }
    }
  }

  const orphanRoots = tasks.filter((task) => {
    const hasDeps = task.dependencies.length > 0;
    const hasIncoming = (incoming.get(task.id) ?? 0) > 0;
    return !hasDeps && !hasIncoming;
  });

  return {
    missingTargets,
    hasCycle,
    orphanRoots,
  };
}

function getDependencyLabels(task, idToTask) {
  if (!Array.isArray(task.dependencies) || task.dependencies.length === 0) {
    return '-';
  }
  const labels = task.dependencies
    .map((dep) => dep?.taskId)
    .filter((taskId) => typeof taskId === 'string' && taskId.length > 0)
    .map((taskId) => {
      const target = idToTask.get(taskId);
      if (!target) {
        return `MISSING(${taskId})`;
      }
      const code = extractTaskCode(target.name);
      return code || target.id;
    });
  return labels.length > 0 ? labels.join('<br>') : '-';
}

function renderRecentSummary(tasksByPhase, tasks, metrics, inputPath, sourceTimestamp) {
  const sourceDate = new Date(sourceTimestamp);
  const dateStamp = sourceDate.toISOString().slice(0, 10);
  const utcStamp = sourceDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

  const statusCounts = new Map();
  for (const status of STATUS_ORDER) {
    statusCounts.set(status, 0);
  }
  let otherCount = 0;

  for (const task of tasks) {
    if (statusCounts.has(task.status)) {
      statusCounts.set(task.status, statusCounts.get(task.status) + 1);
    } else {
      otherCount += 1;
    }
  }

  const phaseSummaries = [];
  for (const phase of [...KNOWN_PHASES, ...Array.from(tasksByPhase.keys()).filter((p) => !KNOWN_PHASES.includes(p)).sort()]) {
    const phaseTasks = tasksByPhase.get(phase);
    if (!phaseTasks || phaseTasks.length === 0) {
      continue;
    }
    const completed = phaseTasks.filter((t) => t.status === 'completed').length;
    const inProgress = phaseTasks.filter((t) => t.status === 'in_progress').length;
    const pending = phaseTasks.filter((t) => t.status === 'pending').length;
    phaseSummaries.push(`- ${phase}: C/IP/P/T = ${completed}/${inProgress}/${pending}/${phaseTasks.length}`);
  }

  return [
    `## 최근 반영 내역 (${dateStamp} 기준)`,
    '',
    `- 기준 소스: \`${inputPath}\` (canonical)`,
    `- 기준 데이터 수정 시각(UTC): ${utcStamp}`,
    `- 전체 태스크: ${tasks.length} (completed=${statusCounts.get('completed')}, in_progress=${statusCounts.get('in_progress')}, pending=${statusCounts.get('pending')}, other=${otherCount})`,
    `- DAG 정합성 확인: missing target=${metrics.missingTargets.length}, cycle=${metrics.hasCycle}, orphan root=${metrics.orphanRoots.length}`,
    '- Phase 상태 요약:',
    ...phaseSummaries,
    '',
  ].join('\n');
}

function renderPhaseSection(phase, tasks, idToTask) {
  const totalMinutes = tasks
    .map((task) => task.estimatedMinutes)
    .filter(Number.isFinite)
    .reduce((acc, minutes) => acc + minutes, 0);

  const lines = [];
  lines.push(`## ${phase} (예상 시간: ${formatMinutesKorean(totalMinutes)})`);
  lines.push('');
  lines.push('### 요약 (Summary)');
  lines.push('');
  lines.push('| Task ID | 태스크 명 | 상태 | 선행 태스크(Dependencies) | 예상 시간 |');
  lines.push('| --- | --- | --- | --- | --- |');

  for (const task of tasks) {
    const status = cleanText(task.status) || '-';
    const deps = getDependencyLabels(task, idToTask);
    lines.push(
      `| \`${task.id}\` | **${escapeCell(task.name)}** | ${escapeCell(status)} | ${escapeCell(deps)} | ${formatMinutesCompact(task.estimatedMinutes)} |`,
    );
  }

  lines.push('');
  lines.push('### 상세 (Details)');
  lines.push('');

  for (const task of tasks) {
    const statusBase = cleanText(task.status) || '-';
    const completedAt = cleanText(task.completedAt);
    const statusText = statusBase === 'completed' && completedAt ? `${statusBase} (${completedAt.slice(0, 10)})` : statusBase;
    const relatedFiles = Array.isArray(task.relatedFiles)
      ? task.relatedFiles
          .map((file) => cleanText(file?.path))
          .filter(Boolean)
          .map((filePath) => `\`${filePath}\``)
      : [];

    lines.push(`### ${cleanText(task.name)}`);
    lines.push('');
    lines.push(`- **Task ID**: \`${task.id}\``);
    lines.push(`- **현재 상태(Status)**: ${statusText}`);

    if (cleanText(task.summary)) {
      lines.push(`- **완료 요약(Summary)**: ${cleanText(task.summary)}`);
    }

    lines.push(`- **설명(Description)**: ${cleanText(task.description) || '-'}`);
    lines.push(`- **구현 가이드(Guide)**: ${cleanText(task.implementationGuide) || '-'}`);
    lines.push(`- **검증 기준(Verification)**: ${cleanText(task.verificationCriteria) || '-'}`);
    lines.push(`- **선행 조건(Dependencies)**: ${getDependencyLabels(task, idToTask)}`);
    lines.push(`- **예상 소요 시간**: ${formatMinutesCompact(task.estimatedMinutes)}`);
    lines.push(`- **관련 파일**: ${relatedFiles.length > 0 ? relatedFiles.join(', ') : '-'}`);

    if (cleanText(task.notes)) {
      lines.push(`- **노트(Notes)**: ${cleanText(task.notes)}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

function buildDocument(data, inputPath, sourceTimestamp) {
  if (!data || !Array.isArray(data.tasks)) {
    throw new Error('Invalid tasks json format: `.tasks` array is required.');
  }

  const tasks = data.tasks.map((task) => ({ ...task }));
  for (const task of tasks) {
    ensureTaskShape(task);
    task.phase = resolvePhase(task);
  }

  const idToTask = new Map(tasks.map((task) => [task.id, task]));
  const metrics = collectGraphMetrics(tasks, idToTask);

  if (metrics.missingTargets.length > 0) {
    const preview = metrics.missingTargets
      .slice(0, 5)
      .map((item) => `${item.from} -> ${item.to}`)
      .join(', ');
    throw new Error(`Dependency missing targets detected (${metrics.missingTargets.length}): ${preview}`);
  }
  if (metrics.hasCycle) {
    throw new Error('Dependency cycle detected in tasks graph.');
  }

  const tasksByPhase = new Map();
  for (const task of tasks) {
    if (!tasksByPhase.has(task.phase)) {
      tasksByPhase.set(task.phase, []);
    }
    tasksByPhase.get(task.phase).push(task);
  }

  for (const phaseTasks of tasksByPhase.values()) {
    phaseTasks.sort((a, b) => {
      const codeCmp = compareParsedCodes(parseTaskCode(a.name), parseTaskCode(b.name));
      if (codeCmp !== 0) {
        return codeCmp;
      }
      const nameCmp = cleanText(a.name).localeCompare(cleanText(b.name));
      if (nameCmp !== 0) {
        return nameCmp;
      }
      return String(a.id).localeCompare(String(b.id));
    });
  }

  const orderedPhases = [
    ...KNOWN_PHASES.filter((phase) => tasksByPhase.has(phase)),
    ...Array.from(tasksByPhase.keys())
      .filter((phase) => !KNOWN_PHASES.includes(phase))
      .sort(),
  ];

  const sectionBlocks = orderedPhases.map((phase) => renderPhaseSection(phase, tasksByPhase.get(phase), idToTask));
  const totalMinutes = tasks
    .map((task) => task.estimatedMinutes)
    .filter(Number.isFinite)
    .reduce((acc, minutes) => acc + minutes, 0);

  return [
    '# 통합 남은 태스크 목록 (Combined Remaining Tasks)',
    '',
    '이 문서는 `.shrimp-data/tasks.json`을 단일 기준(source of truth)으로 하여 자동 생성됩니다.',
    '',
    renderRecentSummary(tasksByPhase, tasks, metrics, inputPath, sourceTimestamp),
    ...sectionBlocks.flatMap((block) => [block, '']),
    '---',
    '',
    `**총 예상 소요 시간:** 약 ${formatMinutesKorean(totalMinutes)}`,
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  if (!['write', 'check'].includes(args.mode)) {
    throw new Error(`Invalid --mode "${args.mode}". Use "write" or "check".`);
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  const outputPath = path.resolve(process.cwd(), args.output);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(raw);
  const sourceStat = fs.statSync(inputPath);
  const generated = buildDocument(data, args.input, sourceStat.mtime.toISOString());

  if (args.mode === 'write') {
    fs.writeFileSync(outputPath, generated, 'utf8');
    console.log(`Generated: ${path.relative(process.cwd(), outputPath)}`);
    return;
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Output file not found for check mode: ${outputPath}`);
  }

  const current = fs.readFileSync(outputPath, 'utf8');
  if (current !== generated) {
    console.error('REMAINING_TASKS_MERGED.md is out of sync with .shrimp-data/tasks.json.');
    console.error('Run: pnpm shrimp:remaining:generate');
    process.exit(1);
  }

  console.log(`Up-to-date: ${path.relative(process.cwd(), outputPath)}`);
}

try {
  main();
} catch (error) {
  console.error(`[generate-remaining-tasks-merged] ${error.message}`);
  process.exit(1);
}
