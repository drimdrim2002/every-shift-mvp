import { mount } from '@vue/test-utils';
import { defineComponent, h, reactive } from 'vue';
import { describe, expect, it } from 'vitest';
import OrganizationProfileForm from '@/components/ops/OrganizationProfileForm.vue';

const NCardStub = {
  template: '<div><slot /></div>',
};

const NFormStub = {
  template: '<form><slot /></form>',
};

const NFormItemStub = {
  template: '<label><slot /></label>',
};

const NButtonStub = {
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
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

describe('OrganizationProfileForm', () => {
  it('does not reset local edits when the parent mutates the model object in place', async () => {
    const parentState = reactive({
      modelValue: {
        organizationId: 'org-1',
        name: '',
        type: 'hospital',
      },
    });

    const Harness = defineComponent({
      setup() {
        return () => h(OrganizationProfileForm, {
          modelValue: parentState.modelValue,
        });
      },
    });

    const wrapper = mount(Harness, {
      global: {
        stubs: {
          NCard: NCardStub,
          NForm: NFormStub,
          NFormItem: NFormItemStub,
          NButton: NButtonStub,
          NInput: NInputStub,
        },
      },
    });

    const firstInput = wrapper.find('input');
    await firstInput.setValue('서울병원');

    parentState.modelValue.type = 'general-hospital';

    await wrapper.vm.$nextTick();

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('서울병원');
  });
});
