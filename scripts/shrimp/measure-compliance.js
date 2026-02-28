import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tasksFile = path.join(__dirname, '../../.shrimp-data/tasks.json');
const data = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
const tasks = data.tasks;
const totalTasks = tasks.length;

const namePattern = new RegExp("^P\\d+-\\d+\\.\\d+(?:\\.\\d+)?\\s+.+$");

let nameCompliantCount = 0;
let vcCompliantCount = 0;

tasks.forEach(t => {
  if (namePattern.test(t.name)) {
    nameCompliantCount++;
  }
  
  const vc = t.verificationCriteria || "";
  if (vc.includes("Deliverable:") && vc.includes("Method:") && vc.includes("Pass:")) {
    vcCompliantCount++;
  }
});

const nameComplianceRate = ((nameCompliantCount / totalTasks) * 100).toFixed(2);
const vcComplianceRate = ((vcCompliantCount / totalTasks) * 100).toFixed(2);

const report = `
=============================================
Shrimp Task Compliance Report
=============================================
Total Tasks: ${totalTasks}

1. Name Pattern Compliance (^P\\d+-\\d+\\.\\d+(?:\\.\\d+)?\\s+.+$)
   - Compliant: ${nameCompliantCount} / ${totalTasks}
   - Rate: ${nameComplianceRate}%
   - Target: 100%
   - Status: ${nameComplianceRate >= 100 ? '✅ PASS' : '❌ FAIL'}

2. Verification Criteria Compliance (Deliverable/Method/Pass)
   - Compliant: ${vcCompliantCount} / ${totalTasks}
   - Rate: ${vcComplianceRate}%
   - Target: >= 90%
   - Status: ${vcComplianceRate >= 90 ? '✅ PASS' : '❌ FAIL'}
=============================================
`;

console.log(report);
fs.writeFileSync(path.join(__dirname, '../../.shrimp-data/compliance_report.txt'), report);
console.log("Report saved to .shrimp-data/compliance_report.txt");
