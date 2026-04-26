import type {
  DialogApi,
  LoadingBarApi,
  MessageApi,
  NotificationApi,
} from 'naive-ui';

declare global {
  interface ImportMetaEnv {
    readonly VITE_PUBLIC_INQUIRY_FORM_URL?: string;
  }

  interface Window {
    $message: MessageApi;
    $dialog: DialogApi;
    $notification: NotificationApi;
    $loadingBar: LoadingBarApi;
  }
}

export {};
