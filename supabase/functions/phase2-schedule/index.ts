import { createClient } from 'npm:@supabase/supabase-js@2';
import { resolveAuthContext } from './auth.ts';
import {
  allowedMethods,
  ContractError,
  parseCreateVersionRequest,
  parseDeleteGeneratedResultsRequest,
  parseDeleteMonthRequest,
  parseDeleteScheduleVersionRequest,
  type ErrorEnvelope,
  type HttpMethod,
  matchRoute,
  normalizePathSegments,
  parsePatchScheduleVersionAssignmentsRequest,
  parseResetRosterRequest,
  parseEnsureRequest,
  parseJsonBody,
  parseScheduleKeyParam,
  parseUuidParam,
  parseScheduleVersionSolveRequest,
  parseScheduleVersionSolverResultRequest,
} from './contracts.ts';
import { createErrorResponse, createJsonResponse, withCorsHeaders } from './http.ts';
import {
  compare as compareVersion,
  createVersion,
  deleteGeneratedResults,
  deleteVersion,
  deleteScheduleMonth,
  ensure as ensureSchedule,
  finalizeVersion,
  markVersionSolving,
  patchVersionAssignments,
  resetScheduleRoster,
  resetActiveFlow,
  recheckVersion,
  review as reviewVersion,
  select as selectVersion,
  syncVersionSolverResult,
  unfinalizeVersion,
} from './repository.ts';
import type {
  CompareResponse,
  CreateVersionResponse,
  DeleteGeneratedResultsResponse,
  DeleteScheduleVersionResponse,
  DeleteMonthResponse,
  EnsureResponse,
  PatchAssignmentsResponse,
  ResetRosterResponse,
  ResetActiveFlowResponse,
  ReviewResponse,
  ScheduleVersionFinalizeResponse,
  ScheduleVersionUnfinalizeResponse,
  ScheduleVersionRecheckResponse,
  SelectResponse,
  SolveResponse,
  SolverResultResponse,
} from './contracts.ts';

type ApiResponseBody =
  | CompareResponse
  | CreateVersionResponse
  | DeleteGeneratedResultsResponse
  | DeleteScheduleVersionResponse
  | DeleteMonthResponse
  | EnsureResponse
  | PatchAssignmentsResponse
  | ResetRosterResponse
  | ResetActiveFlowResponse
  | ReviewResponse
  | ScheduleVersionFinalizeResponse
  | ScheduleVersionUnfinalizeResponse
  | ScheduleVersionRecheckResponse
  | SelectResponse
  | SolveResponse
  | SolverResultResponse
  | ErrorEnvelope;

function createResponse(request: Request, body: ApiResponseBody, status = 200): Response {
  return createJsonResponse(request, body, status);
}

function createAuthClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SB_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !publishableKey) {
    throw new ContractError(
      'internal_error',
      'Missing SUPABASE_URL or publishable Supabase key',
      500
    );
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createRepositoryClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new ContractError(
      'internal_error',
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      500
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, withCorsHeaders(request, { status: 200 }));
  }

  const { pathname } = new URL(request.url);
  const route = matchRoute(normalizePathSegments(pathname));

  if (!route) {
    return createJsonResponse(request, { code: 'not_found', message: 'Not found' }, 404);
  }

  const method = request.method.toUpperCase();

  try {
    const methods = allowedMethods(route.route);

    if (!methods.includes(method as HttpMethod)) {
      return createJsonResponse(
        request,
        { code: 'method_not_allowed', message: `${method} is not allowed` },
        405
      );
    }

    const authClient = createAuthClient();
    const auth = await resolveAuthContext(authClient, request);
    const repositoryClient = createRepositoryClient();

    if (route.route === 'ensure') {
      const payload = await parseJsonBody(request);
      const ensureInput = parseEnsureRequest(payload);
      const result: EnsureResponse = await ensureSchedule(repositoryClient, auth, ensureInput);
      return createResponse(request, result, 200);
    }

    if (route.route === 'compare') {
      const scheduleKey = parseScheduleKeyParam('scheduleKey', route.params.scheduleKey);
      const result: CompareResponse = await compareVersion(repositoryClient, auth, scheduleKey);
      return createResponse(request, result, 200);
    }

    if (route.route === 'review') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const result: ReviewResponse = await reviewVersion(repositoryClient, auth, versionId);
      return createResponse(request, result, 200);
    }

    if (route.route === 'select') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const result: SelectResponse = await selectVersion(repositoryClient, auth, versionId);
      return createResponse(request, result, 200);
    }

    if (route.route === 'createVersion') {
      const scheduleId = parseUuidParam('scheduleId', route.params.scheduleId);
      const payload = await parseJsonBody(request);
      const createVersionInput = parseCreateVersionRequest(payload);
      const result: CreateVersionResponse = await createVersion(
        repositoryClient,
        auth,
        scheduleId,
        createVersionInput
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'deleteVersion') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const payload = await parseJsonBody(request);
      const deleteVersionInput = parseDeleteScheduleVersionRequest(payload);
      const result: DeleteScheduleVersionResponse = await deleteVersion(
        repositoryClient,
        auth,
        versionId,
        deleteVersionInput
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'resetRoster') {
      const payload = await parseJsonBody(request);
      const resetRosterInput = parseResetRosterRequest(payload);
      const result: ResetRosterResponse = await resetScheduleRoster(
        repositoryClient,
        auth,
        resetRosterInput
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'resetActiveFlow') {
      const scheduleId = parseUuidParam('scheduleId', route.params.scheduleId);
      const result: ResetActiveFlowResponse = await resetActiveFlow(
        repositoryClient,
        auth,
        scheduleId
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'deleteGeneratedResults') {
      const scheduleId = parseUuidParam('scheduleId', route.params.scheduleId);
      const payload = await parseJsonBody(request);
      const deleteGeneratedResultsInput = parseDeleteGeneratedResultsRequest(payload);
      const result: DeleteGeneratedResultsResponse = await deleteGeneratedResults(
        repositoryClient,
        auth,
        scheduleId,
        deleteGeneratedResultsInput
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'deleteMonth') {
      const payload = await parseJsonBody(request);
      const deleteMonthInput = parseDeleteMonthRequest(payload);
      const result: DeleteMonthResponse = await deleteScheduleMonth(
        repositoryClient,
        auth,
        deleteMonthInput
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'solve') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const payload = await parseJsonBody(request);
      const solveInput = parseScheduleVersionSolveRequest(payload);
      const result: SolveResponse = await markVersionSolving(
        repositoryClient,
        auth,
        versionId,
        solveInput
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'solverResult') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const payload = await parseJsonBody(request);
      const solverResultInput = parseScheduleVersionSolverResultRequest(payload);
      const result: SolverResultResponse = await syncVersionSolverResult(
        repositoryClient,
        auth,
        versionId,
        solverResultInput
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'patchAssignments') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const payload = await parseJsonBody(request);
      const patchInput = parsePatchScheduleVersionAssignmentsRequest(payload);
      const result: PatchAssignmentsResponse = await patchVersionAssignments(
        repositoryClient,
        auth,
        versionId,
        patchInput
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'recheck') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const result: ScheduleVersionRecheckResponse = await recheckVersion(
        repositoryClient,
        auth,
        versionId
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'finalize') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const result: ScheduleVersionFinalizeResponse = await finalizeVersion(
        repositoryClient,
        auth,
        versionId
      );
      return createResponse(request, result, 200);
    }

    if (route.route === 'unfinalize') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const result: ScheduleVersionUnfinalizeResponse = await unfinalizeVersion(
        repositoryClient,
        auth,
        versionId
      );
      return createResponse(request, result, 200);
    }

    throw new ContractError('not_found', 'Route handler not implemented', 404);
  } catch (error: unknown) {
    return createErrorResponse(request, error);
  }
});
