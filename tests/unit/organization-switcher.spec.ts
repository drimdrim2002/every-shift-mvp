import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const selectOrganizationMock = vi.fn()

const rbacStoreMock = reactive({
  organizationOptions: [
    {
      id: 'org-1',
      name: '서울병원',
      membershipRole: 'admin' as const,
    },
    {
      id: 'org-2',
      name: '부산병원',
      membershipRole: 'admin' as const,
    },
  ],
  selectedOrganizationId: 'org-1',
  selectOrganization: selectOrganizationMock,
})

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreMock,
}))

vi.mock('naive-ui', async () => {
  const { defineComponent } = await import('vue')

  return {
    NSelect: defineComponent({
      name: 'NSelect',
      props: {
        value: {
          type: String,
          default: '',
        },
        options: {
          type: Array,
          default: () => [],
        },
        disabled: Boolean,
        placeholder: {
          type: String,
          default: '',
        },
      },
      emits: ['update:value'],
      template: `
        <select
          v-bind="$attrs"
          :disabled="disabled"
          :value="value ?? ''"
          @change="$emit('update:value', $event.target.value || null)"
        >
          <option value="">{{ placeholder }}</option>
          <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      `,
    }),
  }
})

import OrganizationSwitcher from '@/components/layout/OrganizationSwitcher.vue'

describe('OrganizationSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rbacStoreMock.organizationOptions = [
      {
        id: 'org-1',
        name: '서울병원',
        membershipRole: 'admin',
      },
      {
        id: 'org-2',
        name: '부산병원',
        membershipRole: 'admin',
      },
    ]
    rbacStoreMock.selectedOrganizationId = 'org-1'
  })

  it('renders the current selection and switches organizations', async () => {
    const wrapper = mount(OrganizationSwitcher)

    expect(wrapper.text()).toContain('선택한 조직')
    expect(wrapper.text()).toContain('서울병원')
    expect(wrapper.text()).toContain('부산병원 (관리자)')

    await wrapper.get('select').setValue('org-2')

    expect(selectOrganizationMock).toHaveBeenCalledWith('org-2')
  })

  it('disables selection when there is only one available organization', () => {
    rbacStoreMock.organizationOptions = [
      {
        id: 'org-1',
        name: '서울병원',
        membershipRole: 'admin',
      },
    ]

    const wrapper = mount(OrganizationSwitcher)

    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
  })

  it('renders superuser organization options without the admin suffix', () => {
    rbacStoreMock.organizationOptions = [
      {
        id: 'org-1',
        name: '서울병원',
        membershipRole: null,
      },
      {
        id: 'org-2',
        name: '부산병원',
        membershipRole: null,
      },
    ]

    const wrapper = mount(OrganizationSwitcher)

    expect(wrapper.text()).toContain('부산병원')
    expect(wrapper.text()).not.toContain('부산병원 (관리자)')
  })
})
