<template>
  <div class="exclude-lyrics-modal">
    <n-flex vertical size="large">
      <n-card class="switch-card" size="small">
        <n-flex align="center" justify="space-between">
          <n-text>Enable lyric exclusion</n-text>
          <n-switch v-model:value="enableExcludeLyrics" :round="false" />
        </n-flex>
      </n-card>

      <n-tabs v-model:value="page" animated>
        <n-tab-pane name="options" tab="Exclusion options">
          <div class="set-list">
            <n-card class="set-item">
              <div class="label">
                <n-text class="name">TTML lyric exclusion</n-text>
                <n-text class="tip" :depth="3">
                  Apply lyric exclusion to TTML lyrics <br />
                  AMLL TTML DB enforces strict standards and usually excludes non-lyric metadata
                  like composer/lyricist info, so this is typically unnecessary
                </n-text>
              </div>
              <n-switch v-model:value="enableExcludeTTML" class="set" :round="false" />
            </n-card>
            <n-card v-if="isElectron" class="set-item">
              <div class="label">
                <n-text class="name">Local lyric exclusion</n-text>
                <n-text class="tip" :depth="3">
                  Apply lyric exclusion to local lyrics, including local overrides and local song lyrics
                </n-text>
              </div>
              <n-switch v-model:value="enableExcludeLocalLyrics" class="set" :round="false" />
            </n-card>
          </div>
        </n-tab-pane>

        <n-tab-pane name="keywords" tab="Metadata keywords">
          <n-scrollbar style="max-height: 50vh">
            <n-flex vertical :size="12">
              <n-text depth="3">Metadata keyword filtering (matches keywords before colon)</n-text>
              <n-dynamic-tags v-model:value="filterKeywords" />
              <n-popconfirm @positive-click="clearKeywords">
                <template #trigger>
                  <n-button type="error" secondary size="small">
                    <template #icon>
                      <SvgIcon name="DeleteSweep" />
                    </template>
                    Clear metadata keywords
                  </n-button>
                </template>
                <n-text> Are you sure you want to clear all metadata keyword rules? </n-text>
              </n-popconfirm>
            </n-flex>
          </n-scrollbar>
        </n-tab-pane>

        <n-tab-pane name="regexes" tab="Regular Expressions">
          <n-scrollbar style="max-height: 50vh">
            <n-flex vertical :size="12">
              <n-text depth="3">Regex filtering (supports JavaScript regular expressions)</n-text>
              <n-dynamic-tags v-model:value="filterRegexes" />
              <n-popconfirm @positive-click="clearRegexes">
                <template #trigger>
                  <n-button type="error" secondary size="small">
                    <template #icon>
                      <SvgIcon name="DeleteSweep" />
                    </template>
                    Clear regex rules
                  </n-button>
                </template>
                <n-text> Are you sure you want to clear all regex rules? </n-text>
              </n-popconfirm>
            </n-flex>
          </n-scrollbar>
        </n-tab-pane>
      </n-tabs>

      <n-divider style="margin: 6px 0" />

      <n-flex justify="space-between">
        <n-flex>
          <n-collapse-transition :show="page !== 'options'">
            <n-flex>
              <n-popconfirm @positive-click="clearAll">
                <template #trigger>
                  <n-button type="error" secondary>
                    <template #icon>
                      <SvgIcon name="DeleteSweep" />
                    </template>
                    Clear all
                  </n-button>
                </template>
                <n-text>
                  Are you sure you want to clear all filters (metadata keywords and regex)?
                </n-text>
              </n-popconfirm>
              <n-button secondary @click="importFilters"> Import </n-button>
              <n-button secondary @click="exportFilters"> Export </n-button>
            </n-flex>
          </n-collapse-transition>
        </n-flex>
        <n-flex>
          <n-button @click="handleClose">Cancel</n-button>
          <n-button type="primary" @click="saveFilter">Save</n-button>
        </n-flex>
      </n-flex>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";

const emit = defineEmits(["close"]);

const settingStore = useSettingStore();

const enableExcludeLyrics = ref(settingStore.enableExcludeLyrics);
const enableExcludeTTML = ref(settingStore.enableExcludeLyricsTTML);
const enableExcludeLocalLyrics = ref(settingStore.enableExcludeLyricsLocal);

const filterKeywords = ref<string[]>([]);
const filterRegexes = ref<string[]>([]);
const page = ref("options");

// 清空关键词
const clearKeywords = () => {
  filterKeywords.value = [];
};

// 清空正则表达式
const clearRegexes = () => {
  filterRegexes.value = [];
};

// 清空全部
const clearAll = () => {
  filterKeywords.value = [];
  filterRegexes.value = [];
};

// 导出规则
const exportFilters = () => {
  const data = {
    keywords: settingStore.excludeLyricsUserKeywords || [],
    regexes: settingStore.excludeLyricsUserRegexes || [],
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "splayer-lyrics-filters.json";
  a.click();
  URL.revokeObjectURL(url);
};

// 导入规则
const importFilters = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.keywords && Array.isArray(data.keywords)) {
          filterKeywords.value = data.keywords;
        }
        if (data.regexes && Array.isArray(data.regexes)) {
          filterRegexes.value = data.regexes;
        }
        window.$message.success("Rules imported successfully");
      } catch (error) {
        console.error("Import filters error:", error);
        window.$message.error("Failed to parse rule file");
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

// 保存过滤
const saveFilter = () => {
  settingStore.enableExcludeLyrics = enableExcludeLyrics.value;
  settingStore.enableExcludeLyricsTTML = enableExcludeTTML.value;
  settingStore.enableExcludeLyricsLocal = enableExcludeLocalLyrics.value;
  settingStore.excludeLyricsUserKeywords = filterKeywords.value;
  settingStore.excludeLyricsUserRegexes = filterRegexes.value;
  window.$message.success("Settings saved");
  handleClose();
};

const handleClose = () => {
  emit("close");
};

onMounted(() => {
  enableExcludeLyrics.value = settingStore.enableExcludeLyrics;
  enableExcludeTTML.value = settingStore.enableExcludeLyricsTTML;
  enableExcludeLocalLyrics.value = settingStore.enableExcludeLyricsLocal;
  filterKeywords.value = [...(settingStore.excludeLyricsUserKeywords || [])];
  filterRegexes.value = [...(settingStore.excludeLyricsUserRegexes || [])];
});
</script>

<style lang="scss" scoped>
.exclude-lyrics-modal {
  padding: 0;
  .switch-card {
    width: 100%;
    border-radius: 8px;
    .n-text {
      font-size: 16px;
    }
  }

  .set-list {
    margin-bottom: 24px;
    &:last-child {
      margin-bottom: 0;
    }
  }
  .set-item {
    width: 100%;
    border-radius: 8px;
    margin-bottom: 12px;
    transition: margin 0.3s;
    &:last-child {
      margin-bottom: 0;
    }
    :deep(.n-card__content) {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
    }
    .label {
      display: flex;
      flex-direction: column;
      padding-right: 20px;
      .name {
        font-size: 16px;
      }
    }
    .n-flex {
      flex-flow: nowrap !important;
    }
    .set {
      justify-content: flex-end;
      width: 200px;
      &.n-switch {
        width: max-content;
      }
      @media (max-width: 768px) {
        width: 140px;
        min-width: 140px;
      }
    }
  }
}
</style>
