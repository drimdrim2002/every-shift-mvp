import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  OrganizationProfileResponse,
  SiteFoundationResponse,
} from '@/types/ops';

const {
  pushMock,
  getOrganizationProfileMock,
  getSitesMock,
  updateOrganizationProfileMock,
  updateSitesMock,
  showErrorMock,
  showInfoMock,
  showSuccessMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getOrganizationProfileMock: vi.fn(),
  getSitesMock: vi.fn(),
  updateOrganizationProfileMock: vi.fn(),
  updateSitesMock: vi.fn(),
  showErrorMock: vi.fn(),
  showInfoMock: vi.fn(),
  showSuccessMock: vi.fn(),
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
  showInfo: showInfoMock,
  showSuccess: showSuccessMock,
}));

const organizationStoreMock = reactive({
  current: {
    id: 'org-1',
    name: '서울병원',
    type: 'hospital',
  },
  loadOrganization: vi.fn(),
  updateFoundationProfileCache: vi.fn(),
  updateFoundationSiteCache: vi.fn(),
});

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStoreMock,
}));

vi.mock('@/components/ops/OrganizationProfileForm.vue', () => ({
  default: {
    name: 'OrganizationProfileForm',
    props: ['modelValue', 'saving'],
    emits: ['save', 'dirty-change'],
    template: `
      <div>
        <div
          data-test="organization-profile-form"
          :data-name="modelValue.name"
          :data-type="modelValue.type"
        />
        <button
          data-test="emit-profile-dirty"
          @click="$emit('dirty-change', true)"
        >
          dirty-profile
        </button>
        <button
          data-test="emit-profile-pristine"
          @click="$emit('dirty-change', false)"
        >
          clean-profile
        </button>
        <button
          data-test="emit-profile-save"
          @click="$emit('save', modelValue)"
        >
          save-profile
        </button>
      </div>
    `,
  },
}));

