<script setup lang="ts">
import { onMounted } from "vue";

import ActionBar from "./components/ActionBar.vue";
import BackupPanel from "./components/BackupPanel.vue";
import DialogHost from "./components/DialogHost.vue";
import ProjectPanel from "./components/ProjectPanel.vue";
import SettingsDialog from "./components/SettingsDialog.vue";
import TitleBar from "./components/TitleBar.vue";
import ToastHost from "./components/ToastHost.vue";
import Toolbar from "./components/Toolbar.vue";
import { init, state } from "./store/useStore";

onMounted(() => {
  void init();
});
</script>

<template>
  <div class="window">
    <TitleBar />

    <main class="workspace">
      <Toolbar />

      <div class="columns">
        <ProjectPanel />
        <BackupPanel />
      </div>

      <ActionBar />
    </main>

    <SettingsDialog v-if="state.settingsOpen" />
    <DialogHost />
    <ToastHost />
  </div>
</template>