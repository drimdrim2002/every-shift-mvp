import fs from 'fs';

// Read and parse tasks.json
const data = JSON.parse(fs.readFileSync('.shrimp-data/tasks.json', 'utf8'));
const tasks = data.tasks;

console.log(`Total tasks loaded: ${tasks.length}\n`);

// Build task map for quick lookup
const taskMap = new Map();
tasks.forEach(task => {
  taskMap.set(task.id, task);
});

// Statistics
const statusCount = {};
const phaseCount = {};
tasks.forEach(task => {
  statusCount[task.status] = (statusCount[task.status] || 0) + 1;
  phaseCount[task.phase] = (phaseCount[task.phase] || 0) + 1;
});

console.log('=== SUMMARY STATISTICS ===');
console.log(`Total tasks: ${tasks.length}`);
console.log(`Completed tasks: ${statusCount.completed || 0}`);
console.log(`Pending tasks: ${statusCount.pending || 0}`);
console.log(`In Progress tasks: ${statusCount.in_progress || 0}`);
console.log('\nTasks by Phase:');
Object.entries(phaseCount).sort().forEach(([phase, count]) => {
  console.log(`  ${phase}: ${count}`);
});

// Build dependency graph
const graph = new Map(); // task -> [dependencies]
const reverseGraph = new Map(); // task -> [dependents]

tasks.forEach(task => {
  const deps = task.dependencies?.map(d => d.taskId) || [];
  graph.set(task.id, deps);
  if (!reverseGraph.has(task.id)) {
    reverseGraph.set(task.id, []);
  }
  deps.forEach(depId => {
    if (!reverseGraph.has(depId)) {
      reverseGraph.set(depId, []);
    }
    reverseGraph.get(depId).push(task.id);
  });
});

// Find missing dependencies
console.log('\n=== DEPENDENCY ISSUES ===');
const missingDeps = [];
tasks.forEach(task => {
  task.dependencies?.forEach(dep => {
    if (!taskMap.has(dep.taskId)) {
      missingDeps.push({
        taskId: task.id,
        taskName: task.name,
        missingDepId: dep.taskId
      });
    }
  });
});

if (missingDeps.length > 0) {
  console.log(`Missing dependency targets: ${missingDeps.length}`);
  missingDeps.forEach(({ taskId, taskName, missingDepId }) => {
    console.log(`  - Task ${taskId} (${taskName}) depends on non-existent ${missingDepId}`);
  });
} else {
  console.log('Missing dependency targets: 0');
}

