import { describe, expect, it } from 'vitest';
import {
  allowedMethods,
  matchRoute,
  normalizePathSegments,
  parseBootstrapAdminRequest,
  parseBootstrapAdminResponse,
  parseOperatorAuthorization,
} from '@/../supabase/functions/phase2-ops/contracts.ts';

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
});
