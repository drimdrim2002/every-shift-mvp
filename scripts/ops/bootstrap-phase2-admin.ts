type BootstrapFlags = {
  createPilotSite: boolean;
  seedOrganizationSettings: boolean;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n'].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

function readArgs(): {
  organizationId: string;
  targetEmail: string;
  displayName: string;
  flags: BootstrapFlags;
} {
  const [organizationId, targetEmail, displayName, createPilotSite, seedOrganizationSettings] =
    process.argv.slice(2);

  if (!organizationId || !targetEmail || !displayName) {
    throw new Error(
      'Usage: node scripts/ops/bootstrap-phase2-admin.ts <organizationId> <targetEmail> <displayName> [createPilotSite] [seedOrganizationSettings]'
    );
  }

  return {
    organizationId,
    targetEmail,
    displayName,
    flags: {
      createPilotSite: parseBoolean(createPilotSite, true),
      seedOrganizationSettings: parseBoolean(seedOrganizationSettings, true),
    },
  };
}

async function main(): Promise<void> {
  const supabaseUrl = readRequiredEnv('SUPABASE_URL');
  const operatorAccessToken = readRequiredEnv('PHASE2_OPS_OPERATOR_ACCESS_TOKEN');
  const { organizationId, targetEmail, displayName, flags } = readArgs();

  const response = await fetch(`${supabaseUrl}/functions/v1/phase2-ops/bootstrap-admin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${operatorAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      organizationId,
      targetEmail,
      displayName,
      onboardingInitializationFlags: flags,
    }),
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`bootstrap-admin failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
