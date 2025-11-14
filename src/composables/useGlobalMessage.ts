/**
 * Naive UI 전역 메시지 API Composable
 *
 * createDiscreteApi로 초기화된 전역 메시지 API를 Vue Composable로 래핑
 * - 안전한 타입 체크
 * - 유틸리티 함수 재사용
 * - 컴포넌트에서 편리하게 사용
 */

import { onBeforeUnmount } from 'vue';
import type { MessageReactive } from 'naive-ui';
import {
  destroyAllMessages,
  showError,
  showInfo,
  showLoading,
  showSuccess,
  showWarning,
} from '@/utils/message';

/**
 * Naive UI 전역 메시지 API를 사용하기 위한 Composable
 *
 * @param options - 옵션 (autoCleanup: 컴포넌트 언마운트 시 활성 메시지 자동 정리)
 * @returns 메시지 표시 함수들과 유틸리티 함수들
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGlobalMessage } from '@/composables/useGlobalMessage';
 *
 * const { success, error, loading } = useGlobalMessage();
 *
 * const handleSave = async () => {
 *   const loadingMsg = loading('저장 중...');
 *   try {
 *     await saveData();
 *     loadingMsg?.destroy();
 *     success('저장 완료!');
 *   } catch (err) {
 *     loadingMsg?.destroy();
 *     error('저장 실패!');
 *   }
 * };
 * </script>
 * ```
 */
export function useGlobalMessage(options?: { autoCleanup?: boolean }) {
  const { autoCleanup = true } = options || {};

  // 활성 메시지 추적 (autoCleanup이 true일 때만)
  const activeMessages: MessageReactive[] = [];

  /**
   * 활성 메시지 추적 함수
   */
  const trackMessage = (message: MessageReactive | null) => {
    if (message && autoCleanup) {
      activeMessages.push(message);
    }
    return message;
  };

  /**
   * 성공 메시지 표시
   */
  const success: typeof showSuccess = (content, opts) => {
    return trackMessage(showSuccess(content, opts));
  };

  /**
   * 에러 메시지 표시
   */
  const error: typeof showError = (content, opts) => {
    return trackMessage(showError(content, opts));
  };

  /**
   * 경고 메시지 표시
   */
  const warning: typeof showWarning = (content, opts) => {
    return trackMessage(showWarning(content, opts));
  };

  /**
   * 정보 메시지 표시
   */
  const info: typeof showInfo = (content, opts) => {
    return trackMessage(showInfo(content, opts));
  };

  /**
   * 로딩 메시지 표시
   */
  const loading: typeof showLoading = (content, opts) => {
    return trackMessage(showLoading(content, opts));
  };

  /**
   * 모든 메시지 닫기
   */
  const destroyAll = () => {
    destroyAllMessages();
    activeMessages.length = 0; // 배열 초기화
  };

  /**
   * 컴포넌트 언마운트 시 자동 정리
   */
  if (autoCleanup) {
    onBeforeUnmount(() => {
      // 활성 메시지 모두 닫기
      activeMessages.forEach((msg) => {
        try {
          msg.destroy();
        } catch (err) {
          console.warn('Failed to destroy message:', err);
        }
      });
      activeMessages.length = 0;
    });
  }

  return {
    success,
    error,
    warning,
    info,
    loading,
    destroyAll,
  };
}

/**
 * Dialog API Composable
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGlobalDialog } from '@/composables/useGlobalMessage';
 *
 * const { warning, confirm } = useGlobalDialog();
 *
 * const handleDelete = () => {
 *   warning({
 *     title: '삭제 확인',
 *     content: '정말 삭제하시겠습니까?',
 *     positiveText: '삭제',
 *     negativeText: '취소',
 *     onPositiveClick: async () => {
 *       await deleteData();
 *     },
 *   });
 * };
 * </script>
 * ```
 */
