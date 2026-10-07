<script setup lang="ts">
import { computed, ref } from "vue";

import Icon from "./Icon.vue";
import PopupMenu from "./PopupMenu.vue";
import {
  blockProject,
  projectRoot,
  revealPath,
  selectProject,
  setProjectTag,
  state,
} from "../store/useStore";
import { PROJECT_TAGS, tagLabelOf, type ProjectEntry } from "../lib/types";

/** 标签筛选选项：全部 + 各标准化标签，附带各自数量 */
const filters = computed(() => [
  { id: null as string | null, label: "全部", count: state.projects.length },
  ...PROJECT_TAGS.map((tag) => ({
    id: tag.id as string | null,
    label: tag.label,
    count: state.projects.filter((project) => project.tag === tag.id).length,
  })),
]);

const visibleProjects = computed(() =>
  state.activeTag
    ? state.projects.filter((project) => project.tag === state.activeTag)
    : state.projects,
);

const emptyText = computed(() => {
  if (!projectRoot.value.path) return "请在工具栏选择项目根目录";
  if (!projectRoot.value.exists) return "项目根目录不存在，请重新选择";
  if (state.activeTag) return `暂无「${tagLabelOf(state.activeTag)}」标签的项目`;
  return "该根目录下没有子文件夹";
});

function setFilter(id: string | null): void {
  state.activeTag = id;
}

const menuPoint = ref<{ x: number; y: number } | null>(null);
const menuPath = ref<string | null>(null);
/** 一级菜单：root；标签选择菜单：tag */
const menuMode = ref<"root" | "tag">("root");

const menuProject = computed(
  () => state.projects.find((project) => project.path === menuPath.value) ?? null,
);

function openMenu(event: MouseEvent, entry: ProjectEntry): void {
  selectProject(entry);
  menuPath.value = entry.path;
  menuMode.value = "root";
  menuPoint.value = { x: event.clientX, y: event.clientY };
}

function closeMenu(): void {
  menuPoint.value = null;
  menuPath.value = null;
  menuMode.value = "root";
}

async function blockItem(): Promise<void> {
  const path = menuPath.value;
  closeMenu();
  if (path) await blockProject(path);
}

async function openInExplorer(): Promise<void> {
  const path = menuPath.value;
  closeMenu();
  await revealPath(path);
}

async function chooseTag(tag: string): Promise<void> {
  const path = menuPath.value;
  closeMenu();
  if (path) await setProjectTag(path, tag);
}
</script>

<template>
  <div class="card panel">
    <div class="panel__head">
      <h2 class="panel__title">项目</h2>
      <span class="chip">{{ state.projects.length }} 个可备份</span>
    </div>

    <div class="filters">
      <button
        v-for="filter in filters"
        :key="filter.id ?? 'all'"
        class="filterchip"
        :class="{ 'is-active': state.activeTag === filter.id }"
        @click="setFilter(filter.id)"
      >
        <span class="filterchip__label">{{ filter.label }}</span>
        <span class="filterchip__count">{{ filter.count }}</span>
      </button>
    </div>

    <section class="section">
      <header class="section__head">
        <Icon name="folder" :size="15" />
        <span>{{ state.activeTag ? tagLabelOf(state.activeTag) : "全部项目" }}</span>
        <span class="section__count">{{ visibleProjects.length }} 个</span>
      </header>

      <ul v-if="visibleProjects.length" class="list">
        <li
          v-for="item in visibleProjects"
          :key="item.path"
          class="row"
          :class="{ 'is-active': state.selectedProjectPath === item.path }"
          :title="item.path"
          @click="selectProject(item)"
          @contextmenu.prevent="openMenu($event, item)"
        >
          <span class="row__icon"><Icon name="folder" :size="15" /></span>
          <span class="row__name">{{ item.name }}</span>
          <span v-if="item.tag" class="tagchip" :class="`tagchip--${item.tag}`">
            {{ tagLabelOf(item.tag) }}
          </span>
          <Icon
            v-if="state.selectedProjectPath === item.path"
            class="row__hint"
            name="check"
            :size="15"
          />
        </li>
      </ul>

      <p v-else class="empty">{{ emptyText }}</p>
    </section>

    <PopupMenu v-if="menuPoint" :key="menuMode" :point="menuPoint" :width="216" @close="closeMenu">
      <template v-if="menuMode === 'root'">
        <button class="menu__item" @click="menuMode = 'tag'">
          <Icon name="edit" :size="16" />
          <span class="menu__text"><span class="menu__title">添加项目标签</span></span>
          <Icon name="chevronRight" :size="15" class="menu__arrow" />
        </button>
        <button class="menu__item" @click="blockItem">
          <Icon name="ban" :size="16" />
          <span class="menu__text"><span class="menu__title">屏蔽该文件夹</span></span>
        </button>
        <button class="menu__item" @click="openInExplorer">
          <Icon name="folder" :size="16" />
          <span class="menu__text"><span class="menu__title">在文件资源管理器打开</span></span>
        </button>
      </template>

      <template v-else>
        <button class="menu__item" @click="menuMode = 'root'">
          <Icon name="chevronDown" :size="15" class="menu__back" />
          <span class="menu__text"><span class="menu__title">返回</span></span>
        </button>
        <div class="menu__sep" />
        <button
          v-for="tag in PROJECT_TAGS"
          :key="tag.id"
          class="menu__item"
          @click="chooseTag(tag.id)"
        >
          <span class="tagdot" :class="`tagdot--${tag.id}`" />
          <span class="menu__text"><span class="menu__title">{{ tag.label }}</span></span>
          <Icon v-if="menuProject?.tag === tag.id" name="check" :size="15" class="menu__arrow" />
        </button>
        <template v-if="menuProject?.tag">
          <div class="menu__sep" />
          <button class="menu__item" @click="chooseTag('')">
            <Icon name="ban" :size="16" />
            <span class="menu__text"><span class="menu__title">清除标签</span></span>
          </button>
        </template>
      </template>
    </PopupMenu>
  </div>
</template>
