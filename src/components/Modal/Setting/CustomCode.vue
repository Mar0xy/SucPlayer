<template>
  <n-scrollbar style="max-height: 70vh" class="custom-code">
    <n-alert type="error" title="High-Risk Operation Warning">
      Entering arbitrary content here may cause application issues, including UI glitches, feature failures, or data loss. Proceed with caution.<br />
      Do not paste unknown or untrusted code. Malicious code may steal account data, leak privacy data, or crash the application.
    </n-alert>
    <div class="code-section">
      <n-h3 prefix="bar">Custom CSS</n-h3>
      <n-text :depth="3"> Enter custom CSS styles. They will be injected into the page. </n-text>
      <n-input
        v-model:value="customCss"
        :autosize="{ minRows: 6, maxRows: 12 }"
        type="textarea"
        placeholder="/* Enter custom CSS */"
        style="font-family: monospace"
      />
    </div>
    <div class="code-section">
      <n-h3 prefix="bar">Custom JavaScript</n-h3>
      <n-text :depth="3">
        Enter custom JavaScript. It runs on app startup (effective after restart).
      </n-text>
      <n-input
        v-model:value="customJs"
        :autosize="{ minRows: 6, maxRows: 12 }"
        type="textarea"
        placeholder="// Enter custom JavaScript"
        style="font-family: monospace"
      />
    </div>
    <n-flex justify="end" style="margin-top: 16px">
      <n-button type="primary" strong @click="saveCode">Save</n-button>
    </n-flex>
  </n-scrollbar>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";

const settingStore = useSettingStore();

// 本地编辑状态
const customCss = ref(settingStore.customCss);
const customJs = ref(settingStore.customJs);

// 保存代码
const saveCode = () => {
  settingStore.customCss = customCss.value;
  settingStore.customJs = customJs.value;
  window.$message.success("Custom code saved");
};

watch(
  () => settingStore.customCss,
  (val) => (customCss.value = val),
);
watch(
  () => settingStore.customJs,
  (val) => (customJs.value = val),
);
</script>

<style lang="scss" scoped>
.custom-code {
  .n-alert {
    margin-bottom: 16px;
  }
  .n-h3 {
    margin-bottom: 12px;
  }
  .n-text {
    display: block;
    margin-bottom: 8px;
  }
  .code-section {
    margin-bottom: 20px;
    &:last-of-type {
      margin-bottom: 0;
    }
  }
}
</style>
