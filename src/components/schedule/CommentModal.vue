<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="코멘트 입력"
    class="w-[400px]"
    @after-leave="handleClose"
  >
    <div class="space-y-4">
      <div>
        <p class="mb-1 text-gray-600">
          <span class="font-bold">{{ employeeName }}</span> - {{ formattedDate }}
        </p>
        <p class="text-xs text-gray-500">
          제약 사항이나 특이사항을 입력해주세요.
        </p>
      </div>

      <n-input
        v-model:value="commentValue"
        type="textarea"
        placeholder="내용을 입력하세요..."
        :rows="3"
        autofocus
      />
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="closeModal">
          취소
        </n-button>
        <n-button
          type="primary"
          @click="save"
        >
          저장
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NModal, NInput, NButton } from 'naive-ui';

interface Props {
  show: boolean;
  initialValue?: string;
  employeeName: string;
  date: string;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'save', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const commentValue = ref('');

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
});

const formattedDate = computed(() => {
  if (!props.date) return '';
  const [, month, day] = props.date.split('-');
  return `${month}월 ${day}일`;
});

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      commentValue.value = props.initialValue || '';
    }
  }
);

function closeModal() {
  showModal.value = false;
}

function handleClose() {
  // Reset logic if needed
}

function save() {
  emit('save', commentValue.value);
  closeModal();
}
</script>
