<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    /** 相对锚点元素定位 */
    anchor?: HTMLElement | null;
    /** 相对屏幕坐标定位（右键菜单） */
    point?: { x: number; y: number } | null;
    placement?: "below" | "right";
    width?: number;
  }>(),
  { placement: "below", width: 220 },
);

const emit = defineEmits<{ (event: "close"): void }>();

const root = ref<HTMLElement | null>(null);
const style = ref<Record<string, string>>({ visibility: "hidden" });

function place(): void {
  const width = root.value?.offsetWidth ?? props.width;
  const height = root.value?.offsetHeight ?? 160;

  let x = 12;
  let y = 12;

  if (props.point) {
    x = props.point.x;
    y = props.point.y;
  } else if (props.anchor) {
    const rect = props.anchor.getBoundingClientRect();
    if (props.placement === "right") {
      x = rect.right + 6;
      y = rect.top - 6;
    } else {
      x = rect.left;
      y = rect.bottom + 8;
    }
  }

  style.value = {
    left: `${Math.max(10, Math.min(x, window.innerWidth - width - 10))}px`,
    top: `${Math.max(10, Math.min(y, window.innerHeight - height - 10))}px`,
    minWidth: `${props.width}px`,
    visibility: "visible",
  };
}

onMounted(async () => {
  place();
  await nextTick();
  place();
});
</script>

<template>
  <Teleport to="body">
    <div class="scrim" @mousedown="emit('close')" @contextmenu.prevent="emit('close')" />
    <div ref="root" class="menu" :style="style" @mousedown.stop>
      <slot />
    </div>
  </Teleport>
</template>