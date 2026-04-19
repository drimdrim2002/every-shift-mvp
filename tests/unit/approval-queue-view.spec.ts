/* eslint-disable vue/one-component-per-file */

import { mount, flushPromises } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

const {
  replaceMock,
  loadQueueMock,
  selectRequestMock,
  submitDecisionMock,
  showErrorMock,
  showSuccessMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  loadQueueMock: vi.fn(),
  selectRequestMock: vi.fn(),
  submitDecisionMock: vi.fn(),
  showErrorMock: vi.fn(),
  showSuccessMock: vi.fn(),
}))

const rbacState = {
  accessState: ref<'super_active' | 'admin_active'>('super_active'),
}

const approvalStoreState = reactive({
  items: [
    {
      signupRequestId: 'req-1',
      requesterUserId: 'user-1',
      requesterEmail: 'nurse1@example.com',
      requesterName: null,
      organizationId: 'org-1',
      organizationName: null,
      requestedRole: 'admin',
      status: 'pending',
      createdAt: '2026-04-17T01:00:00.000Z',
    },
  ],
  selectedRequestId: 'req-1',
  selectedRequest: {
    signupRequestId: 'req-1',
    requesterUserId: 'user-1',
    requesterEmail: 'nurse1@example.com',
    requesterName: null,
    organizationId: 'org-1',
    organizationName: '용인아이들병원',
    requestedRole: 'admin',
    status: 'pending',
    createdAt: '2026-04-17T01:00:00.000Z',
    requestedHospitalName: '용인아이들병원',
    reviewNote: null,
  },
  loadingQueue: false,
  loadingDetail: false,
  submittingDecision: false,
  loadQueue: loadQueueMock,
  selectRequest: selectRequestMock,
  submitDecision: submitDecisionMock,
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}))

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => ({
    accessState: rbacState.accessState.value,
  }),
}))

vi.mock('@/stores/approval', () => ({
  useApprovalStore: () => approvalStoreState,
}))

vi.mock('@/utils/message', () => ({
  showError: showErrorMock,
  showSuccess: showSuccessMock,
}))

vi.mock('naive-ui', () => {
  const passthrough = (tag: string) =>
    defineComponent({
      inheritAttrs: false,
      setup(_, { slots, attrs }) {
        return () => h(tag, attrs, slots.default?.())
      },
    })

  return {
    NButton: defineComponent({
      props: {
        disabled: Boolean,
        loading: Boolean,
        tertiary: Boolean,
        type: {
          type: String,
          default: 'default',
        },
      },
      emits: ['click'],
      setup(props, { slots, emit, attrs }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              disabled: props.disabled || props.loading,
              onClick: () => emit('click'),
            },
            slots.default?.(),
          )
      },
    }),
    NCard: passthrough('section'),
    NEmpty: passthrough('div'),
    NInput: defineComponent({
      props: {
        value: {
          type: String,
          default: '',
        },
        type: {
          type: String,
          default: 'text',
        },
      },
      emits: ['update:value'],
      setup(props, { emit, attrs }) {
        return () =>
          h('textarea', {
            ...attrs,
            value: props.value,
            onInput: (event: Event) =>
              emit('update:value', (event.target as HTMLTextAreaElement).value),
          })
      },
    }),
    NSpin: passthrough('div'),
  }
})

import ApprovalQueueView from '@/views/admin/ApprovalQueueView.vue'

describe('ApprovalQueueView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rbacState.accessState.value = 'super_active'
    approvalStoreState.selectedRequestId = 'req-1'
    approvalStoreState.selectedRequest = {
      signupRequestId: 'req-1',
      requesterUserId: 'user-1',
      requesterEmail: 'nurse1@example.com',
      requesterName: null,
      organizationId: 'org-1',
      organizationName: '용인아이들병원',
      requestedRole: 'admin',
      status: 'pending',
      createdAt: '2026-04-17T01:00:00.000Z',
      requestedHospitalName: '용인아이들병원',
      reviewNote: null,
    }
    loadQueueMock.mockResolvedValue(undefined)
    submitDecisionMock.mockResolvedValue({
      requestStatus: 'approved',
    })
  })

  it('redirects non-super users away from the approval queue', async () => {
    rbacState.accessState.value = 'admin_active'

    mount(ApprovalQueueView)
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith('/')
    expect(loadQueueMock).not.toHaveBeenCalled()
  })

  it('loads the queue for super users and submits approve action with the note', async () => {
    const wrapper = mount(ApprovalQueueView)
    await flushPromises()

    expect(loadQueueMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('이메일')
    expect(wrapper.text()).toContain('nurse1@example.com')
    expect(wrapper.get('[data-test="approval-detail-email"]').text()).toContain('nurse1@example.com')
    expect(wrapper.get('[data-test="approval-detail-hospital"]').text()).toContain('용인아이들병원')
    expect(wrapper.find('[data-test="approval-detail-organization"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('근무 형태')
    expect(wrapper.text()).not.toContain('교대 유형')
    expect(wrapper.text()).not.toContain('요청 역량')
    expect(wrapper.text()).not.toContain('요청 직급 / 크레딧')

    await wrapper.get('[data-test="approval-review-note"]').setValue('승인 메모')
    await wrapper.get('[data-test="approval-approve"]').trigger('click')
    await flushPromises()

    expect(submitDecisionMock).toHaveBeenCalledWith({
      signupRequestId: 'req-1',
      decision: 'approve',
      reviewNote: '승인 메모',
    })
    expect(showSuccessMock).toHaveBeenCalledWith('가입 요청을 승인했습니다.')
  })

  it('shows organization only when requested hospital is missing', async () => {
    approvalStoreState.selectedRequest = {
      signupRequestId: 'req-1',
      requesterUserId: 'user-1',
      requesterEmail: 'nurse1@example.com',
      requesterName: null,
      organizationId: 'org-1',
      organizationName: '용인아이들병원',
      requestedRole: 'admin',
      status: 'pending',
      createdAt: '2026-04-17T01:00:00.000Z',
      requestedHospitalName: null,
      reviewNote: null,
    }

    const wrapper = mount(ApprovalQueueView)
    await flushPromises()

    expect(wrapper.get('[data-test="approval-detail-organization"]').text()).toContain('용인아이들병원')
  })
})
