import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Employee } from '@/types/employee';
import type { GridColumn } from '@/types/schedule';

const {
  downloadOffRequestTemplateMock,
  parseOffRequestExcelFileMock,
  showSuccessMock,
  showErrorMock,
} = vi.hoisted(() => ({
  downloadOffRequestTemplateMock: vi.fn(),
  parseOffRequestExcelFileMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showErrorMock: vi.fn(),
}));

vi.mock('@/utils/offRequestExcel', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/offRequestExcel')>()),
  downloadOffRequestTemplate: downloadOffRequestTemplateMock,
  parseOffRequestExcelFile: parseOffRequestExcelFileMock,
}));

vi.mock('@/utils/message', () => ({
  showSuccess: showSuccessMock,
  showError: showErrorMock,
  showInfo: vi.fn(),
}));

vi.mock('naive-ui', () => ({
  NModal: defineComponent({
    props: {
      show: Boolean,
    },
    emits: ['update:show'],
    template: `
      <div v-if="show" data-test="modal-stub">
        <button data-test="modal-close" @click="$emit('update:show', false)">close</button>
        <slot name="header" />
        <slot />
        <slot name="footer" />
      </div>
    `,
  }),
  NUpload: defineComponent({
    props: {
      customRequest: {
        type: Function,
        required: true,
      },
    },
    setup() {
      return {
        testFile: new globalThis.File(['x'], 'off.xlsx'),
      };
    },
    template: `
      <div>
        <button
          data-test="upload-trigger"
          @click="customRequest({
            file: { file: testFile },
            onFinish: () => {},
            onError: () => {},
          })"
        >
          upload
        </button>
        <slot />
      </div>
    `,
  }),
  NUploadDragger: { template: '<div><slot /></div>' },
  NAlert: { template: '<div><slot name="header" /><slot /></div>' },
  NButton: { template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>', props: ['disabled'], emits: ['click'] },
}));

import Step4OffRequestExcelUploadModal from '@/components/schedule/Step4OffRequestExcelUploadModal.vue';

const employees: Employee[] = [
  {
    id: 'emp-1',
    organizationId: 'org-1',
    employeeId: 'E001',
    name: 'Kim',
    availableShifts: ['D', 'E', 'N', 'O'],
  },
];

const dates: GridColumn[] = [
  { date: '2025-12-01', day: 1, dayOfWeek: 1, dayName: '월', isLastMonth: false },
];

function createWrapper() {
  return mount(Step4OffRequestExcelUploadModal, {
    props: {
      show: true,
      employees,
      dates,
      month: '2025-12',
    },
  });
}

describe('Step4OffRequestExcelUploadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads the Off request template for the current employees and month', async () => {
    const wrapper = createWrapper();

    await wrapper.find('[data-test="off-request-template-download"]').trigger('click');

    expect(downloadOffRequestTemplateMock).toHaveBeenCalledWith(employees, '2025-12');
    expect(showSuccessMock).toHaveBeenCalledWith('Off 요청 템플릿을 다운로드했습니다.');
  });

  it('uploads a file and renders validation errors while keeping apply disabled', async () => {
    parseOffRequestExcelFileMock.mockResolvedValue({
      ok: false,
      constraints: {},
      errors: [
        {
          code: 'invalid_off_type',
          rowNumber: 2,
          field: 'Off 유형',
          message: 'Off 유형은 O만 입력할 수 있습니다.',
        },
      ],
      requestCount: 0,
      employeeCount: 0,
    });
    const wrapper = createWrapper();

    await wrapper.find('[data-test="upload-trigger"]').trigger('click');
    await flushPromises();

    expect(parseOffRequestExcelFileMock).toHaveBeenCalledWith(expect.any(File), employees, dates);
    expect(wrapper.text()).toContain('오류 1건을 수정한 뒤 다시 업로드해 주세요.');
    expect(wrapper.text()).toContain('Off 유형은 O만 입력할 수 있습니다.');
    expect(wrapper.find('[data-test="off-request-excel-apply"]').attributes('disabled')).toBeDefined();
    expect(showErrorMock).toHaveBeenCalledWith('Excel 파일을 확인해 주세요.');
  });

  it('renders a successful summary and emits apply with the parsed ConstraintMap', async () => {
    parseOffRequestExcelFileMock.mockResolvedValue({
      ok: true,
      constraints: {
        'emp-1': { '2025-12-01': 'O' },
      },
      errors: [],
      requestCount: 1,
      employeeCount: 1,
    });
    const wrapper = createWrapper();

    await wrapper.find('[data-test="upload-trigger"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-test="off-request-excel-apply"]').trigger('click');

    expect(wrapper.text()).toContain('1명 / 1건 Off 요청이 현재 입력값을 전부 대체합니다.');
    expect(wrapper.emitted('apply')).toEqual([[{ 'emp-1': { '2025-12-01': 'O' } }]]);
    expect(showSuccessMock).toHaveBeenCalledWith('Excel 검증을 완료했습니다.');
  });

  it('disables apply for a valid file with zero Off requests', async () => {
    parseOffRequestExcelFileMock.mockResolvedValue({
      ok: true,
      constraints: {},
      errors: [],
      requestCount: 0,
      employeeCount: 0,
    });
    const wrapper = createWrapper();

    await wrapper.find('[data-test="upload-trigger"]').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('적용할 Off 요청이 없습니다.');
    expect(wrapper.find('[data-test="off-request-excel-apply"]').attributes('disabled')).toBeDefined();
  });

  it('emits update:show false when closing', async () => {
    const wrapper = createWrapper();

    await wrapper.find('[data-test="modal-close"]').trigger('click');

    expect(wrapper.emitted('update:show')).toEqual([[false]]);
  });
});
