export interface PublicInquiryRuntimeEnv {
  VITE_PUBLIC_INQUIRY_FORM_URL?: string
}

export function getPublicInquiryFormUrl(
  env: PublicInquiryRuntimeEnv = import.meta.env,
) {
  return (env.VITE_PUBLIC_INQUIRY_FORM_URL ?? '').trim()
}
