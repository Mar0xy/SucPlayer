<template>
  <n-dropdown
    :x="dropdownX"
    :y="dropdownY"
    :show="dropdownShow"
    :options="dropdownOptions"
    class="search-inp-menu"
    placement="bottom-start"
    trigger="manual"
    @select="dropdownShow = false"
    @clickoutside="dropdownShow = false"
  >
  </n-dropdown>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import type { CoverType } from "@/types/main";
import { renderIcon, copyData, getShareUrl } from "@/utils/helper";
import { useMusicStore, useStatusStore } from "@/stores";

const emit = defineEmits<{
  // 直接搜索
  toPlay: [item: CoverType];
}>();

const router = useRouter();
const musicStore = useMusicStore();
const statusStore = useStatusStore();

// 右键菜单数据
const dropdownX = ref<number>(0);
const dropdownY = ref<number>(0);
const dropdownShow = ref<boolean>(false);
const dropdownOptions = ref<DropdownOption[]>([]);
// 开启右键菜单
const openDropdown = async (
  e: MouseEvent,
  item: CoverType,
  type: "playlist" | "album" | "video" | "radio",
) => {
  try {
    e.preventDefault();
    dropdownShow.value = false;
    // 生成菜单
    nextTick().then(() => {
      dropdownOptions.value = [
        {
          key: "open",
          label: "View details",
          props: {
            onClick: () =>
              router.push({
                name: type,
                query: { id: item.id },
              }),
          },
          icon: renderIcon("Eye"),
        },
        {
          key: "play",
          label: "Play",
          show: musicStore.playPlaylistId !== item.id || !statusStore.playStatus,
          props: {
            onClick: () => emit("toPlay", item),
          },
          icon: renderIcon("Play"),
        },
        {
          key: "pause",
          label: "Pause",
          show: musicStore.playPlaylistId === item.id && statusStore.playStatus,
          props: {
            onClick: () => emit("toPlay", item),
          },
          icon: renderIcon("Pause"),
        },
        {
          key: "line",
          type: "divider",
        },
        {
          key: "code-name",
          label: `Copy ${type === "playlist" ? "playlist" : type === "album" ? "album" : type === "video" ? "video" : "radio"} name`,
          props: {
            onClick: () => copyData(item.name),
          },
          icon: renderIcon("Copy", { size: 18 }),
        },
        {
          key: "code-id",
          label: `Copy ${type === "playlist" ? "playlist" : type === "album" ? "album" : type === "video" ? "video" : "radio"} ID`,
          props: {
            onClick: () => copyData(item.id),
          },
          icon: renderIcon("Copy", { size: 18 }),
        },
        {
          key: "share",
          label: `Share ${type === "playlist" ? "playlist" : type === "album" ? "album" : type === "video" ? "video" : "radio"} link`,
          show: item.id !== 0 && item.id?.toString().length < 16,
          props: {
            onClick: () => copyData(getShareUrl(type, item.id), "Share link copied to clipboard"),
          },
          icon: renderIcon("Share", { size: 18 }),
        },
      ];
      // 显示菜单
      dropdownX.value = e.clientX;
      dropdownY.value = e.clientY;
      dropdownShow.value = true;
    });
  } catch (error) {
    console.error("Context menu error:", error);
    window.$message.error("Context menu error");
  }
};

defineExpose({ openDropdown });
</script>
