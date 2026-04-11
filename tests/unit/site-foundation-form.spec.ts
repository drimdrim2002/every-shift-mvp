import { mount } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
import { describe, expect, it } from 'vitest';
import SiteFoundationForm from '@/components/ops/SiteFoundationForm.vue';

const NCardStub = {
  template: '<div><slot /></div>',
};

const NButtonStub = {
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
};

const NFormItemStub = {
  template: '<label><slot /></label>',
};

const NInputStub = {
  props: {
    value: {
      type: String,
      default: '',
    },
  },
  emits: ['update:value'],
  template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
};

const NCheckboxStub = {
  props: {
    checked: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:checked'],
  template: '<input type="checkbox" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" />',
};

const NRadioGroupStub = {
  props: {
    value: {
      type: String,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:value'],
  template: '<div><slot /></div>',
};

const NRadioStub = {
  props: {
    value: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  template: '<label><input type="radio" :value="value" :disabled="disabled" /><slot /></label>',
};

describe('SiteFoundationForm', () => {
  it('explains that multiple sites can be registered while only one schedule target is used', () => {
    const wrapper = mount(SiteFoundationForm, {
      props: {
        modelValue: [
          {
            id: 'site-1',
            organizationId: 'org-1',
            code: 'MAIN',
            name: '본관',
            isActive: true,
            isScheduleActive: true,
          },
        ],
        pilotSiteId: null,
        scheduleTargetLocked: false,
      },
      global: {
        stubs: {
          NCard: NCardStub,
          NButton: NButtonStub,
          NFormItem: NFormItemStub,
          NInput: NInputStub,
          NCheckbox: NCheckboxStub,
          NRadioGroup: NRadioGroupStub,
          NRadio: NRadioStub,
        },
      },
    });

    expect(wrapper.text()).toContain('사이트 목록');
    expect(wrapper.text()).toContain('여러 사이트를 등록할 수 있지만, 현재 스케줄 생성에는 1개 사이트만 사용합니다.');
    expect(wrapper.text()).toContain('현재 스케줄 생성 대상');
  });

  it('renders the schedule target as locked when a pilot site already exists', () => {
    const wrapper = mount(SiteFoundationForm, {
      props: {
        modelValue: [
          {
            id: 'site-1',
            organizationId: 'org-1',
            code: 'MAIN',
            name: '본관',
            isActive: true,
            isScheduleActive: true,
          },
          {
            id: 'site-2',
            organizationId: 'org-1',
            code: 'SUB',
            name: '별관',
            isActive: true,
            isScheduleActive: false,
          },
        ],
        pilotSiteId: 'site-1',
        scheduleTargetLocked: true,
      },
      global: {
        stubs: {
          NCard: NCardStub,
          NButton: NButtonStub,
          NFormItem: NFormItemStub,
          NInput: NInputStub,
          NCheckbox: NCheckboxStub,
          NRadioGroup: NRadioGroupStub,
          NRadio: NRadioStub,
        },
      },
    });

    expect(wrapper.text()).toContain('현재 버전에서는 최초 설정한 스케줄 대상 사이트를 변경할 수 없습니다.');
    expect(wrapper.findAll('input[type="radio"]').every((radio) => radio.attributes('disabled') !== undefined)).toBe(true);
  });

  it('keeps the site code input mounted while typing into a new draft row', async () => {
    const wrapper = mount(SiteFoundationForm, {
      props: {
        modelValue: [],
      },
      global: {
        stubs: {
          NCard: NCardStub,
          NButton: NButtonStub,
          NFormItem: NFormItemStub,
          NInput: NInputStub,
          NCheckbox: NCheckboxStub,
          NRadioGroup: NRadioGroupStub,
          NRadio: NRadioStub,
        },
      },
    });

    const firstCodeInput = wrapper.find('input:not([type="checkbox"])');
    const firstCodeInputElement = firstCodeInput.element;

    await firstCodeInput.setValue('M');

    expect(wrapper.find('input:not([type="checkbox"])').element).toBe(firstCodeInputElement);
  });

  it('does not reset local drafts when the parent mutates the sites array in place', async () => {
    const parentState = reactive({
      modelValue: [] as Array<{
        id: string;
        organizationId: string;
        code: string;
        name: string;
        isActive: boolean;
        isScheduleActive: boolean;
      }>,
    });

    const Harness = defineComponent({
      setup() {
        return () => h(SiteFoundationForm, {
          modelValue: parentState.modelValue,
          pilotSiteId: null,
        });
      },
    });

    const wrapper = mount(Harness, {
      global: {
        stubs: {
          NCard: NCardStub,
          NButton: NButtonStub,
          NFormItem: NFormItemStub,
          NInput: NInputStub,
          NCheckbox: NCheckboxStub,
          NRadioGroup: NRadioGroupStub,
          NRadio: NRadioStub,
        },
      },
    });

    const firstCodeInput = wrapper.find('input:not([type="checkbox"])');
    await firstCodeInput.setValue('M');

    parentState.modelValue.push({
      id: 'site-1',
      organizationId: 'org-1',
      code: 'MAIN',
      name: '본관',
      isActive: true,
      isScheduleActive: true,
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('input:not([type="checkbox"])').element).toBe(firstCodeInput.element);
    expect((wrapper.find('input:not([type="checkbox"])').element as HTMLInputElement).value).toBe('M');
  });
});
