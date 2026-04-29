<template>
  <div class="login-uid">
    <n-alert :bordered="false" title="How to get UID">
      <template #icon>
        <SvgIcon name="Help" />
      </template>
      Go to
      <n-a href="https://music.163.com/" target="_blank">网易云音乐</n-a>
      website, sign in and open your profile page. You can get UID from the URL or a shared link.
    </n-alert>
    <n-input-number v-model:value="uid" :show-button="false" placeholder="Enter UID" />
    <n-button :loading="!!loadingMsg" type="primary" @click="login">Login</n-button>
  </div>
</template>

<script setup lang="ts">
import type { MessageReactive } from "naive-ui";
import type { LoginType } from "@/types/main";
import { userDetail } from "@/api/user";

const emit = defineEmits<{
  close: [];
  saveLogin: [any, LoginType];
}>();

const uid = ref<number>();
const loadingMsg = ref<MessageReactive | null>(null);

// UID 登录
const login = async () => {
  if (!uid.value) {
    window.$message.warning("Please enter UID");
    return;
  }
  // 检查用户
  loadingMsg.value = window.$message.loading("Trying to login", { duration: 0 });
  try {
    const result = await userDetail(uid.value);
    window.$message.success("Login successful");
    // 保存登录信息
    emit("saveLogin", result, "uid");
    emit("close");
  } catch (error) {
    window.$message.error("Login failed, please try again");
    console.error("UID login error:", error);
  } finally {
    loadingMsg.value?.destroy();
    loadingMsg.value = null;
  }
};
</script>

<style lang="scss" scoped>
.login-uid {
  .n-input-number,
  .n-button {
    width: 100%;
    margin-top: 20px;
  }
}
</style>
