type SignupRole = 'admin' | 'user'
type SignupPath = 'admin_submit' | 'user_invite_redeem'
type SignupNextState = 'pending_approval' | 'active'
type SignupRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'withdrawn'
type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'none'
type SignupErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_INVITE_CODE'
  | 'DUPLICATE_REQUEST'
  | 'INTERNAL_ERROR'
type InviteInvalidReason =
  | 'INVITE_NOT_FOUND'
  | 'INVITE_EXPIRED'
  | 'INVITE_ALREADY_USED'
  | 'INVITE_REVOKED'
  | 'INVITE_ROLE_MISMATCH'

export interface SignupSubmitRequest {
  email?: unknown
  password?: unknown
  name?: unknown
  role?: unknown
  requestedRole?: unknown
  inviteCode?: unknown
  organizationSelectionMode?: unknown
  hospitalId?: unknown
  hospitalName?: unknown
  hospitalSource?: unknown
  organizationId?: unknown
}

export interface SignupSubmitSuccessData {
  path: SignupPath
  nextState: SignupNextState
  signupRequestStatus: SignupRequestStatus
  membershipStatus: MembershipStatus
  signupRequestId?: string
  organizationId?: string
}

interface AuthAdminUser {
  id?: string
}

interface ServiceErrorLike {
  message: string
  code?: string
}

interface ServiceClient {
  auth: {
    admin: {
      createUser(payload: Record<string, unknown>): Promise<{
        data: {
          user: AuthAdminUser | null
        }
        error: ServiceErrorLike | null
      }>
      deleteUser(userId: string): Promise<{
        data: {
          user: AuthAdminUser | null
        }
        error: ServiceErrorLike | null
      }>
    }
  }
  rpc(
    fn: string,
    params: Record<string, unknown>,
  ): Promise<{
    data: unknown
    error: ServiceErrorLike | null
  }>
  from(table: 'invite_codes'): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{
          data: InviteCodeRow | null
          error: ServiceErrorLike | null
        }>
      }
    }
  }
  from(table: 'organizations'): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          limit(count: number): Promise<{
            data: OrganizationLookupRow[] | null
            error: ServiceErrorLike | null
          }>
        }
      }
    }
    insert(payload: {
      name: string
      type: 'hospital'
    }): {
      select(columns: string): {
        single(): Promise<{
          data: OrganizationLookupRow | null
          error: ServiceErrorLike | null
        }>
      }
    }
  }
}

interface InviteCodeRow {
  organization_id: string
  role_scope: string
  expires_at: string
  max_uses: number
  used_count: number
  used_at: string | null
  used_by: string | null
  revoked_at: string | null
}

interface OrganizationLookupRow {
  id?: string
}

interface InviteValidationValid {
  type: 'valid'
  organizationId: string
  codeHash: string
}

interface InviteValidationInvalid {
  type: 'invalid'
  reason: InviteInvalidReason
}

interface InviteValidationInternalError {
  type: 'internal_error'
  message: string
}

type InviteValidationResult =
  | InviteValidationValid
  | InviteValidationInvalid
  | InviteValidationInternalError

interface SignupSubmitDependencies {
  validateInviteCode?: (
    client: ServiceClient,
    inviteCode: string,
  ) => Promise<InviteValidationResult>
  resolveAdminOrganizationId?: (
    client: ServiceClient,
    hospitalId: string,
    hospitalName: string,
  ) => Promise<string>
}

interface AdminSignupRpcRow {
  signup_request_id: string
  organization_id: string
}

interface UserInviteRpcRow {
  signup_request_id: string
  membership_id: string
  organization_id: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MIN_PASSWORD_LENGTH = 8
const HOSPITAL_SOURCE = 'data.go.kr'

const SIGNUP_ERROR_MESSAGES: Record<SignupErrorCode, string> = {
  VALIDATION_ERROR: '입력값을 다시 확인해주세요.',
  INVALID_INVITE_CODE: '초대코드가 유효하지 않습니다.',
  DUPLICATE_REQUEST: '동일한 가입 신청이 이미 접수되어 있습니다.',
  INTERNAL_ERROR: '회원가입 처리 중 오류가 발생했습니다.',
}

export class SignupSubmitServiceError extends Error {
  code: SignupErrorCode
  status: number
  details?: Record<string, unknown>

