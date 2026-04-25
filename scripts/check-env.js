#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

export const PUBLIC_INQUIRY_FORM_ENV_KEY = 'VITE_PUBLIC_INQUIRY_FORM_URL';

export function parseEnvFile(envText) {
  const env = {};

  for (const line of envText.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const match = trimmedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    const value = rawValue.trim();
    const quote = value[0];

    env[key] =
      (quote === '"' || quote === "'") && value.endsWith(quote)
        ? value.slice(1, -1)
        : value;
  }

  return env;
}

export function getPublicInquiryFormUrlValidationError(value) {
  const inquiryFormUrl = value?.trim();

  if (!inquiryFormUrl) {
    return `${PUBLIC_INQUIRY_FORM_ENV_KEY} 값을 설정하세요.`;
  }

  if (/YOUR_|REPLACE_|TODO/i.test(inquiryFormUrl)) {
    return `${PUBLIC_INQUIRY_FORM_ENV_KEY}에는 실제 Google Form URL을 입력하세요.`;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(inquiryFormUrl);
  } catch {
    return `${PUBLIC_INQUIRY_FORM_ENV_KEY}은 http 또는 https URL이어야 합니다.`;
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return `${PUBLIC_INQUIRY_FORM_ENV_KEY}은 http 또는 https URL이어야 합니다.`;
  }

  const isFormsGleUrl = parsedUrl.hostname === 'forms.gle';
  const isDocsGoogleFormsUrl =
    parsedUrl.hostname === 'docs.google.com' && parsedUrl.pathname.startsWith('/forms/');

  if (!isFormsGleUrl && !isDocsGoogleFormsUrl) {
    return `${PUBLIC_INQUIRY_FORM_ENV_KEY}은 Google Form URL이어야 합니다. docs.google.com/forms 또는 forms.gle을 사용하세요.`;
  }

  return null;
}

export function validateEnv(env) {
  const errors = [];
  const inquiryFormError = getPublicInquiryFormUrlValidationError(
    env[PUBLIC_INQUIRY_FORM_ENV_KEY],
  );

  if (inquiryFormError) {
    errors.push(inquiryFormError);
  }

  return errors;
}

export function checkEnv(cwd = process.cwd()) {
  const envFile = resolve(cwd, '.env.local');

  if (!existsSync(envFile)) {
    return {
      errors: ['.env.local 파일이 없습니다!'],
      tips: [
        '다음 명령어를 실행하세요:',
        'cp .env.example .env.local',
        '# .env.local 파일을 열어 Supabase 및 공개 문의 폼 정보를 입력하세요',
      ],
    };
  }

  const env = parseEnvFile(readFileSync(envFile, 'utf8'));
  const errors = validateEnv(env);

  return { errors, tips: [] };
}

export function runCheckEnv({
  cwd = process.cwd(),
  stdout = console.log,
  stderr = console.error,
} = {}) {
  const result = checkEnv(cwd);

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      stderr(`❌ ${error}`);
    }

    for (const tip of result.tips) {
      stdout(`📝 ${tip}`);
    }

    return 1;
  }

  stdout('✅ .env.local 파일 확인 완료');
  stdout(`✅ ${PUBLIC_INQUIRY_FORM_ENV_KEY} 확인 완료`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const exitCode = runCheckEnv();

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
