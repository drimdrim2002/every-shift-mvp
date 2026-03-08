import type { User } from '@supabase/supabase-js'
import { supabase } from '@/api/supabase'
import type {
  AccountStatus,
  AuthContext,
  GlobalRole,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
} from '@/types/rbac'

const PROFILE_NOT_FOUND_ERROR_CODE = 'PGRST116'
const LEGACY_FALLBACK_ORGANIZATION_ID = 'legacy-default-org'

interface ProfileRow {
  id: string
  global_role: string
  account_status: string
}

interface MembershipRow {
  id: string
  organization_id: string
  role: string
  status: string
  approved_at: string | null
  created_at: string | null
  rejection_reason: string | null
}

function normalizeGlobalRole(value: unknown): GlobalRole {
  if (value === 'super' || value === 'admin' || value === 'user') {
    return value
  }
  return 'user'
}

function normalizeAccountStatus(value: unknown): AccountStatus {
  if (
    value === 'active' ||
    value === 'pending' ||
    value === 'rejected' ||
    value === 'suspended' ||
    value === 'withdrawn'
  ) {
    return value
  }
  return 'active'
}

function normalizeMembershipRole(value: unknown): OrganizationMembershipRole {
  return value === 'admin' ? 'admin' : 'user'
}

function normalizeMembershipStatus(value: unknown): OrganizationMembershipStatus {
  if (value === 'pending' || value === 'approved' || value === 'rejected' || value === 'withdrawn') {
    return value
  }

  return 'withdrawn'
}

function parseProfileFromMetadata(user: User) {
  const metadata = user.user_metadata ?? {}
  const globalRole = normalizeGlobalRole(metadata.global_role ?? metadata.globalRole)
  const accountStatus = normalizeAccountStatus(metadata.account_status ?? metadata.accountStatus)

  return {
    userId: user.id,
    globalRole,
    accountStatus,
  }
}

function createLegacyFallbackContext(user: User): AuthContext {
  const profile = parseProfileFromMetadata(user)

  if (profile.globalRole === 'super') {
    return {
      profile,
      memberships: [],
      currentOrganizationId: null,
    }
  }

  const metadata = user.user_metadata ?? {}
  const organizationId =
    typeof metadata.organization_id === 'string'
      ? metadata.organization_id
      : LEGACY_FALLBACK_ORGANIZATION_ID
  const role = normalizeMembershipRole(metadata.role)

  return {
    profile,
    memberships: [
      {
        organizationId,
        role,
        status: 'approved',
        approvedAt: null,
        createdAt: null,
        rejectionReason: null,
      },
    ],
    currentOrganizationId: organizationId,
  }
}

function isProfileNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const code = Reflect.get(error, 'code')
  return code === PROFILE_NOT_FOUND_ERROR_CODE
}

export async function fetchAuthContext(user: User): Promise<AuthContext> {
  const [profileResult, membershipResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, global_role, account_status')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from('organization_memberships')
      .select('id, organization_id, role, status, approved_at, created_at, rejection_reason')
      .eq('user_id', user.id)
      .returns<MembershipRow[]>(),
  ])

  if (profileResult.error && !isProfileNotFoundError(profileResult.error)) {
    throw profileResult.error
  }

  if (membershipResult.error) {
    throw membershipResult.error
  }

  const profileRow = profileResult.data
  const memberships = membershipResult.data ?? []

  if (!profileRow && memberships.length === 0) {
    return createLegacyFallbackContext(user)
  }

  const profile = profileRow
    ? {
        userId: profileRow.id,
        globalRole: normalizeGlobalRole(profileRow.global_role),
        accountStatus: normalizeAccountStatus(profileRow.account_status),
      }
    : parseProfileFromMetadata(user)

  const normalizedMemberships = memberships
    .map((membership) => ({
      membershipId: membership.id,
      organizationId: membership.organization_id,
      role: normalizeMembershipRole(membership.role),
      status: normalizeMembershipStatus(membership.status),
      approvedAt: membership.approved_at,
      createdAt: membership.created_at,
      rejectionReason: membership.rejection_reason,
    }))
    .filter((membership) => membership.organizationId)

  const currentOrganizationId =
    normalizedMemberships.find((membership) => membership.status === 'approved')?.organizationId ?? null

  if (normalizedMemberships.length === 0 && profile.globalRole !== 'super') {
    return createLegacyFallbackContext(user)
  }

  return {
    profile,
    memberships: normalizedMemberships,
    currentOrganizationId,
  }
}