  constructor(
    code: SignupErrorCode,
    message = SIGNUP_ERROR_MESSAGES[code],
    status = 400,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'SignupSubmitServiceError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function normalizeRole(payload: SignupSubmitRequest): SignupRole | null {
  const rawRole = payload.role ?? payload.requestedRole
  return rawRole === 'admin' || rawRole === 'user' ? rawRole : null
}

function resolveOrganizationId(payload: SignupSubmitRequest): string | null {
  return asNonEmptyString(payload.hospitalId) ?? asNonEmptyString(payload.organizationId)
}

function requireCommonFields(payload: SignupSubmitRequest) {
  const email = asNonEmptyString(payload.email)
  const password = asNonEmptyString(payload.password)
  const name = asNonEmptyString(payload.name)

  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new SignupSubmitServiceError('VALIDATION_ERROR', SIGNUP_ERROR_MESSAGES.VALIDATION_ERROR, 400, {
      field: 'email',
    })
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new SignupSubmitServiceError('VALIDATION_ERROR', SIGNUP_ERROR_MESSAGES.VALIDATION_ERROR, 400, {
      field: 'password',
      minLength: MIN_PASSWORD_LENGTH,
    })
  }

  if (!name) {
    throw new SignupSubmitServiceError('VALIDATION_ERROR', SIGNUP_ERROR_MESSAGES.VALIDATION_ERROR, 400, {
      field: 'name',
    })
  }

  const selectionMode = asNonEmptyString(payload.organizationSelectionMode)
  if (selectionMode && selectionMode !== 'existing') {
    throw new SignupSubmitServiceError('VALIDATION_ERROR', SIGNUP_ERROR_MESSAGES.VALIDATION_ERROR, 400, {
      field: 'organizationSelectionMode',
      expected: 'existing',
    })
  }

  return {
    email,
    password,
    name,
  }
}

function requireAdminFields(payload: SignupSubmitRequest) {
  const organizationId = resolveOrganizationId(payload)
  const hospitalName = asNonEmptyString(payload.hospitalName)
  const hospitalSource = asNonEmptyString(payload.hospitalSource)

  if (!organizationId) {
    throw new SignupSubmitServiceError('VALIDATION_ERROR', SIGNUP_ERROR_MESSAGES.VALIDATION_ERROR, 400, {
      field: 'hospitalId',
    })
  }

  if (!hospitalName) {
    throw new SignupSubmitServiceError('VALIDATION_ERROR', SIGNUP_ERROR_MESSAGES.VALIDATION_ERROR, 400, {
      field: 'hospitalName',
    })
  }

  if (hospitalSource !== HOSPITAL_SOURCE) {
    throw new SignupSubmitServiceError('VALIDATION_ERROR', SIGNUP_ERROR_MESSAGES.VALIDATION_ERROR, 400, {
      field: 'hospitalSource',
      expected: HOSPITAL_SOURCE,
    })
  }

  return {
    organizationId,
    hospitalName,
  }
}

function getInviteInvalidMessage(reason: InviteInvalidReason): string {
  switch (reason) {
    case 'INVITE_EXPIRED':
    case 'INVITE_ALREADY_USED':
    case 'INVITE_REVOKED':
    case 'INVITE_ROLE_MISMATCH':
    case 'INVITE_NOT_FOUND':
    default:
      return SIGNUP_ERROR_MESSAGES.INVALID_INVITE_CODE
  }
}

async function toSha256Hex(rawValue: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawValue))
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

export async function validateInviteCode(
  client: ServiceClient,
  inviteCode: string,
): Promise<InviteValidationResult> {
  const normalizedInviteCode = inviteCode.trim()
  if (!normalizedInviteCode) {
    return {
      type: 'invalid',
      reason: 'INVITE_NOT_FOUND',
    }
  }

  const codeHash = await toSha256Hex(normalizedInviteCode)
  const { data, error } = await client
    .from('invite_codes')
    .select('organization_id, role_scope, expires_at, max_uses, used_count, used_at, used_by, revoked_at')
    .eq('code_hash', codeHash)
    .maybeSingle()

  if (error) {
    return {
      type: 'internal_error',
      message: error.message,
    }
  }

  if (!data?.organization_id) {
    return {
      type: 'invalid',
      reason: 'INVITE_NOT_FOUND',
    }
  }

  if (data.role_scope !== 'user') {
    return {
      type: 'invalid',
      reason: 'INVITE_ROLE_MISMATCH',
    }
  }

  if (data.revoked_at) {
    return {
      type: 'invalid',
      reason: 'INVITE_REVOKED',
    }
  }

  const maxUses = Number.isInteger(data.max_uses) && data.max_uses > 0 ? data.max_uses : 1
  const usedCount = Number.isInteger(data.used_count) && data.used_count >= 0 ? data.used_count : 0
  if (usedCount >= maxUses || data.used_at || data.used_by) {
    return {
      type: 'invalid',
      reason: 'INVITE_ALREADY_USED',
    }
  }

  const expiresAt = new Date(data.expires_at).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return {
      type: 'invalid',
      reason: 'INVITE_EXPIRED',
    }
  }

  return {
    type: 'valid',
    organizationId: data.organization_id,
    codeHash,
  }
}

