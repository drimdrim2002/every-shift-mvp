import { defineStore } from 'pinia'
import { ref } from 'vue'
import { decideApproval, getApprovalRequest, listApprovalQueue } from '@/api/approval'
import type {
  ApprovalDecisionRequest,
  ApprovalDecisionSuccessData,
  ApprovalQueueFilters,
  ApprovalQueueItem,
  ApprovalRequestDetail,
} from '@/types/approval'

const DEFAULT_FILTERS: ApprovalQueueFilters = {
  status: 'pending',
}

export const useApprovalStore = defineStore('approval', () => {
  const filters = ref<ApprovalQueueFilters>({ ...DEFAULT_FILTERS })
  const items = ref<ApprovalQueueItem[]>([])
  const selectedRequestId = ref<string | null>(null)
  const selectedRequest = ref<ApprovalRequestDetail | null>(null)
  const loadingQueue = ref(false)
  const loadingDetail = ref(false)
  const submittingDecision = ref(false)

  async function selectRequest(signupRequestId: string | null) {
    selectedRequestId.value = signupRequestId
    if (!signupRequestId) {
      selectedRequest.value = null
      return null
    }

    loadingDetail.value = true
    try {
      const detail = await getApprovalRequest(signupRequestId)
      selectedRequest.value = detail
      return detail
    } finally {
      loadingDetail.value = false
    }
  }

  async function loadQueue(nextFilters: ApprovalQueueFilters = filters.value) {
    filters.value = {
      ...DEFAULT_FILTERS,
      ...nextFilters,
    }

    loadingQueue.value = true
    try {
      const queueItems = await listApprovalQueue(filters.value)
      items.value = queueItems

      const selectedStillExists = selectedRequestId.value
        ? queueItems.some((item) => item.signupRequestId === selectedRequestId.value)
        : false

      if (selectedStillExists) {
        await selectRequest(selectedRequestId.value)
        return queueItems
      }

      const nextSelectionId = queueItems[0]?.signupRequestId ?? null
      await selectRequest(nextSelectionId)
      return queueItems
    } finally {
      loadingQueue.value = false
    }
  }

  async function submitDecision(
    input: ApprovalDecisionRequest,
  ): Promise<ApprovalDecisionSuccessData> {
    submittingDecision.value = true
    try {
      const result = await decideApproval(input)
      await loadQueue(filters.value)
      return result
    } finally {
      submittingDecision.value = false
    }
  }

  return {
    filters,
    items,
    selectedRequestId,
    selectedRequest,
    loadingQueue,
    loadingDetail,
    submittingDecision,
    loadQueue,
    selectRequest,
    submitDecision,
  }
})
