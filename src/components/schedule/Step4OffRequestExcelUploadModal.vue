<template>
  <n-modal
    :show="show"
    preset="card"
    class="w-[min(92vw,720px)]"
    :mask-closable="false"
    @update:show="emit('update:show', $event)"
  >
    <template #header>
      <div class="space-y-1">
        <h3 class="text-base font-semibold text-slate-900">
          Off 요청 Excel 업로드
        </h3>
        <p class="text-sm text-slate-500">
          업로드한 Off 요청이 현재 입력값을 전부 대체합니다.
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div class="text-sm text-slate-600">
          현재 직원 목록이 포함된 템플릿을 내려받아 작성해 주세요.
        </div>
        <n-button
          data-test="off-request-template-download"
          size="small"
          secondary
          type="success"
          @click="handleDownloadTemplate"
        >
          템플릿 다운로드
        </n-button>
      </div>

      <n-upload
        accept=".xlsx,.xls"
        :max="1"
        :show-file-list="false"
        :custom-request="handleUpload"
      >
        <n-upload-dragger>
          <div class="flex min-h-32 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <p class="text-sm font-semibold text-slate-800">
              Excel 파일을 업로드하세요
            </p>
            <p class="text-xs text-slate-500">
              .xlsx, .xls 파일만 가능 (최대 5MB)
            </p>
          </div>
        </n-upload-dragger>
      </n-upload>

      <n-alert
        v-if="parseResult && parseResult.errors.length > 0"
        type="error"
      >
        <template #header>
          오류 {{ parseResult.errors.length }}건을 수정한 뒤 다시 업로드해 주세요.
        </template>
        <ul class="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
          <li
            v-for="(error, index) in parseResult.errors"
            :key="`${error.code}-${error.rowNumber ?? 'file'}-${index}`"
          >
            <span v-if="error.rowNumber">{{ error.rowNumber }}행: </span>{{ error.message }}
          </li>
        </ul>
      </n-alert>

      <n-alert
        v-else-if="parseResult && parseResult.ok && parseResult.requestCount > 0"
        type="success"
      >
        {{ parseResult.employeeCount }}명 / {{ parseResult.requestCount }}건 Off 요청이 현재 입력값을 전부 대체합니다.
      </n-alert>

      <n-alert
        v-else-if="parseResult && parseResult.ok && parseResult.requestCount === 0"
        type="info"
      >
        적용할 Off 요청이 없습니다.
      </n-alert>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button
          secondary
          @click="emit('update:show', false)"
        >
          닫기
        </n-button>
        <n-button
          data-test="off-request-excel-apply"
          type="success"
          :disabled="!canApply"
          @click="handleApply"
        >
          적용
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NAlert,
  NButton,
  NModal,
  NUpload,
  NUploadDragger,
  type UploadCustomRequestOptions,
} from 'naive-ui';
import type { Employee } from '@/types/employee';
import type { ConstraintMap, GridColumn } from '@/types/schedule';
import {
  downloadOffRequestTemplate,
  parseOffRequestExcelFile,
  type OffRequestExcelParseResult,
} from '@/utils/offRequestExcel';
import { showError, showSuccess } from '@/utils/message';

const props = defineProps<{
  show: boolean;
  employees: Employee[];
  dates: GridColumn[];
  month: string;
}>();

const emit = defineEmits<{
  (event: 'update:show', value: boolean): void;
  (event: 'apply', constraints: ConstraintMap): void;
}>();

const parseResult = ref<OffRequestExcelParseResult | null>(null);

const canApply = computed(() => {
  return parseResult.value?.ok === true && parseResult.value.requestCount > 0;
});

function handleDownloadTemplate(): void {
  try {
    downloadOffRequestTemplate(props.employees, props.month);
    showSuccess('Off 요청 템플릿을 다운로드했습니다.');
  } catch {
    showError('템플릿 다운로드 중 오류가 발생했습니다.');
  }
}

async function handleUpload(options: UploadCustomRequestOptions): Promise<void> {
  const file = options.file.file;
  if (!file) {
    options.onError();
    showError('Excel 파일을 확인해 주세요.');
    return;
  }

  try {
    const result = await parseOffRequestExcelFile(file, props.employees, props.dates);
    parseResult.value = result;

    if (!result.ok) {
      options.onError();
      showError('Excel 파일을 확인해 주세요.');
      return;
    }

    options.onFinish();
    showSuccess('Excel 검증을 완료했습니다.');
  } catch {
    parseResult.value = null;
    options.onError();
    showError('Excel 파일을 확인해 주세요.');
  }
}

function handleApply(): void {
  if (!canApply.value || !parseResult.value) return;
  emit('apply', parseResult.value.constraints);
}
</script>
