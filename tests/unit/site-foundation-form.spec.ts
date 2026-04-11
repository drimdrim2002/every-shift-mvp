import { mount } from '@vue/test-utils';
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
});
