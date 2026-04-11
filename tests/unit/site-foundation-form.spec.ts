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

describe('SiteFoundationForm', () => {
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
