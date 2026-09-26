<script setup lang="ts">
import { ref } from "vue";

import Icon from "./Icon.vue";
import PopupMenu from "./PopupMenu.vue";
import { compactPath, formatDateTime, formatFileSize } from "../lib/format";
import {
  devices,
  loadDevices,
  revealPath,
  selectBackup,
  sendSelected,
  state,
} from "../store/useStore";
import type { BackupEntry, KdeDevice } from "../lib/types";

const menuPoint = ref<{ x: number; y: number } | null>(null);
const submenuAnchor = ref<HTMLElement | null>(null);
const submenuOpen = ref(false);

function openMenu(event: MouseEvent, entry: BackupEntry): void {
  selectBackup(entry);
  submenuOpen.value = false;
  menuPoint.value = { x: event.clientX, y: event.clientY };
}

function closeMenu(): void {
  menuPoint.value = null;
  submenuOpen.value = false;
}

async function openSubmenu(event: MouseEvent): Promise<void> {
  submenuAnchor.value = event.currentTarget as HTMLElement;
  submenuOpen.value = true;
  await loadDevices();
}

async function pickDevice(device: KdeDevice): Promise<void> {
  closeMenu();
  await sendSelected(device);
}
</script>

<template>
  <div class="card panel">
    <div class="panel__head">
      <h2 class="panel__title">备份记录</h2>
      <span class="chip">{{ state.backups.length }} 个</span>
      <button
        v-if="state.backupFolder"
        class="panel__sub"
        :title="state.backupFolder"
        @click="revealPath(state.backupFolder)"
      >
        <Icon name="folder" :size="13" />
        <span>{{ compactPath(state.backupFolder, 1) }}</span>
      </button>
    </div>

    <ul v-if="state.backups.length" class="list backup-list">
      <li
        v-for="entry in state.backups"
        :key="entry.file_path"
        class="backup"
        :class="{ 'is-active': state.selectedBackupPath === entry.file_path }"
        @click="selectBackup(entry)"
        @contextmenu.prevent="openMenu($event, entry)"
      >
        <span class="backup__icon"><Icon name="archive" :size="17" /></span>
        <div class="backup__body">
          <div class="backup__title">
            <span class="backup__name">{{ entry.project_name }}</span>
            <span class="backup__size">{{ formatFileSize(entry.size) }}</span>
          </div>
          <div class="backup__time">{{ formatDateTime(entry.modified) }}</div>
          <div class="backup__file" :title="entry.file_name">{{ entry.file_name }}</div>
        </div>
      </li>
    </ul>

    <p v-else class="empty">暂无备份记录，选择左侧项目即可开始备份</p>

    <PopupMenu v-if="menuPoint" :point="menuPoint" :width="196" @close="closeMenu">
      <button class="menu__item" @mousedown.prevent @mouseenter="openSubmenu">
        <Icon name="send" :size="16" />
        <span class="menu__text"><span class="menu__title">发送到</span></span>
        <Icon name="chevronRight" :size="15" />
      </button>
    </PopupMenu>

    <PopupMenu
      v-if="submenuOpen && submenuAnchor"
      :anchor="submenuAnchor"
      placement="right"
      :width="248"
      @close="closeMenu"
    >
      <div v-if="devices.loading" class="menu__note">正在检测设备…</div>
      <div v-else-if="devices.error" class="menu__note">
        检测设备失败，请确认 KDE Connect 正在运行
      </div>
      <div v-else-if="!devices.cliFound" class="menu__note">
        未找到 KDE Connect，请先安装并运行
      </div>
      <div v-else-if="!devices.items.length" class="menu__note">
        没有可用设备（需已配对且在线）
      </div>
      <template v-else>
        <button
          v-for="device in devices.items"
          :key="device.id"
          class="menu__item"
          @click="pickDevice(device)"
        >
          <Icon name="smartphone" :size="16" />
          <span class="menu__text">
            <span class="menu__title">{{ device.name }}</span>
            <span class="menu__sub">{{ device.id }}</span>
          </span>
        </button>
      </template>
    </PopupMenu>
  </div>
</template>