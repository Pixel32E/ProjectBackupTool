<script setup lang="ts">
import { computed, ref } from "vue";

import Icon from "./Icon.vue";
import PopupMenu from "./PopupMenu.vue";
import { activeRoot, pickRoot, revealPath, state } from "../store/useStore";
import type { RootKind } from "../lib/types";

const rootButton = ref<HTMLButtonElement | null>(null);
const menuOpen = ref(false);

const options = computed(() => [
  {
    kind: "windows" as RootKind,
    label: "Windows 项目目录",
    icon: "monitor",
    path: state.config?.windows_root ?? null,
  },
  {
    kind: "android" as RootKind,
    label: "Android 项目目录",
    icon: "smartphone",
    path: state.config?.android_root ?? null,
  },
  {
    kind: "web" as RootKind,
    label: "Web 项目目录",
    icon: "globe",
    path: state.config?.web_root ?? null,
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
    <button class="btn btn--ghost" @click="state.settingsOpen = true">
      <Icon name="sliders" :size="16" />
      设置
    </button>

    <div class="toolbar__spacer" />

    <button
      class="pathchip"
      :class="{ 'pathchip--empty': !activeRoot.path || !activeRoot.exists }"
      :title="
        activeRoot.path
          ? `${activeRoot.label}：${activeRoot.path}（点击在资源管理器中打开）`
          : `${activeRoot.label} 项目目录尚未选择`
      "
      @click="revealPath(activeRoot.path)"
    >
      <Icon name="folder" :size="15" />
      <span class="pathchip__value">
        {{ activeRoot.path ?? `${activeRoot.label} 未选择` }}
      </span>
    </button>

    <PopupMenu v-if="menuOpen" :anchor="rootButton" :width="248" @close="menuOpen = false">
      <button v-for="option in options" :key="option.kind" class="menu__item" @click="choose(option.kind)">
        <Icon :name="option.icon" :size="16" />
        <span class="menu__text">
          <span class="menu__title">{{ option.label }}</span>
          <span class="menu__sub">{{ option.path ?? "未选择" }}</span>
        </span>
      </button>
    </PopupMenu>
  </div>
</template>
