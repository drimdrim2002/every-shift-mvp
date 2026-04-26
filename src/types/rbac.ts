export type GlobalRole = 'super' | 'admin' | 'user'

export type AccountStatus = 'active' | 'pending' | 'rejected' | 'suspended' | 'withdrawn'

export type OrganizationMembershipRole = 'admin' | 'user'

export type OrganizationMembershipStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'

export type AccessState =
  | 'unauthenticated'
  | 'super_active'
  | 'admin_active'
  | 'admin_pending'
  | 'admin_rejected'
  | 'user_active'
  | 'no_membership_or_inactive'

export type MembershipSelectionSource =
  | 'current_organization'
  | 'role_priority'
  | 'status_fallback'
  | 'legacy_fallback'

export interface AuthContextProfile {
  userId: string
  globalRole: GlobalRole
  accountStatus: AccountStatus
}

export interface AuthContextMembership {
  membershipId?: string
  organizationId: string
  organizationName?: string | null
  role: OrganizationMembershipRole
  status: OrganizationMembershipStatus
  approvedAt?: string | null
  createdAt?: string | null
  rejectionReason?: string | null
}

export interface AuthContext {
  profile: AuthContextProfile
  memberships: AuthContextMembership[]
  currentOrganizationId?: string | null
}

export interface EffectiveMembership extends AuthContextMembership {
  selectionSource: MembershipSelectionSource
}

export interface AccessResolution {
  accessState: AccessState
  effectiveMembership: EffectiveMembership | null
}

export interface AccessAbilities {
  canViewApprovalQueue: boolean
  canSwitchOrganization: boolean
  canViewRestrictedUserHome: boolean
  canManageOrganizationSetup: boolean
  canManageEmployees: boolean
  canManageSchedules: boolean
}

export interface BuildAccessAbilitiesInput {
  accessState: AccessState
  selectedOrganizationId: string | null
  effectiveMembership: EffectiveMembership | null
}

export interface OrganizationOption {
  id: string
  name: string
  membershipRole: OrganizationMembershipRole | null
}

export interface PickDefaultOrganizationIdInput {
  accessState: AccessState
  memberships: AuthContextMembership[]
  persistedOrganizationId: string | null
}

export interface ResolveAccessStateInput {
  sessionUserId?: string | null
  context: AuthContext | null
  selectedOrganizationId?: string | null
  fallbackLegacyOrganizationId?: string | null
}
