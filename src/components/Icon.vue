<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{ name: string; size?: number; stroke?: number }>(),
  { size: 18, stroke: 1.7 },
);

const paths: Record<string, string> = {
  sparkle:
    '<path d="M12 3.4l1.84 5.02L18.9 10.3l-5.06 1.88L12 17.2l-1.84-5.02L5.1 10.3l5.06-1.88z"/><path d="M18.5 15.2l.72 1.96 1.98.72-1.98.72-.72 1.96-.72-1.96-1.98-.72 1.98-.72z"/>',
  folder:
    '<path d="M4 7a2.5 2.5 0 0 1 2.5-2.5h2.2a2 2 0 0 1 1.5.7l1.1 1.2h6.2A2.5 2.5 0 0 1 20 8.9v7.6a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/>',
  refresh: '<path d="M19.6 12a7.6 7.6 0 1 1-2.23-5.38"/><path d="M19.9 4.2v4.5h-4.5"/>',
  sliders:
    '<path d="M4 7h8.8M17.8 7h2.2M4 12h2.8M11.8 12h8.2M4 17h7.8M16.8 17h3.2"/><circle cx="14.8" cy="7" r="2.2"/><circle cx="8.2" cy="12" r="2.2"/><circle cx="13.4" cy="17" r="2.2"/>',
  archive:
    '<rect x="3.5" y="4.6" width="17" height="4.4" rx="1.5"/><path d="M5.4 9v8.8a2 2 0 0 0 2 2h9.2a2 2 0 0 0 2-2V9"/><path d="M10.2 12.8h3.6"/>',
  restore: '<path d="M3.6 12a8.4 8.4 0 1 0 2.5-6"/><path d="M3.4 4v4.4h4.4"/>',
  trash:
    '<path d="M4 7h16"/><path d="M9.6 7V5.7A1.7 1.7 0 0 1 11.3 4h1.4a1.7 1.7 0 0 1 1.7 1.7V7"/><path d="M6.6 7l.85 12.1a2 2 0 0 0 2 1.9h5.1a2 2 0 0 0 2-1.9L17.4 7"/><path d="M10.3 11.2v5.6M13.7 11.2v5.6"/>',
  send: '<path d="M21.2 2.8 10.6 13.4"/><path d="M21.2 2.8 14.7 21l-4.1-7.6L3 9.3z"/>',
  edit:
    '<path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/><path d="M10 21H4.5a.5.5 0 0 1-.5-.5V15"/>',
  chevronDown: '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  chevronRight: '<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>',
  monitor:
    '<rect x="3" y="4.5" width="18" height="12" rx="2.2"/><path d="M9 20h6M12 16.5V20"/>',
  smartphone:
    '<rect x="6.6" y="2.6" width="10.8" height="18.8" rx="2.6"/><path d="M11 18.6h2"/>',
  globe:
    '<circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8"/><path d="M12 3.4c2.2 2.4 3.3 5.3 3.3 8.6s-1.1 6.2-3.3 8.6c-2.2-2.4-3.3-5.3-3.3-8.6s1.1-6.2 3.3-8.6z"/>',
  close: '<path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6"/>',
  minimize: '<path d="M5.5 12h13"/>',
  maximize: '<rect x="5.8" y="5.8" width="12.4" height="12.4" rx="2"/>',
  check: '<path d="m5 12.6 4.6 4.6L19 7.4"/>',
  ban: '<circle cx="12" cy="12" r="8.6"/><path d="M6.2 6.2 17.8 17.8"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.6"/><path d="m8.3 12.3 2.6 2.6 4.9-5.4"/>',
  alert:
    '<path d="M10.3 4.3 3.1 16.8A2 2 0 0 0 4.8 19.8h14.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z"/><path d="M12 9.6v4"/><path d="M12 16.8h.01"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.2"/><path d="M12 7.9h.01"/>',
};

const markup = computed(() => {
  const body = paths[props.name] ?? "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${props.size}" height="${props.size}" ` +
    `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${props.stroke}" ` +
    `stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  );
});
</script>

<template>
  <span class="icon" v-html="markup" />
</template>