export function useGlobalDialog() {
  /**
   * 경고 다이얼로그 표시
   */
  const warning = (options: Parameters<typeof window.$dialog.warning>[0]) => {
    if (!window.$dialog) {
      console.warn('Naive UI dialog API not initialized');
      return;
    }
    return window.$dialog.warning(options);
  };

  /**
   * 에러 다이얼로그 표시
   */
  const error = (options: Parameters<typeof window.$dialog.error>[0]) => {
    if (!window.$dialog) {
      console.warn('Naive UI dialog API not initialized');
      return;
    }
    return window.$dialog.error(options);
  };

  /**
   * 정보 다이얼로그 표시
   */
  const info = (options: Parameters<typeof window.$dialog.info>[0]) => {
    if (!window.$dialog) {
      console.warn('Naive UI dialog API not initialized');
      return;
    }
    return window.$dialog.info(options);
  };

  /**
   * 성공 다이얼로그 표시
   */
  const success = (options: Parameters<typeof window.$dialog.success>[0]) => {
    if (!window.$dialog) {
      console.warn('Naive UI dialog API not initialized');
      return;
    }
    return window.$dialog.success(options);
  };

  /**
   * 일반 다이얼로그 생성
   */
  const create = (options: Parameters<typeof window.$dialog.create>[0]) => {
    if (!window.$dialog) {
      console.warn('Naive UI dialog API not initialized');
      return;
    }
    return window.$dialog.create(options);
  };

  return {
    warning,
    error,
    info,
    success,
    create,
  };
}

/**
 * Notification API Composable
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGlobalNotification } from '@/composables/useGlobalMessage';
 *
 * const { success } = useGlobalNotification();
 *
 * success({
 *   title: '알림',
 *   content: '작업이 완료되었습니다.',
 *   duration: 3000,
 * });
 * </script>
 * ```
 */
export function useGlobalNotification() {
  /**
   * 성공 알림 표시
   */
  const success = (
    options: Parameters<typeof window.$notification.success>[0]
  ) => {
    if (!window.$notification) {
      console.warn('Naive UI notification API not initialized');
      return;
    }
    return window.$notification.success(options);
  };

  /**
   * 에러 알림 표시
   */
  const error = (options: Parameters<typeof window.$notification.error>[0]) => {
    if (!window.$notification) {
      console.warn('Naive UI notification API not initialized');
      return;
    }
    return window.$notification.error(options);
  };

  /**
   * 경고 알림 표시
   */
  const warning = (
    options: Parameters<typeof window.$notification.warning>[0]
  ) => {
    if (!window.$notification) {
      console.warn('Naive UI notification API not initialized');
      return;
    }
    return window.$notification.warning(options);
  };

  /**
   * 정보 알림 표시
   */
  const info = (options: Parameters<typeof window.$notification.info>[0]) => {
    if (!window.$notification) {
      console.warn('Naive UI notification API not initialized');
      return;
    }
    return window.$notification.info(options);
  };

  /**
   * 일반 알림 생성
   */
  const create = (
    options: Parameters<typeof window.$notification.create>[0]
  ) => {
    if (!window.$notification) {
      console.warn('Naive UI notification API not initialized');
      return;
    }
    return window.$notification.create(options);
  };

  /**
   * 모든 알림 닫기
   */
  const destroyAll = () => {
    if (!window.$notification) {
      console.warn('Naive UI notification API not initialized');
      return;
    }
    window.$notification.destroyAll();
  };

  return {
    success,
    error,
    warning,
    info,
    create,
    destroyAll,
  };
}

/**
 * LoadingBar API Composable
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGlobalLoadingBar } from '@/composables/useGlobalMessage';
 *
 * const { start, finish, error } = useGlobalLoadingBar();
 *
 * const handleLoad = async () => {
 *   start();
 *   try {
 *     await loadData();
 *     finish();
 *   } catch (err) {
 *     error();
 *   }
 * };
 * </script>
 * ```
 */
export function useGlobalLoadingBar() {
  /**
   * 로딩바 시작
   */
  const start: typeof window.$loadingBar.start = () => {
    if (!window.$loadingBar) {
      console.warn('Naive UI loadingBar API not initialized');
      return;
    }
    window.$loadingBar.start();
  };

  /**
   * 로딩바 완료
   */
  const finish: typeof window.$loadingBar.finish = () => {
    if (!window.$loadingBar) {
      console.warn('Naive UI loadingBar API not initialized');
      return;
    }
    window.$loadingBar.finish();
  };

  /**
   * 로딩바 에러 표시
   */
  const error: typeof window.$loadingBar.error = () => {
    if (!window.$loadingBar) {
      console.warn('Naive UI loadingBar API not initialized');
      return;
    }
    window.$loadingBar.error();
  };

  return {
    start,
    finish,
    error,
  };
}
