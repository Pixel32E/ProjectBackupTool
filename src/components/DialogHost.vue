<script setup lang="ts">
import Icon from "./Icon.vue";
import { dialogState, resolveDialog } from "../store/useUi";
</script>

<template>
  <div v-if="dialogState.open" class="overlay" @mousedown.self="resolveDialog(false)">
    <div class="dialog">
      <h2 class="dialog__title">{{ dialogState.options.title }}</h2>
      <p v-if="dialogState.options.message" class="dialog__message">
        {{ dialogState.options.message }}
      </p>

      <div v-if="dialogState.options.details?.length" class="dialog__list">
        <div v-for="item in dialogState.options.details" :key="item" :title="item">{{ item }}</div>
      </div>

      <div class="dialog__footer">
        <button
          v-if="dialogState.options.cancelText"
          class="btn btn--ghost"
          @click="resolveDialog(false)"
        >
          {{ dialogState.options.cancelText }}
        </button>
        <button
          class="btn"
          :class="dialogState.options.danger ? 'btn--ghost btn--danger' : 'btn--accent'"
          @click="resolveDialog(true)"
        >
          <Icon v-if="dialogState.options.danger" name="alert" :size="15" />
          {{ dialogState.options.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>