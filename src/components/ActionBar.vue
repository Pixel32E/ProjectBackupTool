<script setup lang="ts">
import Icon from "./Icon.vue";
import {
  backupSelected,
  canBackup,
  canDelete,
  canRestore,
  deleteSelected,
  restoreSelected,
  state,
} from "../store/useStore";
</script>

<template>
  <div class="card actionbar">
    <div class="actionbar__info">
      <div v-if="state.job.active" class="progress">
        <div class="progress__head">
          <span class="progress__label">{{ state.job.label }}</span>
          <span v-if="!state.job.indeterminate" class="progress__percent">
            {{ state.job.percent }}%
          </span>
        </div>
        <div class="progress__track">
          <div
            class="progress__fill"
            :class="{ 'is-indeterminate': state.job.indeterminate }"
            :style="state.job.indeterminate ? {} : { width: `${state.job.percent}%` }"
          />
        </div>
        <p class="progress__detail">{{ state.job.detail || "准备中…" }}</p>
      </div>

      <p v-else class="actionbar__tip">
        <Icon name="info" :size="15" />
        选择一个项目后点击「备份项目」，双击项目可快速备份；右键备份记录可发送到设备
      </p>
    </div>

    <div class="actionbar__buttons">
      <button class="btn btn--accent" :disabled="!canBackup" @click="backupSelected">
        <Icon name="archive" :size="16" />
        备份项目
      </button>
      <button class="btn btn--ghost" :disabled="!canRestore" @click="restoreSelected">
        <Icon name="restore" :size="16" />
        恢复备份
      </button>
      <button class="btn btn--ghost btn--danger" :disabled="!canDelete" @click="deleteSelected">
        <Icon name="trash" :size="16" />
        删除备份
      </button>
    </div>
  </div>
</template>