<template>
  <n-card class="set-item" content-style="flex-direction: column; padding: 16px;">
    <n-flex justify="space-between" align="center" style="width: 100%">
      <div class="label">
        <n-text class="name">{{ item?.label || "Local lyrics override online lyrics" }}</n-text>
        <n-text class="tip" :depth="3" v-if="item?.description" v-html="item.description" />
        <n-text class="tip" :depth="3" v-else>
          Lyrics in these folders and subfolders can override online lyrics <br />
          Name lyric files as `songId.extension` or `anyPrefix.songId.extension` <br />
          Supports .lrc and .ttml formats <br />
          (Tip: You can add song names in prefixes and organize files by subfolders)
        </n-text>
      </div>
      <n-button strong secondary @click="changeLocalLyricPath()">
        <template #icon>
          <SvgIcon name="Folder" />
        </template>
        Add
      </n-button>
    </n-flex>
    <n-collapse-transition :show="settingStore.localLyricPath.length > 0">
      <n-card
        v-for="(path, index) in settingStore.localLyricPath"
        :key="index"
        class="set-item sub-item"
        content-style="padding: 4px 16px"
      >
        <n-flex justify="space-between" align="center" style="width: 100%">
          <div class="label">
            <n-text class="name">{{ path }}</n-text>
          </div>
          <n-button strong secondary @click="changeLocalLyricPath(index)">
            <template #icon>
              <SvgIcon name="Delete" />
            </template>
          </n-button>
        </n-flex>
      </n-card>
    </n-collapse-transition>
  </n-card>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { changeLocalLyricPath } from "@/utils/helper";
import { SettingItem } from "@/types/settings";

defineProps<{
  item?: SettingItem;
}>();

const settingStore = useSettingStore();
</script>

<style scoped lang="scss">
.sub-item {
  margin-top: 12px;
  background-color: rgba(var(--primary), 0.05);
}
</style>
