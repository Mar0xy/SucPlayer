<template>
  <div class="playlist-page-manager">
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
          :value="settingStore.playlistPageElements[item.key]"
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

type PlaylistPageElementKey = keyof SettingState["playlistPageElements"];
type Item = { label: string; key: PlaylistPageElementKey };

const items: Item[] = [
  { label: "Show Tags", key: "tags" },
  { label: "Show Creator/Artist", key: "creator" },
  { label: "Show Created/Updated Time", key: "time" },
  { label: "Show Description", key: "description" },
];

const updateSetting = (key: PlaylistPageElementKey, val: boolean) => {
  settingStore.playlistPageElements[key] = val;
};
</script>

<style scoped lang="scss">
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
