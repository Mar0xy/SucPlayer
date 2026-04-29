<template>
  <div class="fullscreen-player-manager">
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
          :value="item.disabled ? false : settingStore.fullscreenPlayerElements[item.key]"
          :disabled="item.disabled"
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

type FullscreenPlayerElementKey = keyof SettingState["fullscreenPlayerElements"];
type Item = { label: string; key: FullscreenPlayerElementKey; disabled?: boolean };

const items = computed<Item[]>(() => [
  { label: "Show Like Button", key: "like" },
  { label: "Show Add to Playlist", key: "addToPlaylist" },
  { label: "Show Download Button", key: "download" },
  { label: "Show Desktop Lyrics", key: "desktopLyric" },
  { label: "Show More Settings", key: "moreSettings" },
  { label: "Show Copy Lyrics", key: "copyLyric" },
  { label: "Show Lyric Offset", key: "lyricOffset" },
  { label: "Show Lyric Settings", key: "lyricSettings" },
  {
    label: "Show Comment Count",
    key: "commentCount",
    disabled: !settingStore.fullscreenPlayerElements.comments,
  },
]);

const updateSetting = (key: FullscreenPlayerElementKey, val: boolean) => {
  settingStore.fullscreenPlayerElements[key] = val;
};
</script>

<style scoped lang="scss">
.fullscreen-player-manager {
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
