<script setup lang="ts">
import Icon from "./Icon.vue";
import { pickRoot, projectRoot, revealPath, state } from "../store/useStore";
</script>

<template>
  <div class="card toolbar">
    <button class="btn btn--accent" @click="pickRoot()">
      <Icon name="folder" :size="16" />
      选择根目录
    </button>
    <button class="btn btn--ghost" @click="state.settingsOpen = true">
      <Icon name="sliders" :size="16" />
      设置
    </button>

    <div class="toolbar__spacer" />

    <button
      class="pathchip"
      :class="{ 'pathchip--empty': !projectRoot.path || !projectRoot.exists }"
      :title="
        projectRoot.path
          ? `项目根目录：${projectRoot.path}（点击在资源管理器中打开）`
          : '项目根目录尚未选择'
      "
      @click="revealPath(projectRoot.path)"
    >
      <Icon name="folder" :size="15" />
      <span class="pathchip__value">
        {{ projectRoot.path ?? "项目根目录未选择" }}
      </span>
    </button>
  </div>
</template>
