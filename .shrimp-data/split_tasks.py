import json
import os
import shutil

tasks_file = '.shrimp-data/tasks.json'
with open(tasks_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

tasks = data.get('tasks', [])

# Group by phase
phases = {}
for t in tasks:
    phase = t.get('phase', 'UNKNOWN')
    if phase not in phases:
        phases[phase] = []
    phases[phase].append(t)

# Determine phase status
def sort_key(p):
    if p.startswith('P'):
        try:
            return int(p.split('-')[0][1:]) # Handle P0, P1, P0-1 etc. if any. Usually just "P0"
        except:
            pass
    return 999

sorted_phases = sorted(phases.keys(), key=sort_key)

active_phase = None
phase_status = {}

for p in sorted_phases:
    ptasks = phases[p]
    statuses = [t.get('status', 'pending') for t in ptasks]
    
    # Check if this phase has any 'in_progress' tasks
    has_in_progress = 'in_progress' in statuses
    # Check if fully completed
    all_completed = all(s == 'completed' for s in statuses)
    
    if all_completed:
        phase_status[p] = 'completed'
    else:
        if active_phase is None:
            active_phase = p
            phase_status[p] = 'active'
        else:
            phase_status[p] = 'todo'

os.makedirs('.shrimp-data/todo', exist_ok=True)
os.makedirs('.shrimp-data/completed', exist_ok=True)

# Backup original tasks.json
shutil.copy('.shrimp-data/tasks.json', '.shrimp-data/tasks.json.full.bak')

print(f"Active phase: {active_phase}")

for p in sorted_phases:
    ptasks = phases[p]
    out_data = {"tasks": ptasks}
    
    if phase_status[p] == 'active':
        out_path = '.shrimp-data/tasks.json'
    elif phase_status[p] == 'completed':
        out_path = f'.shrimp-data/completed/{p}.json'
    else:
        out_path = f'.shrimp-data/todo/{p}.json'
    
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, ensure_ascii=False, indent=2)
    print(f"Phase {p}: {len(ptasks)} tasks -> {out_path}")

print("Done.")
