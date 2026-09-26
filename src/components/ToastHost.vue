<script setup lang="ts">
import Icon from "./Icon.vue";
import { dismissToast, toasts } from "../store/useUi";

const icons: Record<string, string> = {
  success: "checkCircle",
  error: "alert",
  warning: "alert",
  info: "info",
};
</script>

<template>
  <Teleport to="body">
    <div v-if="toasts.length" class="toasts">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.kind}`"
        @click="dismissToast(toast.id)"
      >
        <span class="toast__icon"><Icon :name="icons[toast.kind] ?? 'info'" :size="15" /></span>
        <div class="toast__body">
          <div class="toast__title">{{ toast.title }}</div>
          <div v-if="toast.message" class="toast__message">{{ toast.message }}</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>