function createMembershipMetadata(
  organizationId: string,
  role: SignupRole,
  status: Exclude<MembershipStatus, 'none'>,
) {
  const now = new Date().toISOString()
  return {
    organization_id: organizationId,
    role,
    status,
    created_at: now,
    approved_at: status === 'approved' ? now : null,
  }
}

function buildAppMetadata(
  organizationId: string,
  role: SignupRole,
  status: Exclude<MembershipStatus, 'none'>,
) {
  return {
    global_role: 'user',
    account_status: 'active',
    organization_id: organizationId,
    organizationId,
    current_organization_id: organizationId,
    currentOrganizationId: organizationId,
    organization_memberships: [createMembershipMetadata(organizationId, role, status)],
  }
}

function extractRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null
  }

  return data && typeof data === 'object' ? (data as T) : null
}

function toCreateUserError(error: ServiceErrorLike): SignupSubmitServiceError {
  if (/already registered|already exists|duplicate|unique|email/i.test(error.message)) {
    return new SignupSubmitServiceError('DUPLICATE_REQUEST', SIGNUP_ERROR_MESSAGES.DUPLICATE_REQUEST, 409, {
      stage: 'auth_user_create',
    })
  }

  return new SignupSubmitServiceError('INTERNAL_ERROR', error.message, 500, {
    stage: 'auth_user_create',
  })
}

function toRpcError(error: ServiceErrorLike): SignupSubmitServiceError {
  if (/duplicate_signup_request|duplicate_approved_membership|duplicate/i.test(error.message)) {
    return new SignupSubmitServiceError('DUPLICATE_REQUEST', SIGNUP_ERROR_MESSAGES.DUPLICATE_REQUEST, 409)
  }

  if (/invalid_invite_code/i.test(error.message)) {
    return new SignupSubmitServiceError(
      'INVALID_INVITE_CODE',
      SIGNUP_ERROR_MESSAGES.INVALID_INVITE_CODE,
      400,
      {
        stage: 'invite_redeem',
      },
    )
  }

  if (/invalid_signup_payload|organization_not_found/i.test(error.message)) {
    return new SignupSubmitServiceError('VALIDATION_ERROR', SIGNUP_ERROR_MESSAGES.VALIDATION_ERROR, 400)
  }

  return new SignupSubmitServiceError('INTERNAL_ERROR', error.message, 500)
}

async function resolveAdminOrganizationId(
  client: ServiceClient,
  hospitalId: string,
  hospitalName: string,
): Promise<string> {
  if (isUuid(hospitalId)) {
    return hospitalId
  }

  const { data: existingOrganizations, error: existingOrganizationError } = await client
    .from('organizations')
    .select('id')
    .eq('name', hospitalName)
    .eq('type', 'hospital')
    .limit(1)

  if (existingOrganizationError) {
    throw new SignupSubmitServiceError('INTERNAL_ERROR', existingOrganizationError.message, 500, {
      stage: 'organization_lookup',
    })
  }

  const existingOrganizationId = existingOrganizations?.[0]?.id
  if (existingOrganizationId) {
    return existingOrganizationId
  }

  const { data: createdOrganization, error: createOrganizationError } = await client
    .from('organizations')
    .insert({
      name: hospitalName,
      type: 'hospital',
    })
    .select('id')
    .single()

  if (createOrganizationError || !createdOrganization?.id) {
    throw new SignupSubmitServiceError(
      'INTERNAL_ERROR',
      createOrganizationError?.message || 'Unable to create organization for admin signup.',
      500,
      {
        stage: 'organization_create',
      },
    )
  }

  return createdOrganization.id
}

async function rollbackAuthUser(client: ServiceClient, userId: string | null) {
  if (!userId) {
    return
  }

  try {
    await client.auth.admin.deleteUser(userId)
  } catch {
    // Best-effort rollback only. Preserve the original failure.
  }
}

