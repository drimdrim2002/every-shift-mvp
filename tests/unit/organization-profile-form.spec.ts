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
    expect(wrapper.findComponent(OrganizationProfileForm).emitted('dirty-change')).toEqual([[true]]);

    await firstInput.setValue('');

    expect(wrapper.findComponent(OrganizationProfileForm).emitted('dirty-change')).toEqual([[true], [false]]);
  });

  it('resyncs the local form and dirty baseline when the prop object is replaced', async () => {
    const wrapper = mount(OrganizationProfileForm, {
      props: {
        modelValue: {
          organizationId: 'org-1',
          name: '서울병원',
          type: 'hospital',
        },
      },
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

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('서울중앙병원');

    expect(wrapper.emitted('dirty-change')).toEqual([[true]]);

    await wrapper.setProps({
      modelValue: {
        organizationId: 'org-2',
        name: '부산병원',
        type: 'general-hospital',
      },
    });

    const refreshedInputs = wrapper.findAll('input');
    expect((refreshedInputs[0].element as HTMLInputElement).value).toBe('부산병원');
    expect((refreshedInputs[1].element as HTMLInputElement).value).toBe('general-hospital');
    expect(wrapper.emitted('dirty-change')).toEqual([[true], [false]]);
  });

  it('emits dirty-change when the local state diverges and returns to pristine', async () => {
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
    await firstInput.setValue('');

    expect(wrapper.findComponent(OrganizationProfileForm).emitted('dirty-change')).toEqual([[true], [false]]);
  });

  it('treats surrounding whitespace as a no-op when baseline values already exist', async () => {
    const wrapper = mount(OrganizationProfileForm, {
      props: {
        modelValue: {
          organizationId: 'org-1',
          name: '서울병원',
          type: 'hospital',
        },
      },
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

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('  서울병원  ');
    await inputs[1].setValue('  hospital  ');
    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('dirty-change')).toBeUndefined();
    expect(wrapper.emitted('save')).toEqual([
      [
        {
          organizationId: 'org-1',
          name: '서울병원',
          type: 'hospital',
        },
      ],
    ]);
  });
});
