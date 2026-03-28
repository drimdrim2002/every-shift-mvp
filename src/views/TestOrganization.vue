<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOrganizationStore } from '@/stores/organization'

const orgStore = useOrganizationStore()
const loadStatus = ref<string>('로딩 중...')
const error = ref<string>('')

onMounted(async () => {
  const result = await orgStore.loadOrganization('00000000-0000-0000-0000-000000000001')

  if (result.success) {
    loadStatus.value = '✅ 로드 완료!'
  } else {
    loadStatus.value = '❌ 로드 실패'
    error.value = result.error || 'Unknown error'
  }
})
</script>

<template>
  <div class="container mx-auto p-8">
    <h1 class="mb-6 text-3xl font-bold">
      Organization Store 테스트
    </h1>

    <div class="mb-8">
      <h2 class="mb-2 text-xl font-semibold">
        로딩 상태
      </h2>
      <p class="text-lg">
        {{ loadStatus }}
      </p>
      <p
        v-if="orgStore.loading"
        class="text-blue-600"
      >
        Loading...
      </p>
      <p
        v-if="error"
        class="text-red-600"
      >
        Error: {{ error }}
      </p>
    </div>

    <div
      v-if="orgStore.current"
      class="mb-8"
    >
      <h2 class="mb-2 text-xl font-semibold">
        조직 정보
      </h2>
      <div class="rounded bg-gray-100 p-4">
        <p><strong>ID:</strong> {{ orgStore.current.id }}</p>
        <p><strong>이름:</strong> {{ orgStore.current.name }}</p>
        <p><strong>타입:</strong> {{ orgStore.current.type }}</p>
        <p><strong>생성일:</strong> {{ orgStore.current.createdAt }}</p>
      </div>
    </div>

    <div
      v-if="orgStore.employees.length > 0"
      class="mb-8"
    >
      <h2 class="mb-2 text-xl font-semibold">
        직원 목록 ({{ orgStore.employees.length }}명)
      </h2>
      <div class="max-h-96 overflow-y-auto rounded bg-gray-100 p-4">
        <table class="w-full">
          <thead>
            <tr class="border-b">
              <th class="p-2 text-left">
                직번
              </th>
              <th class="p-2 text-left">
                이름
              </th>
              <th class="p-2 text-left">
                가능한 시프트
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="emp in orgStore.employees"
              :key="emp.id"
              class="border-b"
            >
              <td class="p-2">
                {{ emp.employeeId }}
              </td>
              <td class="p-2">
                {{ emp.name }}
              </td>
              <td class="p-2">
                {{ emp.availableShifts.join(', ') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="orgStore.shifts.length > 0"
      class="mb-8"
    >
      <h2 class="mb-2 text-xl font-semibold">
        시프트 정의 ({{ orgStore.shifts.length }}개)
      </h2>
      <div class="flex gap-4">
        <div
          v-for="shift in orgStore.shifts"
          :key="shift.id"
          class="flex-1 rounded p-4"
          :style="{ backgroundColor: shift.colorCode }"
        >
          <p class="font-bold">
            {{ shift.code }} - {{ shift.name }}
          </p>
          <p class="text-sm">
            {{ shift.startTime || 'N/A' }} - {{ shift.endTime || 'N/A' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
