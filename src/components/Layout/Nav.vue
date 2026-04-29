<template>
  <n-layout-header class="nav">
    <!-- 页面导航 -->
    <n-flex class="page-control">
      <Logo v-if="!isDesktop" :size="40" @click="router.push('/')" />
      <template v-if="!isSmallScreen">
        <n-button :focusable="false" tertiary circle @click="router.go(-1)">
          <template #icon>
            <SvgIcon name="NavigateBefore" :size="26" />
          </template>
        </n-button>
        <n-button :focusable="false" tertiary circle @click="router.go(1)">
          <template #icon>
            <SvgIcon name="NavigateNext" :size="26" />
          </template>
        </n-button>
      </template>
      <!-- 有可用更新 -->
      <n-button
        v-if="statusStore.updateAvailable"
        :focusable="false"
        :title="updateBtnTitle"
        tertiary
        circle
        @click="handleUpdateClick"
      >
        <template #icon>
          <SvgIcon name="Update" />
        </template>
      </n-button>
    </n-flex>
    <!-- 主内容 -->
    <n-flex :wrap="false" justify="end" class="nav-main">
      <!-- 搜索 -->
      <SearchInp v-if="settingStore.useOnlineService" />
      <!-- 可拖拽 -->
      <div v-if="isDesktop" class="nav-drag" />
      <n-flex align="center">
        <!-- 用户 -->
        <User v-if="settingStore.useOnlineService" />
        <!-- 设置菜单 -->
        <n-dropdown :options="setOptions" trigger="click" @select="setSelect">
          <n-button :focusable="false" title="Settings" tertiary circle>
            <template #icon>
              <SvgIcon name="Settings" />
            </template>
          </n-button>
        </n-dropdown>
        <!-- 移动端菜单 -->
        <n-button
          v-if="!isDesktop"
          :focusable="false"
          tertiary
          circle
          @click="showAside = !showAside"
        >
          <template #icon>
            <SvgIcon name="Menu" />
          </template>
        </n-button>
        <n-drawer v-model:show="showAside" :width="240" placement="left">
          <n-drawer-content :body-content-style="{ padding: 0 }" :native-scrollbar="false">
            <template #header>
              <n-flex align="center" justify="center" class="aside-logo">
                <Logo />
                <n-text>SPlayer</n-text>
              </n-flex>
            </template>
            <Menu @menu-click="showAside = false" />
          </n-drawer-content>
        </n-drawer>
      </n-flex>
    </n-flex>
    <!-- 客户端控制 -->
    <n-flex
      v-if="isElectron && !isSmallScreen && useBorderless"
      align="center"
      class="client-control"
    >
      <n-divider class="divider" vertical />
      <div class="min-button-wrapper" @click="min" title="Minimize">
        <n-button :focusable="false" title="Minimize" tertiary circle @click.stop="min">
          <template #icon>
            <SvgIcon name="WindowMinimize" />
          </template>
        </n-button>
        <div class="min-expanded-area"></div>
      </div>
      <div class="max-button-wrapper" @click="maxOrRes" :title="isMax ? 'Restore' : 'Maximize'">
        <n-button
          :focusable="false"
          :title="isMax ? 'Restore' : 'Maximize'"
          tertiary
          circle
          @click.stop="maxOrRes"
        >
          <template #icon>
            <SvgIcon :name="isMax ? 'WindowRestore' : 'WindowMaximize'" />
          </template>
        </n-button>
        <div class="max-expanded-area"></div>
      </div>
      <div class="close-button-wrapper" @click="tryClose" title="Close">
        <n-button :focusable="false" title="Close" tertiary circle @click.stop="tryClose">
          <template #icon>
            <SvgIcon name="WindowClose" />
          </template>
        </n-button>
        <div class="close-expanded-area"></div>
      </div>
    </n-flex>
    <!-- 关闭弹窗 -->
    <n-modal
      v-model:show="showCloseModal"
      :auto-focus="false"
      title="Close app"
      style="width: 600px"
      preset="card"
      transform-origin="center"
      bordered
      @after-leave="rememberNotAsk = false"
    >
      <n-text class="tip">Are you sure you want to close the app?</n-text>
      <n-checkbox v-model:checked="rememberNotAsk" class="checkbox"> Remember and do not ask again </n-checkbox>
      <template #footer>
        <n-flex justify="end">
          <n-button strong secondary @click="hideOrClose('exit')">
            <template #icon>
              <SvgIcon name="ExitToApp" />
            </template>
            Close
          </n-button>
          <n-button type="primary" strong secondary @click="hideOrClose('hide')">
            <template #icon>
              <SvgIcon name="WindowHide" />
            </template>
            Hide to tray
          </n-button>
        </n-flex>
      </template>
    </n-modal>
  </n-layout-header>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui";
import { useSettingStore, useStatusStore } from "@/stores";
import { renderIcon } from "@/utils/helper";
import { openSetting, openThemeConfig, openScalingModal, openUpdateApp } from "@/utils/modal";
import { isDev, isElectron } from "@/utils/env";
import { useMobile } from "@/composables/useMobile";

const router = useRouter();
const settingStore = useSettingStore();
const statusStore = useStatusStore();
const { isDesktop, isSmallScreen } = useMobile();

