import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrganizationProfileResponse, SitesResponse } from '@/types/ops';

const {
  pushMock,
  getOrganizationProfileMock,
  getSitesMock,
  updateOrganizationProfileMock,
  updateSitesMock,
  showErrorMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getOrganizationProfileMock: vi.fn(),
  getSitesMock: vi.fn(),
  updateOrganizationProfileMock: vi.fn(),
  updateSitesMock: vi.fn(),
  showErrorMock: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/api/ops', () => ({
  getOrganizationProfile: getOrganizationProfileMock,
  getSites: getSitesMock,
  updateOrganizationProfile: updateOrganizationProfileMock,
  updateSites: updateSitesMock,
}));

vi.mock('@/utils/message', () => ({
  showError: showErrorMock,
  showSuccess: vi.fn(),
}));

const organizationStoreMock = reactive({
  current: {
    id: 'org-1',
    name: '서울병원',
    type: 'hospital',
  },
  loadOrganization: vi.fn(),
  updateFoundationProfileCache: vi.fn(),
  updateFoundationSitesCache: vi.fn(),
});

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStoreMock,
}));

vi.mock('@/components/ops/OrganizationProfileForm.vue', () => ({
  default: {
    name: 'OrganizationProfileForm',
    template: '<div data-test="organization-profile-form" />',
  },
}));

vi.mock('@/components/ops/SiteFoundationForm.vue', () => ({
  default: {
    name: 'SiteFoundationForm',
    props: ['modelValue', 'pilotSiteId', 'scheduleTargetLocked'],
    template: `
      <div
        data-test="site-foundation-form"
        :data-pilot-site-id="pilotSiteId ?? ''"
        :data-locked="String(scheduleTargetLocked)"
      />
    `,
  },
}));

import OrganizationProfileSetup from '@/views/ops/OrganizationProfileSetup.vue';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createWrapper() {
  return mount(OrganizationProfileSetup, {
    global: {
      stubs: {
        NButton: {
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        NAlert: {
          template: '<div><slot name="header" /><slot /></div>',
        },
        NCard: {
          template: '<div><slot /></div>',
        },
        NSpin: {
          template: '<div><slot /></div>',
        },
      },
    },
  });
}

describe('OrganizationProfileSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    organizationStoreMock.current = {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
    };
    organizationStoreMock.loadOrganization.mockResolvedValue({ success: true });
  });

  it('waits for initial foundation data before rendering editable forms', async () => {
    const profileDeferred = createDeferred<OrganizationProfileResponse>();
    const sitesDeferred = createDeferred<SitesResponse>();

    getOrganizationProfileMock.mockReturnValue(profileDeferred.promise);
    getSitesMock.mockReturnValue(sitesDeferred.promise);

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('[data-test="organization-profile-form"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="site-foundation-form"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('기본 설정을 불러오는 중입니다.');

    profileDeferred.resolve({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    });
    sitesDeferred.resolve({
      organizationId: 'org-1',
      pilotSiteId: 'site-1',
      sites: [
        {
          id: 'site-1',
          organizationId: 'org-1',
          code: 'MAIN',
          name: '본관',
          isActive: true,
          isScheduleActive: true,
        },
      ],
    });

    await flushPromises();

    expect(wrapper.find('[data-test="organization-profile-form"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="site-foundation-form"]').exists()).toBe(true);
  });

  it('passes pilot-site metadata into the site foundation form', async () => {
    getOrganizationProfileMock.mockResolvedValue({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    });
    getSitesMock.mockResolvedValue({
      organizationId: 'org-1',
      pilotSiteId: 'site-1',
      sites: [
        {
          id: 'site-1',
          organizationId: 'org-1',
          code: 'MAIN',
          name: '본관',
          isActive: true,
          isScheduleActive: true,
        },
      ],
    });

    const wrapper = createWrapper();
    await flushPromises();

    const siteForm = wrapper.get('[data-test="site-foundation-form"]');
    expect(siteForm.attributes('data-pilot-site-id')).toBe('site-1');
    expect(siteForm.attributes('data-locked')).toBe('true');
  });

  it('shows only the error state when the initial foundation load fails', async () => {
    getOrganizationProfileMock.mockRejectedValue(new Error('프로필 로드 실패'));
    getSitesMock.mockResolvedValue({
      organizationId: 'org-1',
      pilotSiteId: null,
      sites: [],
    });

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('[data-test="organization-profile-form"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="site-foundation-form"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('프로필 로드 실패');
    expect(wrapper.text()).not.toContain('기본 설정을 불러오는 중입니다.');
    expect(showErrorMock).toHaveBeenCalledWith('프로필 로드 실패');
  });
});