// Detect cycles using DFS
function detectCycles() {
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function dfs(nodeId, path) {
    if (recStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      cycles.push(path.slice(cycleStart));
      return true;
    }
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const deps = graph.get(nodeId) || [];
    for (const depId of deps) {
      if (taskMap.has(depId)) {
        dfs(depId, [...path]);
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  tasks.forEach(task => {
    if (!visited.has(task.id)) {
      dfs(task.id, []);
    }
  });

  return cycles;
}

const cycles = detectCycles();
if (cycles.length > 0) {
  console.log(`Circular dependencies found: ${cycles.length}`);
  cycles.forEach((cycle, idx) => {
    console.log(`  Cycle ${idx + 1}: ${cycle.join(' -> ')}`);
  });
} else {
  console.log('Circular dependencies: None (DAG is valid)');
}

// Topological sort (Kahn's algorithm)
function topologicalSort() {
  const inDegree = new Map();
  tasks.forEach(task => {
    inDegree.set(task.id, 0);
  });

  tasks.forEach(task => {
    task.dependencies?.forEach(dep => {
      if (taskMap.has(dep.taskId)) {
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    });
  });

  const queue = [];
  tasks.forEach(task => {
    if (inDegree.get(task.id) === 0) {
      queue.push(task.id);
    }
  });

  const result = [];
  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);

    const dependents = reverseGraph.get(current) || [];
    dependents.forEach(dependentId => {
      inDegree.set(dependentId, inDegree.get(dependentId) - 1);
      if (inDegree.get(dependentId) === 0) {
        queue.push(dependentId);
      }
    });
  }

  return result;
}

const sortedOrder = topologicalSort();
console.log(`\n=== EXECUTION ORDER (Topological Sort) ===`);
console.log(`Total tasks in order: ${sortedOrder.length}`);
console.log('\nFirst 30 tasks (no/minimal dependencies):');
sortedOrder.slice(0, 30).forEach((id, idx) => {
  const task = taskMap.get(id);
  const depCount = task.dependencies?.length || 0;
  console.log(`  ${idx + 1}. [${task.phase}] ${task.id}: ${task.name} (deps: ${depCount})`);
});

if (sortedOrder.length > 30) {
  console.log(`\n... (${sortedOrder.length - 30} more tasks)`);
}

// Find critical path (longest path in DAG)
function findCriticalPath() {
  const dist = new Map();
  const predecessor = new Map();

  // Initialize
  tasks.forEach(task => {
    dist.set(task.id, 0);
    predecessor.set(task.id, null);
  });

  // Process in topological order
  for (const taskId of sortedOrder) {
    const currentDist = dist.get(taskId);
    
    const dependents = reverseGraph.get(taskId) || [];
    dependents.forEach(dependentId => {
      const newDist = currentDist + 1;
      if (newDist > dist.get(dependentId)) {
        dist.set(dependentId, newDist);
        predecessor.set(dependentId, taskId);
      }
    });
  }

  // Find the node with maximum distance
  let maxDist = 0;
  let endNode = null;
  tasks.forEach(task => {
    if (dist.get(task.id) > maxDist) {
      maxDist = dist.get(task.id);
      endNode = task.id;
    }
  });

  // Reconstruct path
  const path = [];
  let current = endNode;
  while (current !== null) {
    path.unshift(current);
    current = predecessor.get(current);
  }

  return { path, length: path.length };
}

const criticalPath = findCriticalPath();
console.log(`\n=== CRITICAL PATH ===`);
console.log(`Longest dependency chain: ${criticalPath.length} tasks`);
console.log('\nCritical path tasks:');
criticalPath.path.forEach((id, idx) => {
  const task = taskMap.get(id);
  console.log(`  ${idx + 1}. [${task.phase}] ${task.name}`);
});

// Group tasks by phase with dependency order
console.log('\n=== TASKS BY PHASE (in dependency order) ===');
const phaseOrder = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
phaseOrder.forEach(phase => {
  const phaseTasks = sortedOrder.filter(id => taskMap.get(id).phase === phase);
  if (phaseTasks.length > 0) {
    console.log(`\n${phase} (${phaseTasks.length} tasks):`);
    phaseTasks.forEach((id, idx) => {
      const task = taskMap.get(id);
      const status = task.status;
      console.log(`  ${idx + 1}. [${status}] ${task.id.substring(0, 8)}... - ${task.name}`);
    });
  }
});

// Find root tasks (no dependencies)
const rootTasks = sortedOrder.filter(id => {
  const task = taskMap.get(id);
  return !task.dependencies || task.dependencies.length === 0;
});

console.log(`\n=== ROOT TASKS (no dependencies) ===`);
console.log(`Total root tasks: ${rootTasks.length}`);
rootTasks.forEach(id => {
  const task = taskMap.get(id);
  console.log(`  - [${task.phase}] ${task.name}`);
});

// Find leaf tasks (no dependents)
const leafTasks = sortedOrder.filter(id => {
  return !reverseGraph.get(id) || reverseGraph.get(id).length === 0;
});

console.log(`\n=== LEAF TASKS (no tasks depend on them) ===`);
console.log(`Total leaf tasks: ${leafTasks.length}`);
leafTasks.forEach(id => {
  const task = taskMap.get(id);
  console.log(`  - [${task.phase}] ${task.name}`);
});

// Save full execution order to file
const fullOrder = sortedOrder.map((id, idx) => {
  const task = taskMap.get(id);
  return {
    order: idx + 1,
    id: task.id,
    name: task.name,
    phase: task.phase,
    status: task.status,
    dependencies: task.dependencies?.length || 0
  };
});

fs.writeFileSync('task-execution-order.json', JSON.stringify(fullOrder, null, 2));
console.log(`\n=== OUTPUT ===`);
console.log('Full execution order saved to: task-execution-order.json');
