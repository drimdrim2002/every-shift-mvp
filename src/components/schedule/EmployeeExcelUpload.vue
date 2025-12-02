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
              </tr>
              <tr>
                <td class="border border-gray-300 px-3 py-2">
                  (자동생성)
                </td>
                <td class="border border-gray-300 px-3 py-2">
                  김철수
                </td>
                <td class="border border-gray-300 px-3 py-2">
                  D,E
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

// Props
interface Props {
  shifts: Shift[];
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
          header: ['employeeId', 'name', 'availableShifts'],
          range: 1, // 헤더 행 건너뛰기
        });

        // 유효한 시프트 코드 목록 (O는 제외)
        const validShiftCodes = props.shifts
          .filter((s) => s.code !== 'O')
          .map((s) => s.code.toUpperCase());

        // 데이터 변환 및 검증
        const employees: EmployeeInput[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          const rowNum = index + 2; // 헤더 + 1-indexed

          // 이름 필수 검증 (숫자도 문자열로 변환)
          const nameValue = row.name ? String(row.name).trim() : '';
          if (!nameValue) {
            errors.push(`${rowNum}행: 이름이 비어있습니다.`);
            return;
          }

          // 가능 시프트 파싱 (숫자도 문자열로 변환)
          const shiftsStr = row.availableShifts ? String(row.availableShifts) : '';
          const shiftCodes = shiftsStr
            .split(/[,\s]+/)
            .map((s) => s.trim().toUpperCase())
            .filter((s) => s !== '');

          // 시프트 유효성 검증
          const validShifts = shiftCodes.filter((s) => validShiftCodes.includes(s));

          if (validShifts.length === 0) {
            errors.push(`${rowNum}행: 유효한 시프트가 없습니다. (가능: ${validShiftCodes.join(', ')})`);
            return;
          }

          // 직원 ID 생성 (비어있으면 자동 생성, 숫자도 문자열로 변환)
          const employeeIdValue = row.employeeId ? String(row.employeeId).trim() : '';
          const employeeId = employeeIdValue || generateEmployeeId();

          employees.push({
            employeeId,
            name: nameValue,
            availableShifts: validShifts,
          });
        });

        if (errors.length > 0) {
          reject(new Error(`데이터 오류:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... 외 ${errors.length - 5}건` : ''}`));
          return;
        }

        if (employees.length === 0) {
          reject(new Error('유효한 직원 데이터가 없습니다.'));
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
 * 자동 직원 ID 생성
 */
function generateEmployeeId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `EMP${timestamp}${random}`;
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
      ['직원ID', '이름', '가능시프트'],
      ['EMP001', '홍길동', shiftCodesStr],
      ['EMP002', '김철수', shiftCodesStr],
      ['', '박영희', shiftCodesStr], // 직원ID 자동 생성 예시
    ];

    // 워크시트 생성
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

    // 열 너비 설정
    worksheet['!cols'] = [
      { wch: 15 }, // 직원ID
      { wch: 20 }, // 이름
      { wch: 25 }, // 가능시프트
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

