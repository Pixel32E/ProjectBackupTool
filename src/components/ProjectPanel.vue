<script setup lang="ts">
import { computed, ref } from "vue";

import Icon from "./Icon.vue";
import { selectProject, state } from "../store/useStore";
import type { RootKind } from "../lib/types";

const kinds = computed(() => [
  {
    key: "windows" as RootKind,
    title: "Windows 项目",
    label: "Windows",
    icon: "monitor",
    gap: "请在工具栏选择 Windows 项目根目录",
    items: state.windowsProjects,
    root: state.config?.windows_root ?? null,
  },
  {
    key: "android" as RootKind,
    title: "Android 项目",
    label: "Android",
    icon: "smartphone",
    gap: "请在工具栏选择 Android 项目根目录",
    items: state.androidProjects,
    root: state.config?.android_root ?? null,
  },
  {
    key: "web" as RootKind,
    title: "Web 项目",
    label: "Web",
    icon: "globe",
    gap: "请在工具栏选择 Web 项目根目录",
    items: state.webProjects,
    root: state.config?.web_root ?? null,
  },
]);

const activeKind = ref<RootKind>("windows");

const active = computed(
  () => kinds.value.find((kind) => kind.key === activeKind.value) ?? kinds.value[0],
);

const total = computed(() => kinds.value.reduce((sum, kind) => sum + kind.items.length, 0));
</script>

<template>
  <div class="card panel">
    <div class="panel__head">
      <h2 class="panel__title">项目</h2>
      <span class="chip">{{ total }} 个可备份</span>
    </div>

    <div class="projectbody">
      <nav class="kindtabs">
        <button
          v-for="kind in kinds"
          :key="kind.key"
          class="kindtab"
          :class="{ 'is-active': activeKind === kind.key }"
          :title="kind.title"
          @click="activeKind = kind.key"
        >
          <Icon :name="kind.icon" :size="17" />
          <span class="kindtab__label">{{ kind.label }}</span>
          <span class="kindtab__count">{{ kind.items.length }}</span>
        </button>
      </nav>

      <section class="section">
        <header class="section__head">
          <Icon :name="active.icon" :size="15" />
          <span>{{ active.title }}</span>
          <span class="section__count">{{ active.items.length }} 个</span>
        </header>

        <ul v-if="active.items.length" class="list">
          <li
            v-for="item in active.items"
            :key="item.path"
            class="row"
            :class="{ 'is-active': state.selectedProjectPath === item.path }"
            :title="item.path"
            @click="selectProject(item)"
          >
            <span class="row__icon"><Icon name="folder" :size="15" /></span>
            <span class="row__name">{{ item.name }}</span>
            <Icon
              v-if="state.selectedProjectPath === item.path"
              class="row__hint"
              name="check"
              :size="15"
            />
          </li>
        </ul>

        <p v-else class="empty">{{ active.root ? "该目录下没有子文件夹" : active.gap }}</p>
      </section>
    </div>
  </div>
</template>