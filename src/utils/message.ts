/**
 * Naive UI Message 유틸리티 함수
 *
 * createDiscreteApi를 사용한 전역 메시지 API의 안전한 래퍼 함수들
 * - Optional chaining으로 undefined 에러 방지
 * - 일관된 사용 패턴 제공
 * - 중복 메시지 방지 (debouncing)
 */

import type { MessageOptions, MessageReactive } from 'naive-ui';

/**
 * 메시지 중복 방지를 위한 디바운싱 시간 (ms)
 */
const DEBOUNCE_TIME = 500;

/**
 * 마지막 메시지 표시 시간 추적
 */
let lastMessageTime = 0;

/**
 * 중복 메시지 표시 여부 확인
 * @returns true면 메시지 표시 가능, false면 중복으로 인해 건너뛰기
 */
function shouldShowMessage(): boolean {
  const now = Date.now();
  if (now - lastMessageTime < DEBOUNCE_TIME) {
    return false;
  }
  lastMessageTime = now;
  return true;
}

/**
 * 성공 메시지 표시
 *
 * @param content - 메시지 내용
 * @param options - Naive UI MessageOptions (duration, closable 등)
 * @returns MessageReactive 인스턴스 또는 null
 *
 * @example
 * ```typescript
 * showSuccess('저장 완료!');
 * showSuccess('저장 완료!', { duration: 5000 });
 * ```
 */
export function showSuccess(
  content: string,
  options?: MessageOptions
): MessageReactive | null {
  if (!window.$message) {
    console.warn('Naive UI message API not initialized');
    return null;
  }

  if (!shouldShowMessage()) {
    return null;
  }

  try {
    return window.$message.success(content, {
      duration: 3000,
      ...options,
    });
  } catch (error) {
    console.error('Failed to show success message:', error);
    return null;
  }
}

/**
 * 에러 메시지 표시
 * 에러 메시지는 중요하므로 중복 방지를 적용하지 않음
 *
 * @param content - 메시지 내용
 * @param options - Naive UI MessageOptions
 * @returns MessageReactive 인스턴스 또는 null
 *
 * @example
 * ```typescript
 * showError('저장 실패!');
 * showError('네트워크 오류', { closable: true });
 * ```
 */
export function showError(
  content: string,
  options?: MessageOptions
): MessageReactive | null {
  if (!window.$message) {
    console.warn('Naive UI message API not initialized');
    return null;
  }

  try {
    return window.$message.error(content, {
      duration: 5000,
      closable: true,
      ...options,
    });
  } catch (error) {
    console.error('Failed to show error message:', error);
    return null;
  }
}

/**
 * 경고 메시지 표시
 *
 * @param content - 메시지 내용
 * @param options - Naive UI MessageOptions
 * @returns MessageReactive 인스턴스 또는 null
 *
 * @example
 * ```typescript
 * showWarning('데이터가 저장되지 않았습니다.');
 * ```
 */
export function showWarning(
  content: string,
  options?: MessageOptions
): MessageReactive | null {
  if (!window.$message) {
    console.warn('Naive UI message API not initialized');
    return null;
  }

  if (!shouldShowMessage()) {
    return null;
  }

  try {
    return window.$message.warning(content, {
      duration: 4000,
      ...options,
    });
  } catch (error) {
    console.error('Failed to show warning message:', error);
    return null;
  }
}

/**
 * 정보 메시지 표시
 *
 * @param content - 메시지 내용
 * @param options - Naive UI MessageOptions
 * @returns MessageReactive 인스턴스 또는 null
 *
 * @example
 * ```typescript
 * showInfo('처리 중입니다...');
 * ```
 */
export function showInfo(
  content: string,
  options?: MessageOptions
): MessageReactive | null {
  if (!window.$message) {
    console.warn('Naive UI message API not initialized');
    return null;
  }

  if (!shouldShowMessage()) {
    return null;
  }

  try {
    return window.$message.info(content, {
      duration: 3000,
      ...options,
    });
  } catch (error) {
    console.error('Failed to show info message:', error);
    return null;
  }
}

/**
 * 로딩 메시지 표시 (자동으로 닫히지 않음)
 * 반드시 반환된 인스턴스의 destroy()를 호출해야 함
 *
 * @param content - 메시지 내용
 * @param options - Naive UI MessageOptions
 * @returns MessageReactive 인스턴스 또는 null
 *
 * @example
 * ```typescript
 * const loading = showLoading('처리 중...');
 *
 * try {
 *   await someAsyncWork();
 *   loading?.destroy();
 *   showSuccess('완료!');
 * } catch (error) {
 *   loading?.destroy();
 *   showError('실패!');
 * }
 * ```
 */
export function showLoading(
  content: string,
  options?: MessageOptions
): MessageReactive | null {
  if (!window.$message) {
    console.warn('Naive UI message API not initialized');
    return null;
  }

  try {
    return window.$message.loading(content, {
      duration: 0, // 자동으로 닫히지 않음
      ...options,
    });
  } catch (error) {
    console.error('Failed to show loading message:', error);
    return null;
  }
}

/**
 * 모든 메시지 닫기
 *
 * @example
 * ```typescript
 * destroyAllMessages();
 * ```
 */
export function destroyAllMessages(): void {
  if (!window.$message) {
    console.warn('Naive UI message API not initialized');
    return;
  }

  try {
    window.$message.destroyAll();
  } catch (error) {
    console.error('Failed to destroy all messages:', error);
  }
}
