<template>
  <div class="context-menu-manager">
    <div class="list">
      <n-card
        v-for="item in items"
        :key="item.key"
        :content-style="{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
        }"
        class="item"
      >
        <n-text class="name">{{ item.label }}</n-text>
        <n-switch
          :value="settingStore.contextMenuOptions[item.key]"
          :round="false"
          @update:value="(val) => updateSetting(item.key, val)"
        />
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import type { SettingState } from "@/stores/setting";

const settingStore = useSettingStore();

type ContextMenuOptionKey = keyof SettingState["contextMenuOptions"];
type Item = { label: string; key: ContextMenuOptionKey };

const items: Item[] = [
  { label: "Play", key: "play" },
  { label: "Play Next", key: "playNext" },
  { label: "Add to Playlist", key: "addToPlaylist" },
  { label: "View MV", key: "mv" },
  { label: "Not Interested", key: "dislike" },
  { label: "More Actions", key: "more" },
  { label: "Import to Cloud", key: "cloudImport" },
  { label: "Remove from Playlist", key: "deleteFromPlaylist" },
  { label: "Remove from Cloud", key: "deleteFromCloud" },
  { label: "Remove from Local", key: "deleteFromLocal" },
  { label: "Open Folder", key: "openFolder" },
  { label: "Cloud Song Match", key: "cloudMatch" },
  { label: "Song Wiki", key: "wiki" },
  { label: "Search", key: "search" },
  { label: "Download", key: "download" },
  { label: "Copy Song Name", key: "copyName" },
  { label: "Music Tag Editor", key: "musicTagEditor" },
];

const updateSetting = (key: ContextMenuOptionKey, val: boolean) => {
  settingStore.contextMenuOptions[key] = val;
};
</script>

<style scoped lang="scss">
.context-menu-manager {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;

  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(128, 128, 128, 0.3);
    border-radius: 3px;
    &:hover {
      background-color: rgba(128, 128, 128, 0.5);
    }
  }
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  .item {
    border-radius: 8px;
    .name {
      font-size: 16px;
      line-height: normal;
    }
    .n-switch {
      margin-left: auto;
    }
  }
}
</style>
