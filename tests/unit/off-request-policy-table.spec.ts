import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OffRequestPolicyTable from '@/components/ops/OffRequestPolicyTable.vue'

describe('OffRequestPolicyTable', () => {
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
        stubs: {
          NCard: { template: '<div><slot /></div>' },
          NButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          NInput: { template: '<input />' },
          NInputNumber: { template: '<input />' },
          NSelect: { template: '<select />' },
          NSwitch: { template: '<input type="checkbox" />' },
        },
      },
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('정책 저장'))
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