// 更新按钮提示
const updateBtnTitle = computed(() => {
  if (statusStore.updateDownloaded) return "Update ready, click to view";
  if (statusStore.updateDownloading) {
    return `Downloading ${Math.round(statusStore.updateDownloadProgress)}%`;
  }
  return `New version found ${statusStore.updateInfo?.version || ""}`;
});

// 点击更新按钮
const handleUpdateClick = () => {
  if (statusStore.updateInfo) {
    openUpdateApp(statusStore.updateInfo);
  }
};

const showCloseModal = ref(false);
// 是否记住
const rememberNotAsk = ref(false);
// 是否启用无边框窗口
const useBorderless = ref(true);
// 当前窗口状态
const isMax = ref(false);
// 是否显示侧边栏
const showAside = ref(false);

// 最小化
const min = () => window.electron.ipcRenderer.send("win-min");

// 最大化或还原
const maxOrRes = () => {
  if (window.electron.ipcRenderer.sendSync("win-state")) {
    window.electron.ipcRenderer.send("win-restore");
  } else {
    window.electron.ipcRenderer.send("win-max");
  }
};

// 隐藏或关闭
const hideOrClose = (action: "hide" | "exit") => {
  if (rememberNotAsk.value) {
    settingStore.showCloseAppTip = false;
    settingStore.closeAppMethod = action;
  }
  showCloseModal.value = false;
  window.electron.ipcRenderer.send(action === "hide" ? "win-hide" : "quit-app");
};

// 尝试关闭软件
const tryClose = () => {
  if (settingStore.showCloseAppTip) {
    showCloseModal.value = true;
  } else {
    hideOrClose(settingStore.closeAppMethod);
  }
};

// 设置菜单
const setOptions = computed<DropdownOption[]>(() => [
  {
    label:
      settingStore.themeMode === "auto"
        ? "Light mode"
        : settingStore.themeMode === "light"
          ? "Dark mode"
          : "Follow system",
    key: "themeMode",
    disabled: !!statusStore.backgroundImageUrl,
    icon: renderIcon(
      settingStore.themeMode === "auto"
        ? "LightTheme"
        : settingStore.themeMode === "light"
          ? "DarkTheme"
          : "AutoTheme",
    ),
  },
  {
    label: "Theme settings",
    key: "themeConfig",
    icon: renderIcon("Palette"),
  },
  {
    key: "zoom",
    label: "UI scaling",
    icon: renderIcon("ZoomIn"),
    show: isElectron,
  },
  {
    key: "divider-1",
    type: "divider",
  },
  {
    // 重启
    key: "restart",
    label: "Hot reload app",
    show: isElectron,
    props: { onClick: () => window.electron.ipcRenderer.send("win-reload") },
    icon: renderIcon("Restart"),
  },
  {
    key: "dev-tools",
    label: "Open devtools",
    show: isDev,
    icon: renderIcon("Code"),
  },
  {
    key: "setting",
    label: "Global settings",
    icon: renderIcon("Settings"),
  },
]);

// 菜单选择
const setSelect = (key: string) => {
  switch (key) {
    case "themeMode":
      settingStore.setThemeMode();
      break;
    case "themeConfig":
      openThemeConfig();
      break;
    case "zoom":
      openScalingModal();
      break;
    case "setting":
      openSetting();
      break;
    case "dev-tools":
      window.electron.ipcRenderer.send("open-dev-tools");
      break;
  }
};

onMounted(async () => {
  // 获取窗口状态并监听主进程的状态变更
  if (isElectron) {
    // 获取无边框窗口配置
    const windowConfig = await window.api.store.get("window");
    useBorderless.value = windowConfig?.useBorderless ?? true;
    // 获取窗口状态
    isMax.value = window.electron.ipcRenderer.sendSync("win-state");
    window.electron.ipcRenderer.on("win-state-change", (_event, value: boolean) => {
      isMax.value = value;
    });
  }
});
</script>

<style lang="scss" scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
  padding: 0 1rem;
  background-color: transparent;
  -webkit-app-region: drag;
  .n-button {
    width: 40px;
    height: 40px;
    -webkit-app-region: no-drag;
  }
  .nav-main {
    position: relative;
    flex: 1;
    align-items: center;
    height: 100%;
    margin-left: 12px;
    .nav-drag {
      flex: 1;
      width: 100%;
      height: 100%;
    }
  }
  .client-control {
    .divider {
      margin: 0 0 0 12px;
    }
    .min-button-wrapper,
    .max-button-wrapper,
    .close-button-wrapper {
      position: relative;
      cursor: pointer;
    }
    .min-expanded-area,
    .max-expanded-area,
    .close-expanded-area {
      position: fixed;
      top: 0;
      width: 50px;
      height: 70px;
      background-color: transparent;
      cursor: pointer;
      -webkit-app-region: no-drag;
      z-index: 1000;
    }
    .close-expanded-area {
      right: 0;
    }
    .max-expanded-area {
      right: 50px;
    }
    .min-expanded-area {
      right: 100px;
    }
  }
}
.tip {
  font-size: 16px;
}
.aside-logo {
  .n-text {
    width: 90px;
    font-size: 22px;
    font-family: "logo";
    margin-top: 2px;
    line-height: 40px;
  }
}
.checkbox {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: max-content;
  margin-top: 12px;
  :deep(.n-checkbox__label) {
    line-height: 0;
  }
}
</style>
