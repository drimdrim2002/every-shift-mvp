<template>
  <div>
    <h3 class="mb-4 text-xl font-semibold">
      엑셀 파일 업로드
    </h3>

    <n-upload
      ref="uploadRef"
      accept=".xlsx,.xls"
      :max="1"
      :custom-request="handleUpload"
      :on-remove="handleRemove"
      :show-file-list="true"
      :disabled="!canUpload"
    >
      <n-upload-dragger :class="{ 'cursor-not-allowed opacity-50': !canUpload }">
        <div class="py-8">
          <div class="mb-4 flex justify-center">
            <svg
              class="size-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div class="text-center">
            <p class="mb-2 text-base font-medium">
              클릭하거나 파일을 드래그하여 업로드
            </p>
            <p class="text-sm text-gray-500">
              .xlsx, .xls 파일만 가능 (최대 5MB)
            </p>
          </div>
        </div>
      </n-upload-dragger>
    </n-upload>

    <!-- 시프트 미설정 경고 -->
    <n-alert
      v-if="!canUpload"
      type="warning"
      class="mt-4"
    >
      시프트를 먼저 설정해주세요. 시프트가 최소 1개 이상 있어야 템플릿 다운로드 및 업로드가 가능합니다.
    </n-alert>

    <div class="mt-4 flex items-center justify-between">
      <n-alert
        v-if="canUpload"
        type="info"
        class="flex-1"
      >
        먼저 템플릿을 다운로드하여 데이터를 입력한 후 업로드하세요
      </n-alert>
      <n-button
        secondary
        class="ml-4"
        :disabled="!canDownload"
        @click="downloadTemplate"
      >
        📥 템플릿 다운로드
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { NUpload, NUploadDragger, NButton, NAlert, type UploadCustomRequestOptions } from 'naive-ui';
import * as XLSX from 'xlsx';
import { generateBlankTemplate } from '@/utils/excelTemplate';
import type { Shift } from '@/types/shift';

// Props
interface Props {
  shifts: Shift[];
  month: string; // YYYY-MM
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'file-selected', file: File): void;
  (e: 'template-download'): void;
}

const emit = defineEmits<Emits>();

// State
const uploadRef = ref();

// Computed
const canUpload = computed(() => props.shifts.length > 0 && props.month);
const canDownload = computed(() => props.shifts.length > 0 && props.month);

/**
 * 파일 업로드 핸들러 (custom-request)
 */
function handleUpload(options: UploadCustomRequestOptions) {
  const { file, onFinish, onError } = options;

  try {
    // 파일 타입 검증
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

    if (!['.xlsx', '.xls'].includes(fileExtension)) {
      window.$message?.error('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      onError();
      return;
    }

    // 파일 크기 검증 (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.file && file.file.size > maxSize) {
      window.$message?.error('파일 크기는 5MB를 초과할 수 없습니다.');
      onError();
      return;
    }

    // 검증 통과 - 부모에게 파일 전달
    if (file.file) {
      emit('file-selected', file.file);
      window.$message?.success('파일이 선택되었습니다.');
      onFinish();
    } else {
      onError();
    }
  } catch (error) {
    console.error('파일 업로드 에러:', error);
    window.$message?.error('파일 업로드 중 오류가 발생했습니다.');
    onError();
  }
}

/**
 * 파일 제거 핸들러
 */
function handleRemove() {
  window.$message?.info('파일이 제거되었습니다.');
  return true;
}

/**
 * 템플릿 다운로드 핸들러
 */
function downloadTemplate() {
  if (!canDownload.value) {
    window.$message?.warning('시프트를 먼저 설정해주세요.');
    return;
  }

  try {
    // 시프트 정보와 계획월을 전달하여 템플릿 생성
    const wb = generateBlankTemplate(props.shifts, props.month);

    // 파일 다운로드
    const filename = `everyshift_template_${props.month}.xlsx`;
    XLSX.writeFile(wb, filename);

    window.$message?.success('템플릿 다운로드가 완료되었습니다.');
    emit('template-download');
  } catch (error) {
    console.error('템플릿 다운로드 에러:', error);
    window.$message?.error('템플릿 다운로드 중 오류가 발생했습니다.');
  }
}
</script>
