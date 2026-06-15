<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md'
  alt?: string
}>(), {
  size: 'sm',
  alt: 'everyshift',
})

const rootClass = computed(() =>
  props.size === 'md'
    ? 'brand-logo brand-logo--md h-10 gap-2.5'
    : 'brand-logo brand-logo--sm h-8 gap-2',
)
</script>

<template>
  <div
    data-test="brand-logo"
    class="inline-flex shrink-0 items-center"
    :class="rootClass"
    :role="alt ? 'img' : undefined"
    :aria-label="alt || undefined"
    :aria-hidden="alt ? undefined : 'true'"
  >
    <svg
      data-test="brand-logo-mark"
      class="brand-logo__mark block h-full w-auto shrink-0"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      shape-rendering="geometricPrecision"
      aria-hidden="true"
    >
      <g transform="translate(0 40) scale(0.026845638 -0.026845638)">
        <path
          fill="var(--brand-logo-mark-1)"
          d="M565 1447 c-122 -31 -260 -120 -351 -227 -107 -126 -172 -288 -182 -452 -2 -54 -2 -98 1 -98 3 0 23 33 44 73 58 110 163 211 283 269 104 51 193 74 342 87 156 13 218 64 218 179 0 64 -39 120 -107 153 -57 28 -170 35 -248 16z"
        />
        <path
          fill="var(--brand-logo-mark-2)"
          d="M1000 1340 c0 -5 5 -12 10 -15 17 -10 67 -116 86 -181 25 -83 23 -201 -4 -289 -12 -38 -46 -114 -77 -167 -71 -123 -79 -171 -42 -250 83 -183 323 -161 426 39 53 105 69 282 36 406 -34 130 -128 276 -227 353 -74 57 -208 125 -208 104z"
        />
        <path
          fill="var(--brand-logo-mark-3)"
          d="M201 687 c-6 -6 -11 -7 -11 -1 0 5 -4 4 -8 -3 -4 -6 -13 -13 -21 -15 -17 -4 -76 -61 -73 -70 1 -5 -3 -8 -9 -8 -6 0 -9 -7 -5 -15 3 -8 1 -15 -5 -15 -5 0 -7 -11 -3 -25 4 -15 2 -25 -5 -25 -12 0 -15 -32 -5 -43 4 -3 8 -21 9 -39 2 -38 43 -138 56 -138 5 0 9 -6 9 -14 0 -7 32 -47 71 -87 39 -41 68 -67 64 -59 -3 8 1 6 10 -5 9 -11 21 -19 26 -17 5 1 9 -2 9 -8 0 -12 75 -51 84 -43 3 4 6 2 6 -3 0 -6 29 -20 64 -33 60 -21 78 -22 252 -19 134 2 188 6 191 15 3 7 11 9 19 6 8 -3 14 -1 14 4 0 5 9 9 20 10 26 2 130 61 130 74 0 5 6 9 13 9 7 0 23 14 36 30 12 17 26 28 31 25 5 -3 12 0 16 6 5 8 2 10 -7 5 -8 -4 -6 -1 4 7 20 16 6 34 -15 20 -7 -4 -21 -6 -30 -5 -10 2 -18 -1 -18 -5 0 -5 -46 -7 -102 -5 -120 4 -212 29 -295 79 -31 18 -56 33 -58 33 -5 0 -121 120 -132 137 -7 10 -29 45 -50 78 -20 33 -41 62 -45 63 -4 2 -8 9 -8 16 0 15 -46 59 -80 77 -31 16 -135 20 -149 6z"
        />
      </g>
    </svg>

    <span
      class="brand-logo-wordmark whitespace-nowrap"
      aria-hidden="true"
    >
      everyshift
    </span>
  </div>
</template>

<style scoped>
.brand-logo-wordmark {
  color: var(--brand-logo-wordmark);
  font-family: var(--font-sans, 'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
}

.brand-logo--sm .brand-logo-wordmark {
  font-size: 15px;
}

.brand-logo--md .brand-logo-wordmark {
  font-size: 17px;
}
</style>
