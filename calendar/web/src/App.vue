<script setup lang="ts">
import { watch } from "vue";
import { RouterView } from "vue-router";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();

watch(
  () => appStore.theme,
  (value) => {
    document.documentElement.setAttribute("data-theme", value);
  },
  { immediate: true },
);
</script>

<template>
  <RouterView />
</template>
