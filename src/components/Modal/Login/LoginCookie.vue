<template>
  <div class="login-cookie">
    <n-alert :bordered="false" title="How to get Cookie">
      <template #icon>
        <SvgIcon name="Help" />
      </template>
      You can get it from the official
      <n-a href="https://music.163.com/" target="_blank">网页端</n-a>
      or click auto-fetch below. Only the <code>MUSIC_U</code> field is required, for example:
      <code>MUSIC_U=00C7...;</code><br />Note: it must end with <code>;</code>
    </n-alert>
    <n-input
      v-model:value="cookie"
      :autosize="{ minRows: 3, maxRows: 6 }"
      type="textarea"
      placeholder="Enter Cookie"
    />
    <n-flex class="menu">
      <n-button v-if="isElectron" type="primary" @click="openWeb">Auto Fetch</n-button>
      <n-button type="primary" @click="login">Login</n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { LoginType } from "@/types/main";
import { isElectron } from "@/utils/env";

const emit = defineEmits<{
  close: [];
  saveLogin: [any, LoginType];
}>();

const cookie = ref<string>();

// 开启窗口
const openWeb = () => {
  window.$dialog.info({
    title: "Before you continue",
    content:
      "This feature still cannot guarantee account security. Use at your own discretion. If the opened page is blank or unclickable, close it and try again.",
    positiveText: "I understand",
    negativeText: "Cancel",
    onPositiveClick: () => window.electron.ipcRenderer.send("open-login-web"),
  });
};

// Cookie 登录
const login = async () => {
  if (!cookie.value) {
    window.$message.warning("Please enter Cookie");
    return;
  }
  cookie.value = cookie.value.trim();

  // 检查是否包含 MUSIC_U
  let decodedCookie = cookie.value;
  try {
    // 如果包含URL编码字符，尝试解码检查
    if (cookie.value.includes("%")) {
      decodedCookie = decodeURIComponent(cookie.value);
    }
  } catch {}
  // 检查是否包含 MUSIC_U
  const hasMusicU = cookie.value.includes("MUSIC_U") || decodedCookie.includes("MUSIC_U");
  if (!hasMusicU) {
    window.$message.warning("Please enter a valid Cookie (must include MUSIC_U)");
    return;
  }
  // 如果原始cookie没有以分号结尾，自动添加（setCookies会处理URL编码的情况）
  let finalCookie = cookie.value;
  if (!decodedCookie.endsWith(";") && !cookie.value.endsWith("%3B")) {
    finalCookie += ";";
  }
  // 写入 Cookie
  try {
    window.$message.success("Login successful");
    // 保存登录信息
    emit(
      "saveLogin",
      {
        code: 200,
        cookie: finalCookie,
      },
      "cookie",
    );
    emit("close");
  } catch (error) {
    window.$message.error("Login failed, please try again");
    console.error("Cookie login error:", error);
  }
};

onMounted(() => {
  if (isElectron) {
    window.electron.ipcRenderer.on("send-cookies", (_, value) => {
      if (!value) return;
      cookie.value = value;
      login();
    });
  }
});
</script>

<style lang="scss" scoped>
.login-cookie {
  .n-input,
  .n-button {
    width: 100%;
    margin-top: 20px;
  }
  code {
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: var(--n-border-color);
    padding: 4px 6px;
    border-radius: 8px;
    margin: 4px 0;
    font-family: auto;
  }
  .menu {
    margin-top: 20px;
    .n-button {
      width: auto;
      flex: 1;
      margin: 0;
    }
  }
}
</style>
