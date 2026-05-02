import type { AccessState } from '@/types/rbac'

export type SocialAuthProviderId = 'kakao' | 'custom:naver' | 'google'

export type SocialAuthIntent = 'login' | 'signup'

export type OAuthCallbackResult =
  | { success: true; intent: SocialAuthIntent; accessState: AccessState }
  | { success: false; error: string }
