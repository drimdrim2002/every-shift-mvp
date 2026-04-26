export type Phase2OpsEventName =
  | 'admin_bootstrap_provisioned'
  | 'organization_profile_confirmed'
  | 'site_config_saved'
  | 'employee_import_validated'
  | 'employee_roster_applied'
  | 'off_request_policy_saved'
  | 'policy_check_rejected'
  | 'fairness_ledger_write_attempted'
  | 'fairness_ledger_write_succeeded'
  | 'fairness_ledger_write_blocked'
  | 'checklist_gate_blocked';

export function emitPhase2OpsEvent(
  event: Phase2OpsEventName,
  payload: Record<string, unknown>
): void {
  console.info(
    JSON.stringify({
      event,
      payload,
      timestamp: new Date().toISOString(),
    })
  );
}
