import { describe, expect, it } from 'vitest';
import {
  allowedMethods,
  matchRoute,
  normalizePathSegments,
  parseBootstrapAdminRequest,
  parseBootstrapAdminResponse,
  parseOperatorAuthorization,
} from '@/../supabase/functions/phase2-ops/contracts.ts';
import * as phase2OpsContracts from '@/../supabase/functions/phase2-ops/contracts.ts';

describe('phase2 ops contracts', () => {
  it('matches the bootstrap admin route and allows POST only', () => {
    expect(
      matchRoute(normalizePathSegments('/functions/v1/phase2-ops/bootstrap-admin'))
    ).toEqual({
      route: 'bootstrapAdmin',
      params: {},
    });

    expect(allowedMethods('bootstrapAdmin')).toEqual(['POST']);
  });

  it('parses operator authorization from a bearer token', () => {
    expect(
      parseOperatorAuthorization(
        new Request('https://example.com/functions/v1/phase2-ops/bootstrap-admin', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer operator-token-123',
          },
        })
      )
    ).toBe('operator-token-123');
  });

  it('rejects missing or malformed operator authorization headers', () => {
    expect(() =>
      parseOperatorAuthorization(
        new Request('https://example.com/functions/v1/phase2-ops/bootstrap-admin', {
          method: 'POST',
        })
      )
    ).toThrowError('Operator authorization bearer token is required');

    expect(() =>
      parseOperatorAuthorization(
        new Request('https://example.com/functions/v1/phase2-ops/bootstrap-admin', {
          method: 'POST',
          headers: {
            Authorization: 'Token operator-token-123',
          },
        })
      )
    ).toThrowError('Operator authorization bearer token is required');

    expect(() =>
      parseOperatorAuthorization(
        new Request('https://example.com/functions/v1/phase2-ops/bootstrap-admin', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer   ',
          },
        })
      )
    ).toThrowError('Operator authorization bearer token is required');
  });

  it('parses bootstrap admin requests with organization, target, display, and onboarding flags', () => {
    expect(
      parseBootstrapAdminRequest({
        organizationId: '00000000-0000-0000-0000-000000000001',
        targetEmail: 'operator@example.com',
        displayName: 'Operator Admin',
        onboardingInitializationFlags: {
          createPilotSite: true,
          seedOrganizationSettings: true,
        },
      })
    ).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      targetEmail: 'operator@example.com',
      displayName: 'Operator Admin',
      onboardingInitializationFlags: {
        createPilotSite: true,
        seedOrganizationSettings: true,
      },
    });
  });

  it('rejects unsupported or non-boolean onboarding flags', () => {
    expect(() =>
      parseBootstrapAdminRequest({
        organizationId: '00000000-0000-0000-0000-000000000001',
        targetEmail: 'operator@example.com',
        displayName: 'Operator Admin',
        onboardingInitializationFlags: {
          createPilotSite: true,
          seedOrganizationSettings: true,
          seedPilotUsers: true,
        },
      })
    ).toThrowError('onboardingInitializationFlags contains unsupported key: seedPilotUsers');

    expect(() =>
      parseBootstrapAdminRequest({
        organizationId: '00000000-0000-0000-0000-000000000001',
        targetEmail: 'operator@example.com',
        displayName: 'Operator Admin',
        onboardingInitializationFlags: {
          createPilotSite: true,
          seedOrganizationSettings: 'yes',
        },
      })
    ).toThrowError('onboardingInitializationFlags.seedOrganizationSettings must be a boolean');
  });

  it('rejects bootstrap admin requests when required fields are missing', () => {
    expect(() =>
      parseBootstrapAdminRequest({
        targetEmail: 'operator@example.com',
        displayName: 'Operator Admin',
        onboardingInitializationFlags: {
          createPilotSite: true,
        },
      })
    ).toThrowError('organizationId must be a valid UUID');

    expect(() =>
      parseBootstrapAdminRequest({
        organizationId: '00000000-0000-0000-0000-000000000001',
        displayName: 'Operator Admin',
        onboardingInitializationFlags: {
          createPilotSite: true,
        },
      })
    ).toThrowError('targetEmail must be a valid email address');

    expect(() =>
      parseBootstrapAdminRequest({
        organizationId: '00000000-0000-0000-0000-000000000001',
        targetEmail: 'operator@example.com',
        onboardingInitializationFlags: {
          createPilotSite: true,
        },
      })
    ).toThrowError('displayName is required');

    expect(() =>
      parseBootstrapAdminRequest({
        organizationId: '00000000-0000-0000-0000-000000000001',
        targetEmail: 'operator@example.com',
        displayName: 'Operator Admin',
      })
    ).toThrowError('onboardingInitializationFlags must be a JSON object');
  });

  it('parses bootstrap admin responses', () => {
    expect(
      parseBootstrapAdminResponse({
        organizationId: '00000000-0000-0000-0000-000000000001',
        targetEmail: 'operator@example.com',
        displayName: 'Operator Admin',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        onboardingInitializationFlags: {
          createPilotSite: true,
          seedOrganizationSettings: true,
        },
      })
    ).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      targetEmail: 'operator@example.com',
      displayName: 'Operator Admin',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      onboardingInitializationFlags: {
        createPilotSite: true,
        seedOrganizationSettings: true,
      },
    });
  });

  it('matches off-request policy routes and allows GET and PUT', () => {
    expect(
      matchRoute(normalizePathSegments('/functions/v1/phase2-ops/off-request-policies'))
    ).toEqual({
      route: 'offRequestPolicies',
      params: {},
    });

    expect(allowedMethods('offRequestPolicies' as any)).toEqual(['GET', 'PUT']);
  });

  it('matches organization foundation routes used by the browser API', () => {
    expect(
      matchRoute(normalizePathSegments('/functions/v1/phase2-ops/organization-profile'))
    ).toEqual({
      route: 'organizationProfile',
      params: {},
    });
    expect(
      matchRoute(normalizePathSegments('/functions/v1/phase2-ops/sites'))
    ).toEqual({
      route: 'sites',
      params: {},
    });
    expect(
      matchRoute(normalizePathSegments('/functions/v1/phase2-ops/shifts-constraints'))
    ).toEqual({
      route: 'shiftsConstraints',
      params: {},
    });

    expect(allowedMethods('organizationProfile' as any)).toEqual(['GET', 'PATCH']);
    expect(allowedMethods('sites' as any)).toEqual(['GET', 'PUT']);
    expect(allowedMethods('shiftsConstraints' as any)).toEqual(['GET', 'PUT']);
  });

  it('matches the org-level roster replace route and parses its payloads', () => {
    expect(
      matchRoute(normalizePathSegments('/functions/v1/phase2-ops/employee-roster/replace'))
    ).toEqual({
      route: 'employeeRosterReplace',
      params: {},
    });

    expect(allowedMethods('employeeRosterReplace' as any)).toEqual(['POST']);

    expect(
      (phase2OpsContracts as any).parseEmployeeRosterReplaceRequest({
        organizationId: '00000000-0000-0000-0000-000000000001',
        employees: [
          {
            employeeId: 'E001',
            name: 'Kim',
            availableShifts: ['D'],
            rankCode: 'RN',
          },
        ],
      })
    ).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      employees: [
        {
          employeeId: 'E001',
          name: 'Kim',
          availableShifts: ['D'],
          rankCode: 'RN',
        },
      ],
    });

    expect(
      (phase2OpsContracts as any).parseEmployeeRosterReplaceResponse({
        organizationId: '00000000-0000-0000-0000-000000000001',
        employeeCount: 1,
      })
    ).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      employeeCount: 1,
    });
  });

  it('parses off-request policy setup payloads with rank codes and policy rules', () => {
    expect(
      (phase2OpsContracts as any).parseOffRequestPolicySetupRequest({
        organizationId: '00000000-0000-0000-0000-000000000001',
        rankCodes: [
          {
            code: 'RN',
            label: 'Registered Nurse',
            displayOrder: 1,
            isActive: true,
          },
        ],
        policyRules: [
          {
            rankCode: null,
            periodType: 'monthly',
            limitCount: 4,
            isActive: true,
          },
          {
            rankCode: 'RN',
            periodType: 'monthly',
            limitCount: 6,
            isActive: true,
          },
        ],
      })
    ).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      rankCodes: [
        {
          code: 'RN',
          label: 'Registered Nurse',
          displayOrder: 1,
          isActive: true,
        },
      ],
      policyRules: [
        {
          rankCode: null,
          periodType: 'monthly',
          limitCount: 4,
          isActive: true,
        },
        {
          rankCode: 'RN',
          periodType: 'monthly',
          limitCount: 6,
          isActive: true,
        },
      ],
    });
  });
});
