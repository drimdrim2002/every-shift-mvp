<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="`${formattedDate} 요약`"
    class="w-[600px]"
    @after-leave="handleClose"
  >
    <div v-if="summaryList.length === 0" class="text-center py-8 text-gray-500">
      입력된 제약 사항이나 특이사항이 없습니다.
    </div>

    <n-table v-else :bordered="false" :single-line="false">
      <thead>
        <tr>
          <th class="w-24">직원</th>
          <th class="w-20 text-center">신청</th>
          <th>사유 / 코멘트</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in summaryList" :key="item.employeeId">
          <td class="font-medium">{{ item.name }}</td>
          <td class="text-center">
            <n-tag :type="getTagType(item.constraint)" size="small">
              {{ item.constraint || '-' }}
            </n-tag>
          </td>
          <td class="text-gray-600">
            {{ item.comment || '-' }}
          </td>
        </tr>
      </tbody>
    </n-table>

    <template #footer>
      <div class="flex justify-end">
        <n-button @click="closeModal">닫기</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NModal, NTable, NTag, NButton } from 'naive-ui';
import type { Employee } from '@/types/employee';
import type { AssignmentMap, CommentMap } from '@/types/schedule';

interface Props {
  show: boolean;
  date: string;
  employees: Employee[];
  assignments: AssignmentMap;
  comments: CommentMap;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'close'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
});

const formattedDate = computed(() => {
  if (!props.date) return '';
  const [year, month, day] = props.date.split('-');
  return `${month}월 ${day}일`;
});

const summaryList = computed(() => {
  if (!props.date) return [];

  const list = [];
  for (const emp of props.employees) {
    const constraint = props.assignments[emp.id]?.[props.date];
    const comment = props.comments[emp.id]?.[props.date];

    // 제약사항(H, E, O)이 있거나 코멘트가 있는 경우만 표시
    if (constraint || comment) {
      list.push({
        employeeId: emp.id,
        name: emp.name,
        constraint,
        comment,
      });
    }
  }
  return list;
});

function getTagType(constraint: string | undefined) {
  switch (constraint) {
    case 'H': return 'info';    // Holiday - purpleish/blueish in Naive UI terms usually 'info' or 'primary'
    case 'E': return 'warning'; // Education - orangeish
    case 'O': return 'default'; // Off - gray
    default: return 'default';
  }
}

function closeModal() {
  showModal.value = false;
}

function handleClose() {
  emit('close');
}
</script>
