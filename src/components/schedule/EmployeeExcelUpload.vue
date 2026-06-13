<template>
  <div>
    <n-upload
      ref="uploadRef"
      accept=".xlsx,.xls"
      :max="1"
      :custom-request="handleUpload"
      :on-remove="handleRemove"
      :show-file-list="true"
    >
      <n-upload-dragger>
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

    <div class="mt-4 flex items-center justify-between">
      <n-alert
        type="info"
        class="flex-1"
      >
        템플릿을 다운로드하여 직원 정보를 입력한 후 업로드하세요
      </n-alert>
      <n-button
        secondary
        class="ml-4"
        @click="downloadTemplate"
      >
        📥 직원 템플릿 다운로드
      </n-button>
    </div>

    <n-alert
      v-if="validationPreview"
      :type="validationPreview.isFinalized ? 'error' : validationPreview.isValid ? 'success' : 'warning'"
      class="mt-4"
    >
      <div class="space-y-1">
        <p class="font-medium">
          검증 결과
        </p>
        <p>
          직원 {{ validationPreview.employeeCount }}명 미리보기를 완료했습니다.
        </p>
        <p v-if="validationPreview.duplicateEmployeeIds.length > 0">
          중복 직원 ID: {{ validationPreview.duplicateEmployeeIds.join(', ') }}
        </p>
        <p v-if="validationPreview.missingShiftCodes.length > 0">
          누락 시프트: {{ validationPreview.missingShiftCodes.join(', ') }}
        </p>
        <p v-if="validationPreview.isFinalized">
          현재 월은 확정되어 적용할 수 없습니다.
        </p>
        <p v-else-if="validationPreview.isValid">
          적용 가능 상태입니다.
        </p>
        <p v-else>
          적용 전에 오류를 수정해주세요.
        </p>
      </div>
    </n-alert>

    <!-- 엑셀 형식 안내 -->
    <n-collapse class="mt-4">
      <n-collapse-item
        title="엑셀 형식 안내"
        name="format"
      >
        <div class="text-sm text-gray-600">
          <p class="mb-2">
            엑셀 파일은 다음 형식으로 작성해주세요:
          </p>
          <table class="w-full border-collapse border border-gray-300 text-left">
            <thead>
              <tr class="bg-gray-50">
                <th class="border border-gray-300 px-3 py-2">
                  직원ID (선택)
                </th>
                <th class="border border-gray-300 px-3 py-2">
                  이름 (필수)
                </th>
                <th class="border border-gray-300 px-3 py-2">
                  가능시프트 (필수)
                </th>
                <th class="border border-gray-300 px-3 py-2">
                  프리셉터직번 (선택)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 px-3 py-2">
                  EMP001
                </td>
                <td class="border border-gray-300 px-3 py-2">
                  홍길동
                </td>
                <td class="border border-gray-300 px-3 py-2">
                  D,E,N
                </td>
                <td class="border border-gray-300 px-3 py-2" />
              </tr>
              <tr>
                <td class="border border-gray-300 px-3 py-2">
                  EMP002
                </td>
                <td class="border border-gray-300 px-3 py-2">
                  김철수
                </td>
                <td class="border border-gray-300 px-3 py-2">
                  D,E
                </td>
                <td class="border border-gray-300 px-3 py-2">
                  EMP001
                </td>
              </tr>
            </tbody>
          </table>
          <p class="mt-2 text-xs text-gray-500">
            * 가능시프트는 콤마(,)로 구분하여 입력합니다.
          </p>
        </div>
      </n-collapse-item>
    </n-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NUpload,
  NUploadDragger,
  NButton,
  NAlert,
  NCollapse,
  NCollapseItem,
  type UploadCustomRequestOptions,
} from 'naive-ui';
import * as XLSX from 'xlsx';
import type { Shift } from '@/types/shift';
import type { EmployeeInput } from '@/types/employee';
import type { EmployeeImportValidateResponse } from '@/types/ops';
import { parseEmployeeExcelRows } from '@/utils/employeeExcelParser';
import { validatePreceptorExcelRows } from '@/utils/preceptorValidation';