export async function processSignupSubmit(
  client: ServiceClient,
  payload: SignupSubmitRequest,
  dependencies: SignupSubmitDependencies = {},
): Promise<SignupSubmitSuccessData> {
  const role = normalizeRole(payload)
  if (!role) {
    throw new SignupSubmitServiceError('VALIDATION_ERROR', SIGNUP_ERROR_MESSAGES.VALIDATION_ERROR, 400, {
      field: 'role',
    })
  }

  const { email, password, name } = requireCommonFields(payload)
  const inviteValidator = dependencies.validateInviteCode ?? validateInviteCode
  const adminOrganizationResolver = dependencies.resolveAdminOrganizationId ?? resolveAdminOrganizationId

  let organizationId: string
  let membershipStatus: Exclude<MembershipStatus, 'none'>
  let rpcName: 'submit_admin_signup_atomic' | 'redeem_user_invite_signup_atomic'
  let rpcParams: Record<string, unknown>
  let nextState: SignupNextState
  let path: SignupPath

  if (role === 'admin') {
    const adminFields = requireAdminFields(payload)
    organizationId = await adminOrganizationResolver(
      client,
      adminFields.organizationId,
      adminFields.hospitalName,
    )
    membershipStatus = 'pending'
    rpcName = 'submit_admin_signup_atomic'
    rpcParams = {
      p_organization_id: organizationId,
      p_display_name: name,
      p_requested_site_name: adminFields.hospitalName,
    }
    nextState = 'pending_approval'
    path = 'admin_submit'
  } else {
    const inviteCode = asNonEmptyString(payload.inviteCode)
    if (!inviteCode) {
      throw new SignupSubmitServiceError(
        'INVALID_INVITE_CODE',
        SIGNUP_ERROR_MESSAGES.INVALID_INVITE_CODE,
        400,
        {
          reason: 'INVITE_NOT_FOUND',
        },
      )
    }

    const inviteValidation = await inviteValidator(client, inviteCode)
    if (inviteValidation.type === 'internal_error') {
      throw new SignupSubmitServiceError('INTERNAL_ERROR', inviteValidation.message, 500, {
        stage: 'invite_validation',
      })
    }

    if (inviteValidation.type === 'invalid') {
      throw new SignupSubmitServiceError(
        'INVALID_INVITE_CODE',
        getInviteInvalidMessage(inviteValidation.reason),
        400,
        {
          reason: inviteValidation.reason,
        },
      )
    }

    organizationId = inviteValidation.organizationId
    membershipStatus = 'approved'
    rpcName = 'redeem_user_invite_signup_atomic'
    rpcParams = {
      p_organization_id: organizationId,
      p_display_name: name,
      p_invite_code_hash: inviteValidation.codeHash,
    }
    nextState = 'active'
    path = 'user_invite_redeem'
  }

  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: name,
      name,
    },
    app_metadata: buildAppMetadata(organizationId, role, membershipStatus),
  })

  if (authError || !authData.user?.id) {
    throw toCreateUserError(authError ?? { message: 'Unable to create auth user.' })
  }

  const userId = authData.user.id

  try {
    const { data, error } = await client.rpc(rpcName, {
      p_user_id: userId,
      ...rpcParams,
    })

    if (error) {
      throw toRpcError(error)
    }

    if (role === 'admin') {
      const row = extractRpcRow<AdminSignupRpcRow>(data)
      if (!row?.signup_request_id || !row.organization_id) {
        throw new SignupSubmitServiceError('INTERNAL_ERROR', 'Invalid admin signup rpc response.', 500)
      }

      return {
        path,
        nextState,
        signupRequestStatus: 'pending',
        membershipStatus: 'none',
        signupRequestId: row.signup_request_id,
        organizationId: row.organization_id,
      }
    }

    const row = extractRpcRow<UserInviteRpcRow>(data)
    if (!row?.signup_request_id || !row.organization_id) {
      throw new SignupSubmitServiceError('INTERNAL_ERROR', 'Invalid invite signup rpc response.', 500)
    }

    return {
      path,
      nextState,
      signupRequestStatus: 'approved',
      membershipStatus: 'approved',
      signupRequestId: row.signup_request_id,
      organizationId: row.organization_id,
    }
  } catch (error) {
    await rollbackAuthUser(client, userId)

    if (error instanceof SignupSubmitServiceError) {
      throw error
    }

    throw new SignupSubmitServiceError('INTERNAL_ERROR', error instanceof Error ? error.message : undefined, 500)
  }
}
