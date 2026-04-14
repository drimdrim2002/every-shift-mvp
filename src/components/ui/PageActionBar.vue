<template>
  <div
    data-test="page-action-bar"
    class="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-6 md:flex-row md:items-center md:justify-between"
  >
    <div
      data-test="page-action-bar-left"
      class="flex flex-wrap gap-3"
    >
      <slot name="left" />
    </div>

    <div
      data-test="page-action-bar-right"
      class="flex flex-wrap justify-end gap-3"
    >
      <slot name="right" />
    </div>
  </div>
</template>
