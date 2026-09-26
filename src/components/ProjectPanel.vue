<script setup lang="ts">
import { computed } from "vue";

import Icon from "./Icon.vue";
import { backupProject, selectProject, state } from "../store/useStore";

const sections = computed(() => [
  {
    key: "windows",
    title: "Windows 项目",
    icon: "monitor",
    gap: "请在工具栏选择 Windows 项目根目录",
    items: state.windowsProjects,
    root: state.config?.windows_root ?? null,
  },
  {
    key: "android",
    title: "Android 项目",
    icon: "smartphone",
    gap: "请在工具栏选择 Android 项目根目录",
    items: state.androidProjects,
    root: state.config?.android_root ?? null,
  },
]);

const total = computed(
  () => state.windowsProjects.length + state.androidProjects.length,
);
</script>

<template>
  <div class="card panel">
    <div class="panel__head">
      <h2 class="panel__title">项目</h2>
      <span class="chip">{{ total }} 个可备份</span>
    </div>

    <div class="sections">
      <template v-for="(section, index) in sections" :key="section.key">
        <div v-if="index > 0" class="divider" />
        <section class="section" :class="{ 'section--wide': index === 0 }">
          <header class="section__head">
            <Icon :name="section.icon" :size="15" />
            <span>{{ section.title }}</span>
            <span class="section__count">{{ section.items.length }} 个</span>
          </header>

          <ul v-if="section.items.length" class="list">
            <li
              v-for="item in section.items"
              :key="item.path"
              class="row"
              :class="{ 'is-active': state.selectedProjectPath === item.path }"
              :title="item.path"
              @click="selectProject(item)"
              @dblclick="backupProject(item)"
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

          <p v-else class="empty">{{ section.root ? "该目录下没有子文件夹" : section.gap }}</p>
        </section>
      </template>
    </div>
  </div>
</template>