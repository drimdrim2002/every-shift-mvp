import { watchDebounced } from '@vueuse/core';
import type { Ref } from 'vue';
import { useScheduleStore } from '@/stores/schedule';
import type { AssignmentMap } from '@/types/schedule';

// localStorage 데이터 버전
const STORAGE_VERSION = 1;

interface StoredData {
  version: number;
  assignments: AssignmentMap;
  savedAt: string;
}

/**
 * 스케줄 그리드 LocalStorage persistence composable
 *
 * Step 3에서 사용자가 입력한 데이터를 임시 저장하고 복원하는 기능 제공
 * - Auto-save (500ms debounced)
 * - 버전 관리로 데이터 구조 변경 대응
 * - 저장 데이터 존재 여부 확인
 */
export function useScheduleGridPersistence(assignments: Ref<AssignmentMap>) {
  const scheduleStore = useScheduleStore();

  /**
   * Storage key 생성
   * @returns localStorage key (예: "everyshift_temp_schedule_2025-12")
   * @throws {Error} 월 정보가 없을 경우
   */
  function getStorageKey(): string {
    const month = scheduleStore.basicInfo?.month;
    if (!month) {
      throw new Error('Month not selected');
    }
    return `everyshift_temp_schedule_${month}`;
  }

  /**
   * LocalStorage에서 복원
   * @returns 복원 성공 여부
   */
  function restoreFromStorage(): boolean {
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);

      if (!saved) {
        console.log('No saved data found');
        return false;
      }

      const data: StoredData = JSON.parse(saved);

      // 버전 체크
      if (data.version !== STORAGE_VERSION) {
        console.warn(`Storage version mismatch: ${data.version} vs ${STORAGE_VERSION}`);
        // 필요시 데이터 마이그레이션 로직 추가
        return false;
      }

      // Assignments 복원
      assignments.value = data.assignments;

      const savedTime = new Date(data.savedAt).toLocaleString('ko-KR');
      console.log(`Restored from localStorage: ${savedTime}`);
      window.$message?.success(`저장된 데이터를 불러왔습니다 (${savedTime})`);

      return true;
    } catch (error) {
      console.error('Failed to restore from localStorage:', error);
      return false;
    }
  }

  /**
   * LocalStorage에 저장 (즉시)
   */
  function saveToStorage() {
    try {
      const key = getStorageKey();
      const data: StoredData = {
        version: STORAGE_VERSION,
        assignments: assignments.value,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(key, JSON.stringify(data));
      console.log('Saved to localStorage');
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  /**
   * LocalStorage에서 삭제
   */
  function clearStorage() {
    try {
      const key = getStorageKey();
      localStorage.removeItem(key);
      console.log('Cleared localStorage');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  /**
   * Auto-save 설정 (500ms debounce)
   *
   * assignments 값이 변경될 때마다 500ms 후 자동 저장
   * deep: true로 중첩된 객체 변경도 감지
   */
  function setupAutoSave() {
    watchDebounced(
      assignments,
      () => {
        saveToStorage();
      },
      { debounce: 500, deep: true },
    );

    console.log('Auto-save enabled (500ms debounce)');
  }

  /**
   * 저장된 데이터 존재 여부 확인
   * @returns 저장된 데이터 존재 여부
   */
  function hasSavedData(): boolean {
    try {
      const key = getStorageKey();
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  /**
   * 저장된 데이터 정보 가져오기
   * @returns 저장 시간 및 버전 정보 (없으면 null)
   */
  function getSavedDataInfo(): { savedAt: string; version: number } | null {
    try {
      const key = getStorageKey();
      const saved = localStorage.getItem(key);

      if (!saved) return null;

      const data: StoredData = JSON.parse(saved);
      return {
        savedAt: data.savedAt,
        version: data.version,
      };
    } catch {
      return null;
    }
  }

  return {
    // Methods
    restoreFromStorage,
    saveToStorage,
    clearStorage,
    setupAutoSave,
    hasSavedData,
    getSavedDataInfo,
  };
}