vi.mock('@/components/ops/SiteFoundationForm.vue', () => ({
  default: {
    name: 'SiteFoundationForm',
    props: ['modelValue', 'saving'],
    emits: ['save', 'dirty-change'],
    template: `
      <div>
        <div
          data-test="site-foundation-form"
          :data-site-code="modelValue?.code ?? ''"
          :data-site-name="modelValue?.name ?? ''"
        />
        <button
          data-test="emit-site-dirty"
          @click="$emit('dirty-change', true)"
        >
          dirty-site
        </button>
        <button
          data-test="emit-site-pristine"
          @click="$emit('dirty-change', false)"
        >
          clean-site
        </button>
        <button
          data-test="emit-site-save"
          @click="$emit('save', { code: 'MAIN', name: '본관' })"
        >
          save-site
        </button>
      </div>
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
          template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
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
    const sitesDeferred = createDeferred<SiteFoundationResponse>();

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
      site: {
        id: 'site-1',
        organizationId: 'org-1',
        code: 'MAIN',
        name: '본관',
        isActive: true,
        isScheduleActive: true,
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-test="organization-profile-form"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="site-foundation-form"]').exists()).toBe(true);
  });

  it('passes the single foundation site into the site form', async () => {
    getOrganizationProfileMock.mockResolvedValue({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    });
    getSitesMock.mockResolvedValue({
      organizationId: 'org-1',
      site: {
        id: 'site-1',
        organizationId: 'org-1',
        code: 'MAIN',
        name: '본관',
        isActive: true,
        isScheduleActive: true,
      },
    });

    const wrapper = createWrapper();
    await flushPromises();

    const siteForm = wrapper.get('[data-test="site-foundation-form"]');
    expect(siteForm.attributes('data-site-code')).toBe('MAIN');
    expect(siteForm.attributes('data-site-name')).toBe('본관');
  });

  it('shows only the error state when the initial foundation load fails', async () => {
    getOrganizationProfileMock.mockRejectedValue(new Error('프로필 로드 실패'));
    getSitesMock.mockResolvedValue({
      organizationId: 'org-1',
      site: null,
    });

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('[data-test="organization-profile-form"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="site-foundation-form"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('프로필 로드 실패');
    expect(wrapper.find('[data-test="dashboard-return-button"]').exists()).toBe(true);
    expect(showErrorMock).toHaveBeenCalledWith('프로필 로드 실패');
  });

  it('keeps the dashboard return CTA available while loading and still routes home', async () => {
    const profileDeferred = createDeferred<OrganizationProfileResponse>();
    const sitesDeferred = createDeferred<SiteFoundationResponse>();

    getOrganizationProfileMock.mockReturnValue(profileDeferred.promise);
    getSitesMock.mockReturnValue(sitesDeferred.promise);

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('[data-test="dashboard-return-button"]').exists()).toBe(true);

    await wrapper.get('[data-test="dashboard-return-button"]').trigger('click');
    await flushPromises();

    expect(pushMock).toHaveBeenCalledWith('/');

    profileDeferred.resolve({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    });
    sitesDeferred.resolve({
      organizationId: 'org-1',
      site: null,
    });

    await flushPromises();
  });

  it('saves the single site foundation and updates the local cache', async () => {
    getOrganizationProfileMock.mockResolvedValue({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    });
    getSitesMock.mockResolvedValue({
      organizationId: 'org-1',
      site: null,
    });
    updateSitesMock.mockResolvedValue({
      organizationId: 'org-1',
      site: {
        id: 'site-1',
        organizationId: 'org-1',
        code: 'MAIN',
        name: '본관',
        isActive: true,
        isScheduleActive: true,
      },
    });

    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.get('[data-test="emit-site-save"]').trigger('click');
    await flushPromises();

    expect(updateSitesMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      site: {
        code: 'MAIN',
        name: '본관',
      },
    });
    expect(organizationStoreMock.updateFoundationSiteCache).toHaveBeenCalledWith({
      id: 'site-1',
      organizationId: 'org-1',
      code: 'MAIN',
      name: '본관',
      isActive: true,
      isScheduleActive: true,
    });
    expect(showSuccessMock).toHaveBeenCalledWith('사이트 설정을 저장했습니다.');
  });

  it('maps unknown English site save errors to the Korean fallback', async () => {
    getOrganizationProfileMock.mockResolvedValue({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    });
    getSitesMock.mockResolvedValue({
      organizationId: 'org-1',
      site: null,
    });
    updateSitesMock.mockRejectedValue(new Error('Unexpected site save failure'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.get('[data-test="emit-site-save"]').trigger('click');
    await flushPromises();

    expect(showErrorMock).toHaveBeenCalledWith('사이트 설정 저장에 실패했습니다.');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('preserves user-facing Korean site save errors', async () => {
    getOrganizationProfileMock.mockResolvedValue({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    });
    getSitesMock.mockResolvedValue({
      organizationId: 'org-1',
      site: null,
    });
    updateSitesMock.mockRejectedValue(new Error('사이트 저장 중 예상치 못한 오류가 발생했습니다.'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.get('[data-test="emit-site-save"]').trigger('click');
    await flushPromises();

    expect(showErrorMock).toHaveBeenCalledWith('사이트 저장 중 예상치 못한 오류가 발생했습니다.');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('blocks dashboard return when the child forms report dirty state', async () => {
    getOrganizationProfileMock.mockResolvedValue({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    });
    getSitesMock.mockResolvedValue({
      organizationId: 'org-1',
      site: null,
    });

    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.get('[data-test="emit-profile-dirty"]').trigger('click');
    const returnButton = wrapper.find('[data-test="dashboard-return-button"]');
    expect(returnButton.exists()).toBe(true);
    await returnButton.trigger('click');
    await flushPromises();

    expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 있습니다. 저장 후 이동하세요.');
    expect(pushMock).not.toHaveBeenCalledWith('/');
  });
});
