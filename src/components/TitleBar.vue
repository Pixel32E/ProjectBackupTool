<script setup lang="ts">
import { getCurrentWindow } from "@tauri-apps/api/window";

import Icon from "./Icon.vue";
import { isDesktop } from "../lib/api";

const appWindow = isDesktop ? getCurrentWindow() : null;

const minimize = () => void appWindow?.minimize();
const toggleMaximize = () => void appWindow?.toggleMaximize();
const close = () => void appWindow?.close();
</script>

<template>
  <header class="titlebar" data-tauri-drag-region>
    <div class="titlebar__brand" data-tauri-drag-region>
      <span class="titlebar__mark"><Icon name="sparkle" :size="13" :stroke="2" /></span>
      <span>ProjectBackupTool</span>
    </div>
    <div class="titlebar__controls">
      <button class="winbtn" title="最小化" @click="minimize">
        <Icon name="minimize" :size="15" />
      </button>
      <button class="winbtn" title="最大化" @click="toggleMaximize">
        <Icon name="maximize" :size="13" />
      </button>
      <button class="winbtn winbtn--close" title="关闭" @click="close">
        <Icon name="close" :size="14" />
      </button>
    </div>
  </header>
</template>
