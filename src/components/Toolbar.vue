<script setup lang="ts">
import { computed, ref } from "vue";

import Icon from "./Icon.vue";
import PopupMenu from "./PopupMenu.vue";
import { compactPath } from "../lib/format";
import { pickRoot, refreshAll, revealPath, state } from "../store/useStore";
import type { RootKind } from "../lib/types";

const rootButton = ref<HTMLButtonElement | null>(null);
const menuOpen = ref(false);

const roots = computed(() => [
  {
    kind: "windows" as RootKind,
    label: "Windows",
    icon: "monitor",
    path: state.config?.windows_root ?? null,
    exists: state.windowsExists,
  },
  {
    kind: "android" as RootKind,
    label: "Android",
    icon: "smartphone",
    path: state.config?.android_root ?? null,
    exists: state.androidExists,
  },
]);

async function choose(kind: RootKind): Promise<void> {
  menuOpen.value = false;
  await pickRoot(kind);
}
</script>

<template>
  <div class="card toolbar">
    <button ref="rootButton" class="btn btn--accent" @click="menuOpen = !menuOpen">
      <Icon name="folder" :size="16" />
      选择根目录
      <Icon name="chevronDown" :size="15" />
    </button>
    <button class="btn btn--ghost" @click="refreshAll">
      <Icon name="refresh" :size="16" />
      刷新列表
    </button>

    <div class="toolbar__spacer" />

    <button
      v-for="root in roots"
      :key="root.kind"
      class="pathchip"
      :class="{ 'pathchip--empty': !root.path || !root.exists }"
      :title="root.path ? `${root.path}（点击在资源管理器中打开）` : '尚未选择目录'"
      @click="revealPath(root.path)"
    >
      <Icon :name="root.icon" :size="15" />
      <span class="pathchip__kind">{{ root.label }}</span>
      <span class="pathchip__value">{{ root.path ? compactPath(root.path) : "未选择" }}</span>
    </button>

    <button class="btn btn--ghost" @click="state.settingsOpen = true">
      <Icon name="sliders" :size="16" />
      设置
    </button>

    <PopupMenu v-if="menuOpen" :anchor="rootButton" :width="248" @close="menuOpen = false">
      <button class="menu__item" @click="choose('windows')">
        <Icon name="monitor" :size="16" />
        <span class="menu__text">
          <span class="menu__title">Windows 项目目录</span>
          <span class="menu__sub">{{ state.config?.windows_root ?? "未选择" }}</span>
        </span>
      </button>
      <button class="menu__item" @click="choose('android')">
        <Icon name="smartphone" :size="16" />
        <span class="menu__text">
          <span class="menu__title">Android 项目目录</span>
          <span class="menu__sub">{{ state.config?.android_root ?? "未选择" }}</span>
        </span>
      </button>
    </PopupMenu>
  </div>
</template>