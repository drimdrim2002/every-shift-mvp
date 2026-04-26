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

function createWrapper(modelValue = null) {
  return mount(SiteFoundationForm, {
    props: {
      modelValue,
      saving: false,
      status: modelValue ? 'saved' : 'empty',
      canSave: true,
    },
    global: {
      stubs: {
        NCard: NCardStub,
        NButton: NButtonStub,
        NFormItem: NFormItemStub,
        NInput: NInputStub,
      },
    },
  });
}

describe('SiteFoundationForm', () => {
  it('renders the single-site pilot copy', () => {
    const wrapper = createWrapper();

    expect(wrapper.text()).toContain('근무표 기준 장소');
    expect(wrapper.text()).toContain('현재는 근무표 기준으로 사용할 장소 1곳만 설정합니다.');
    expect(wrapper.get('[data-test="site-foundation-status-badge"]').text()).toBe('입력 필요');
  });

  it('hydrates the existing site into the local form', () => {
    const wrapper = createWrapper({
      id: 'site-1',
      organizationId: 'org-1',
      code: 'MAIN',
      name: '본관',
      isActive: true,
      isScheduleActive: true,
    });

    const inputs = wrapper.findAll('input');
    expect((inputs[0].element as HTMLInputElement).value).toBe('MAIN');
    expect((inputs[1].element as HTMLInputElement).value).toBe('본관');
  });

  it('emits the trimmed site payload when saving', async () => {
    const wrapper = mount(SiteFoundationForm, {
      props: {
        modelValue: null,
        saving: false,
        status: 'dirty',
        canSave: true,
      },
      global: {
        stubs: {
          NCard: NCardStub,
          NButton: NButtonStub,
          NFormItem: NFormItemStub,
          NInput: NInputStub,
        },
      },
    });
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue(' MAIN ');
    await inputs[1].setValue(' 본관 ');
    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('save')).toEqual([
      [
        {
          code: 'MAIN',
          name: '본관',
        },
      ],
    ]);
  });

  it('resyncs the local form when the site prop is replaced', async () => {
    const wrapper = createWrapper({
      id: 'site-1',
      organizationId: 'org-1',
      code: 'MAIN',
      name: '본관',
      isActive: true,
      isScheduleActive: true,
    });

    await wrapper.setProps({
      modelValue: {
        id: 'site-1',
        organizationId: 'org-1',
        code: 'ER',
        name: '응급병동',
        isActive: true,
        isScheduleActive: true,
      },
    });

    const inputs = wrapper.findAll('input');
    expect((inputs[0].element as HTMLInputElement).value).toBe('ER');
    expect((inputs[1].element as HTMLInputElement).value).toBe('응급병동');
  });

  it('keeps the dirty baseline stable through in-place mutation and refreshes it on replacement', async () => {
    const parentState = reactive({
      modelValue: {
        id: 'site-1',
        organizationId: 'org-1',
        code: 'MAIN',
        name: '본관',
        isActive: true,
        isScheduleActive: true,
      },
    });

    const Harness = defineComponent({
      setup() {
        return () => h(SiteFoundationForm, {
          modelValue: parentState.modelValue,
          saving: false,
          status: 'saved',
          canSave: true,
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
        },
      },
    });

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('ER');

    parentState.modelValue.name = '변경된 이름';
    await wrapper.vm.$nextTick();

    expect((wrapper.findAll('input')[0].element as HTMLInputElement).value).toBe('ER');
    expect(wrapper.findComponent(SiteFoundationForm).emitted('dirty-change')).toEqual([[false], [true]]);

    parentState.modelValue = {
      id: 'site-2',
      organizationId: 'org-1',
      code: 'ICU',
      name: '중환자실',
      isActive: true,
      isScheduleActive: true,
    };

    await wrapper.vm.$nextTick();

    const refreshedInputs = wrapper.findAll('input');
    expect((refreshedInputs[0].element as HTMLInputElement).value).toBe('ICU');
    expect((refreshedInputs[1].element as HTMLInputElement).value).toBe('중환자실');
    expect(wrapper.findComponent(SiteFoundationForm).emitted('dirty-change')).toEqual([[false], [true], [false]]);
  });

  it('emits dirty-change when the local site diverges and returns to pristine', async () => {
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue(' MAIN ');
    await inputs[0].setValue('');

    expect(wrapper.emitted('dirty-change')).toEqual([[false], [true], [false]]);
  });

  it('treats surrounding whitespace as a no-op when baseline values already exist', async () => {
    const wrapper = mount(SiteFoundationForm, {
      props: {
        modelValue: {
          id: 'site-1',
          organizationId: 'org-1',
          code: 'MAIN',
          name: '본관',
          isActive: true,
          isScheduleActive: true,
        },
        saving: false,
        status: 'saved',
        canSave: true,
      },
      global: {
        stubs: {
          NCard: NCardStub,
          NButton: NButtonStub,
          NFormItem: NFormItemStub,
          NInput: NInputStub,
        },
      },
    });

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('  MAIN  ');
    await inputs[1].setValue('  본관  ');
    await wrapper.find('button').trigger('click');

    expect(wrapper.emitted('dirty-change')).toEqual([[false]]);
    expect(wrapper.emitted('save')).toEqual([
      [
        {
          code: 'MAIN',
          name: '본관',
        },
      ],
    ]);
  });
});
