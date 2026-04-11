import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OffRequestPolicyTable from '@/components/ops/OffRequestPolicyTable.vue'

const NCardStub = {
  template: '<div><slot /></div>',
}

const NButtonStub = {
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
}

const NInputStub = {
  props: {
    value: {
      type: String,
      default: '',
    },
  },
  emits: ['update:value'],
  template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
}

const NInputNumberStub = {
  props: {
    value: {
      type: Number,
      default: 0,
    },
  },
  emits: ['update:value'],
  template: '<input type="number" :value="value" @input="$emit(\'update:value\', Number($event.target.value))" />',
}

const NSelectStub = {
  props: {
    value: {
      type: [String, null],
      default: null,
    },
    options: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:value'],
  template: `
    <select :value="value ?? ''" @change="$emit('update:value', $event.target.value || null)">
      <option value="">default</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  `,
}

const NSwitchStub = {
  props: {
    value: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:value'],
  template: '<input type="checkbox" :checked="value" @change="$emit(\'update:value\', $event.target.checked)" />',
}

const globalStubs = {
  NCard: NCardStub,
  NButton: NButtonStub,
  NInput: NInputStub,
  NInputNumber: NInputNumberStub,
  NSelect: NSelectStub,
  NSwitch: NSwitchStub,
}

describe('OffRequestPolicyTable', () => {
  it('seeds default organization-wide annual and monthly policies on an empty setup', async () => {
    const wrapper = mount(OffRequestPolicyTable, {
      props: {
        modelValue: {
          organizationId: '00000000-0000-0000-0000-000000000001',
          rankCodes: [],
          policyRules: [],
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('기준 저장'))
      ?.trigger('click')

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      organizationId: '00000000-0000-0000-0000-000000000001',
      rankCodes: [],
      policyRules: [
        {
          rankCode: null,
          periodType: 'annual',
          limitCount: 16,
          isActive: true,
        },
        {
          rankCode: null,
          periodType: 'monthly',
          limitCount: 4,
          isActive: true,
        },
      ],
    })
  })

  it('keeps the rank code input mounted while typing', async () => {
    const wrapper = mount(OffRequestPolicyTable, {
      props: {
        modelValue: {
          organizationId: '00000000-0000-0000-0000-000000000001',
          rankCodes: [],
          policyRules: [],
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    const firstCodeInput = wrapper.find('tbody input')
    const firstCodeInputElement = firstCodeInput.element

    await firstCodeInput.setValue('R')

    expect(wrapper.find('tbody input').element).toBe(firstCodeInputElement)
  })

  it('omits blank rank-code drafts when saving a default-only policy', async () => {
    const wrapper = mount(OffRequestPolicyTable, {
      props: {
        modelValue: {
          organizationId: '00000000-0000-0000-0000-000000000001',
          rankCodes: [],
          policyRules: [
            {
              id: 'policy-default',
              organizationId: '00000000-0000-0000-0000-000000000001',
              rankCode: null,
              periodType: 'monthly',
              limitCount: 4,
              isActive: true,
            },
          ],
        },
      },
      global: {
        stubs: globalStubs,
      },
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('기준 저장'))
      ?.trigger('click')

    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      organizationId: '00000000-0000-0000-0000-000000000001',
      rankCodes: [],
      policyRules: [
        {
          id: 'policy-default',
          rankCode: null,
          periodType: 'monthly',
          limitCount: 4,
          isActive: true,
        },
      ],
    })
  })
})
