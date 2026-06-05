import { computed, ref, watch, type Ref } from 'vue'
import type { SelectOption } from 'naive-ui'
import { searchHospitals } from '@/api/hospital'
import { showInfo } from '@/utils/message'

interface HospitalSearchFeedback {
  type: 'empty' | 'error'
  keyword: string
}

interface UseHospitalSearchOptions {
  hospitalName: Ref<string>
  hospitalId: Ref<string | null>
}

export function useHospitalSearch({ hospitalName, hospitalId }: UseHospitalSearchOptions) {
  const hospitalSearchFieldRef = ref<HTMLElement | null>(null)
  const hospitalLoading = ref(false)
  const hospitalOptions = ref<SelectOption[]>([])
  const hospitalSearchFeedback = ref<HospitalSearchFeedback | null>(null)

  const canSearchHospital = computed(() => hospitalName.value.trim().length >= 2)

  watch(hospitalName, (nextHospitalName) => {
    if (hospitalSearchFeedback.value && hospitalSearchFeedback.value.keyword !== nextHospitalName.trim()) {
      hospitalSearchFeedback.value = null
    }

    if (!hospitalId.value) {
      return
    }

    const selectedHospitalName = resolveSelectedHospitalName(hospitalId.value)
    if (!selectedHospitalName || selectedHospitalName !== nextHospitalName.trim()) {
      hospitalId.value = null
    }
  })

  function resolveHospitalSearchKeyword(): string {
    const inputValue = hospitalSearchFieldRef.value?.querySelector('input')?.value
    const keyword = (inputValue ?? hospitalName.value).trim()

    if (keyword !== hospitalName.value) {
      hospitalName.value = keyword
    }

    return keyword
  }

  function resolveSelectedHospitalName(nextHospitalId: string | null): string | null {
    if (!nextHospitalId) {
      return null
    }

    const option = hospitalOptions.value.find((candidate) => candidate.value === nextHospitalId)
    return option?.label?.toString().trim() || null
  }

  function handleHospitalSelect(value: string | null) {
    hospitalId.value = value

    const selectedName = resolveSelectedHospitalName(value)
    if (selectedName) {
      hospitalName.value = selectedName
    }
  }

  async function handleHospitalSearch() {
    const keyword = resolveHospitalSearchKeyword()

    if (keyword.length < 2) {
      showInfo('병원명을 2글자 이상 입력하세요.')
      return
    }

    hospitalLoading.value = true

    try {
      const items = await searchHospitals(keyword)
      hospitalOptions.value = items.map((item) => ({
        label: item.name,
        value: item.id,
      }))

      if (hospitalOptions.value.length === 0) {
        hospitalSearchFeedback.value = {
          type: 'empty',
          keyword,
        }
        showInfo('검색 결과가 없어도 병원명을 직접 입력하고 가입 신청할 수 있습니다.')
        return
      }

      hospitalSearchFeedback.value = null
    } catch {
      hospitalSearchFeedback.value = {
        type: 'error',
        keyword,
      }
      showInfo('병원 검색이 원활하지 않습니다. 병원명을 직접 입력해 가입을 계속 진행할 수 있습니다.')
    } finally {
      hospitalLoading.value = false
    }
  }

  function resetHospitalSearchState() {
    hospitalSearchFeedback.value = null
    hospitalOptions.value = []
  }

  return {
    hospitalSearchFieldRef,
    hospitalLoading,
    hospitalOptions,
    hospitalSearchFeedback,
    canSearchHospital,
    handleHospitalSelect,
    handleHospitalSearch,
    resetHospitalSearchState,
  }
}
