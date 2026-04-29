<template>
  <div class="sidebar-hide-manager">
    <n-scrollbar style="max-height: 400px" trigger="none">
      <div class="list">
        <n-card
          v-for="item in sidebarItems"
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
            :value="!settingStore.sidebarHide[item.key]"
            :round="false"
            @update:value="(val) => updateSetting(item.key, !val)"
          />
        </n-card>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { NScrollbar } from "naive-ui";
import { useSettingStore, useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";

const settingStore = useSettingStore();
const statusStore = useStatusStore();

type SidebarHideKey = keyof typeof settingStore.sidebarHide;
type SidebarHideItem = { label: string; key: SidebarHideKey };

const when = (condition: boolean, ...item: SidebarHideItem[]): SidebarHideItem[] => {
  return condition ? item : [];
};

const sidebarItems: SidebarHideItem[] = [
  { label: "Discover", key: "hideDiscover" },
  { label: "Personal FM", key: "hidePersonalFM" },
  { label: "Podcasts", key: "hideRadioHot" },
  { label: "Favorites", key: "hideLike" },
  { label: "Cloud", key: "hideCloud" },
  ...when(isElectron && statusStore.isDeveloperMode, { label: "Downloads", key: "hideDownload" }),
  ...when(isElectron, { label: "Local Music", key: "hideLocal" }),
  { label: "Recently Played", key: "hideHistory" },
  { label: "Created Playlists", key: "hideUserPlaylists" },
  { label: "Liked Playlists", key: "hideLikedPlaylists" },
  { label: "Heartbeat Mode", key: "hideHeartbeatMode" },
];

const updateSetting = (key: SidebarHideKey, val: boolean) => {
  settingStore.sidebarHide[key] = val;
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
