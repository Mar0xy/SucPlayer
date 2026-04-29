<template>
  <div class="exclude-comment-modal">
    <n-flex vertical size="large">
      <n-card class="switch-card" size="small">
        <n-flex align="center" justify="space-between">
          <n-text>Enable comment exclusion</n-text>
          <n-switch v-model:value="enableExcludeComments" :round="false" />
        </n-flex>
      </n-card>

      <n-tabs v-model:value="page" animated>
        <n-tab-pane name="keywords" tab="Keywords">
          <n-scrollbar style="max-height: 50vh">
            <n-flex vertical :size="12">
              <n-text depth="3">Keyword filtering (supports plain text matching)</n-text>
              <n-dynamic-tags v-model:value="filterKeywords" />
              <n-popconfirm @positive-click="clearKeywords">
                <template #trigger>
                  <n-button type="error" secondary size="small">
                    <template #icon>
                      <SvgIcon name="DeleteSweep" />
                    </template>
                    Clear keywords
                  </n-button>
                </template>
                <n-text> Are you sure you want to clear all keyword rules? </n-text>
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
          <n-popconfirm @positive-click="clearAll">
            <template #trigger>
              <n-button type="error" secondary>
                <template #icon>
                  <SvgIcon name="DeleteSweep" />
                </template>
                Clear all
              </n-button>
            </template>
            <n-text> Are you sure you want to clear all filters (keywords and regex)? </n-text>
          </n-popconfirm>
          <n-button secondary @click="importFilters"> Import </n-button>
          <n-button secondary @click="exportFilters"> Export </n-button>
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

const emit = defineEmits(["close"]);

const settingStore = useSettingStore();

const enableExcludeComments = ref(settingStore.enableExcludeComments);
const filterKeywords = ref<string[]>([]);
const filterRegexes = ref<string[]>([]);
const page = ref("keywords");

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
    keywords: settingStore.excludeCommentKeywords || [],
    regexes: settingStore.excludeCommentRegexes || [],
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "splayer-comment-filters.json";
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
  settingStore.enableExcludeComments = enableExcludeComments.value;
  settingStore.excludeCommentKeywords = filterKeywords.value;
  settingStore.excludeCommentRegexes = filterRegexes.value;
  window.$message.success("Settings saved");
  handleClose();
};

const handleClose = () => {
  emit("close");
};

onMounted(() => {
  enableExcludeComments.value = settingStore.enableExcludeComments;
  filterKeywords.value = [...(settingStore.excludeCommentKeywords || [])];
  filterRegexes.value = [...(settingStore.excludeCommentRegexes || [])];
});
</script>

<style scoped lang="scss">
.exclude-comment-modal {
  padding: 0;
  .switch-card {
    width: 100%;
    border-radius: 8px;
    .n-text {
      font-size: 16px;
    }
  }
}
</style>
