<script setup lang="ts">
import { reactive } from "vue";

import Icon from "./Icon.vue";
import { revealPath, saveSettings, state, unblockProject } from "../store/useStore";
import type { CompressionSettings } from "../lib/types";

const fallback: CompressionSettings = {
  block_size: "1MB",
  block_linked: true,
  content_checksum: true,
  block_checksum: false,
};

const draft = reactive<CompressionSettings>({
  ...(state.config?.compression ?? fallback),
});

const blockSizes = [
  { value: "64KB", label: "64 KB" },
  { value: "256KB", label: "256 KB" },
  { value: "1MB", label: "1 MB" },
  { value: "4MB", label: "4 MB" },
];
</script>

<template>
  <div class="overlay" @mousedown.self="state.settingsOpen = false">
    <div class="dialog dialog--wide">
      <h2 class="dialog__title">设置</h2>
      <p class="dialog__message">压缩参数决定备份文件的体积与读写速度，保存后在下一次备份时生效。</p>

      <div style="margin-top: 18px">
        <div class="setting">
          <div class="setting__row">
            <div class="setting__label">
              <div class="setting__title">块大小</div>
              <div class="setting__desc">LZ4 帧内单个数据块的容量，越大的块压缩率略高</div>
            </div>
            <div class="setting__field" style="display: flex; justify-content: flex-end">
              <div class="segment">
                <button
                  v-for="option in blockSizes"
                  :key="option.value"
                  :class="{ 'is-active': draft.block_size === option.value }"
                  @click="draft.block_size = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="setting__block divider" />

          <div class="setting__row">
            <div class="setting__label">
              <div class="setting__title">块模式</div>
              <div class="setting__desc">
                链接块会引用前序块内容，压缩率更高；独立块便于按块随机读取
              </div>
            </div>
            <div class="setting__field" style="display: flex; justify-content: flex-end">
              <div class="segment">
                <button
                  :class="{ 'is-active': draft.block_linked }"
                  @click="draft.block_linked = true"
                >
                  链接块
                </button>
                <button
                  :class="{ 'is-active': !draft.block_linked }"
                  @click="draft.block_linked = false"
                >
                  独立块
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="setting">
          <div class="setting__row">
            <div class="setting__label">
              <div class="setting__title">内容校验和</div>
              <div class="setting__desc">解压时校验整体数据完整性，推荐开启</div>
            </div>
            <button
              class="switch"
              :class="{ 'is-on': draft.content_checksum }"
              :aria-pressed="draft.content_checksum"
              @click="draft.content_checksum = !draft.content_checksum"
            />
          </div>

          <div class="setting__block divider" />

          <div class="setting__row">
            <div class="setting__label">
              <div class="setting__title">块校验和</div>
              <div class="setting__desc">逐块校验，写入与读取开销更大，默认关闭</div>
            </div>
            <button
              class="switch"
              :class="{ 'is-on': draft.block_checksum }"
              :aria-pressed="draft.block_checksum"
              @click="draft.block_checksum = !draft.block_checksum"
            />
          </div>
        </div>

        <div class="setting">
          <div class="setting__row">
            <div class="setting__label">
              <div class="setting__title">备份目录</div>
              <div class="setting__desc">自动选择：存在 D 盘时使用 D:\Projects-Backup</div>
            </div>
          </div>
          <div class="pathbox" style="margin-top: 10px">
            <Icon name="folder" :size="14" />
            <span class="pathbox__value" :title="state.backupFolder">
              {{ state.backupFolder || "尚未创建" }}
            </span>
            <button class="btn btn--plain" @click="revealPath(state.backupFolder)">打开</button>
          </div>
        </div>

        <div class="setting">
          <div class="setting__row">
            <div class="setting__label">
              <div class="setting__title">屏蔽的项目（黑名单）</div>
              <div class="setting__desc">
                在项目列表右键可屏蔽文件夹；此处取消屏蔽后立即恢复显示
              </div>
            </div>
            <span class="chip">{{ state.blocked.length }} 项</span>
          </div>

          <div v-if="state.blocked.length" class="blocklist">
            <div v-for="path in state.blocked" :key="path" class="blockrow">
              <Icon name="ban" :size="14" />
              <span class="blockrow__value" :title="path">{{ path }}</span>
              <button class="btn btn--plain" @click="unblockProject(path)">取消屏蔽</button>
            </div>
          </div>
          <p v-else class="setting__desc" style="margin-top: 10px">暂无屏蔽的项目</p>
        </div>
      </div>

      <div class="dialog__footer">
        <button class="btn btn--ghost" @click="state.settingsOpen = false">取消</button>
        <button class="btn btn--accent" @click="saveSettings(draft)">保存设置</button>
      </div>
    </div>
  </div>
</template>