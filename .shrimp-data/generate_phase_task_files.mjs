import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const sourcePath = path.join(rootDir, '.shrimp-data', 'tasks.json')
const outputDir = path.join(rootDir, '.shrimp-data', 'tasks')
const indexPath = path.join(outputDir, 'phase-pending-index.json')

function comparePhase(a, b) {
  return Number(a.replace('P', '')) - Number(b.replace('P', ''))
}

function getPhaseFileName(phase) {
  const phaseNumber = phase.replace('P', '')
  return `phase${phaseNumber}-pending-tasks.json`
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
const pendingTasks = source.tasks.filter((task) => task.status !== 'completed')
const phases = [...new Set(pendingTasks.map((task) => task.phase))].sort(comparePhase)

const index = {
  source: '.shrimp-data/tasks.json',
  generatedAt: new Date().toISOString(),
  pendingOnly: true,
  totalTasks: pendingTasks.length,
  phases: [],
}

for (const phase of phases) {
  const phaseTasks = pendingTasks.filter((task) => task.phase === phase)
  const fileName = getPhaseFileName(phase)
  const filePath = path.join(outputDir, fileName)

  fs.writeFileSync(filePath, `${JSON.stringify({ tasks: phaseTasks }, null, 2)}\n`)

  index.phases.push({
    phase,
    file: `.shrimp-data/tasks/${fileName}`,
    taskCount: phaseTasks.length,
  })
}

fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`)

console.log(
  JSON.stringify(
    {
      generatedFiles: index.phases.length,
      totalTasks: index.totalTasks,
      index: '.shrimp-data/tasks/phase-pending-index.json',
    },
    null,
    2
  )
)