// Props
interface Props {
  shifts: Shift[];
  validationPreview: EmployeeImportValidateResponse | null;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'upload', employees: EmployeeInput[]): void;
}

const emit = defineEmits<Emits>();

// State
const uploadRef = ref();

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
    const maxSize = 5 * 1024 * 1024;
    if (file.file && file.file.size > maxSize) {
      window.$message?.error('파일 크기는 5MB를 초과할 수 없습니다.');
      onError();
      return;
    }

    // 파일 파싱
    if (file.file) {
      parseExcelFile(file.file)
        .then((employees) => {
          emit('upload', employees);
          onFinish();
        })
        .catch((error) => {
          window.$message?.error(error.message || '파일 파싱 중 오류가 발생했습니다.');
          onError();
        });
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
 * 엑셀 파일 파싱
 */
async function parseExcelFile(file: File): Promise<EmployeeInput[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // 첫 번째 시트 사용
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('엑셀 파일에 시트가 없습니다.'));
          return;
        }
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          reject(new Error('엑셀 시트를 읽을 수 없습니다.'));
          return;
        }

        // 시트를 JSON으로 변환
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
          header: ['employeeId', 'name', 'availableShifts', 'preceptorEmployeeId'],
          range: 1, // 헤더 행 건너뛰기
        });

        // 유효한 시프트 코드 목록 (O는 제외)
        const validShiftCodes = props.shifts
          .filter((s) => s.code !== 'O')
          .map((s) => s.code.toUpperCase());

        const { employees, errors } = parseEmployeeExcelRows(jsonData, validShiftCodes);

        if (errors.length > 0) {
          reject(new Error(`데이터 오류:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... 외 ${errors.length - 5}건` : ''}`));
          return;
        }

        if (employees.length === 0) {
          reject(new Error('유효한 직원 데이터가 없습니다.'));
          return;
        }

        const preceptorErrors = validatePreceptorExcelRows(employees);
        if (preceptorErrors.length > 0) {
          reject(new Error(preceptorErrors.map((error) => error.message).join('\n')));
          return;
        }

        resolve(employees);
      } catch (error) {
        console.error('엑셀 파싱 에러:', error);
        const errorMessage = error instanceof Error ? error.message : '엑셀 파일 형식이 올바르지 않습니다.';
        reject(new Error(`엑셀 파일 형식이 올바르지 않습니다. (${errorMessage})`));
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * 템플릿 다운로드 핸들러
 */
function downloadTemplate() {
  try {
    // 워크북 생성
    const wb = XLSX.utils.book_new();

    // 시프트 코드 문자열 (O는 제외)
    const shiftCodesStr = props.shifts
      .filter((s) => s.code !== 'O')
      .map((s) => s.code)
      .join(',');

    // 샘플 데이터
    const sampleData = [
      ['직원ID', '이름', '가능시프트', '프리셉터직번'],
      ['EMP001', '홍길동', shiftCodesStr, ''],
      ['EMP002', '김철수', shiftCodesStr, 'EMP001'],
    ];

    // 워크시트 생성
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

    // 열 너비 설정
    worksheet['!cols'] = [
      { wch: 15 }, // 직원ID
      { wch: 20 }, // 이름
      { wch: 25 }, // 가능시프트
      { wch: 18 }, // 프리셉터직번
    ];

    XLSX.utils.book_append_sheet(wb, worksheet, '직원정보');

    // 파일 다운로드
    XLSX.writeFile(wb, 'everyshift_employee_template.xlsx');

    window.$message?.success('템플릿 다운로드가 완료되었습니다.');
  } catch (error) {
    console.error('템플릿 다운로드 에러:', error);
    window.$message?.error('템플릿 다운로드 중 오류가 발생했습니다.');
  }
}
</script>
