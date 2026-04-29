import { useDataStore, useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { isElectron } from "@/utils/env";
import { openExcludeComment } from "@/utils/modal";
import { sendRegisterProtocol } from "@/utils/protocol";
import { SettingConfig } from "@/types/settings";
import { NAlert } from "naive-ui";

export const useGeneralSettings = (): SettingConfig => {
  const dataStore = useDataStore();
  const musicStore = useMusicStore();
  const settingStore = useSettingStore();
  const statusStore = useStatusStore();
  const player = usePlayerController();

  const useOnlineService = ref(settingStore.useOnlineService);
  const updateChannel = ref("stable");

  // 初始化更新通道
  if (isElectron) {
    window.api.store.get("updateChannel").then((val) => {
      if (val) updateChannel.value = val;
    });
  }

  const handleModeChange = (val: boolean) => {
    if (val) {
      window.$dialog.warning({
        title: "Enable online services",
        content: "Enable online services for the app? Changes will take effect after hot reload.",
        positiveText: "Enable",
        negativeText: "Cancel",
        onPositiveClick: async () => {
          useOnlineService.value = true;
          settingStore.useOnlineService = true;
          // 清空播放列表
          await player.cleanPlayList();
          // 清理播放数据
          dataStore.$reset();
          musicStore.$reset();
          // 清空本地数据
          localStorage.removeItem("data-store");
          localStorage.removeItem("music-store");
          // 热重载
          window.location.reload();
        },
      });
    } else {
      window.$dialog.warning({
        title: "Disable online services",
        content:
          "Disable online services for the app? After disabling, only local music can be played. Changes will take effect after hot reload.",
        positiveText: "Disable",
        negativeText: "Cancel",
        onPositiveClick: async () => {
          useOnlineService.value = false;
          settingStore.useOnlineService = false;
          // 清空播放列表
          await player.cleanPlayList();
          // 清理播放数据
          dataStore.$reset();
          musicStore.$reset();
          // 清空本地数据
          localStorage.removeItem("data-store");
          localStorage.removeItem("music-store");
          // 热重载
          window.location.reload();
        },
        onNegativeClick: () => {
          useOnlineService.value = true;
          settingStore.useOnlineService = true;
        },
      });
    }
  };

  // 任务栏进度
  const closeTaskbarProgress = (val: boolean) => {
    if (!isElectron) return;
    if (!val) window.electron.ipcRenderer.send("set-bar", "none");
  };
  // Orpheus 协议
  const handleOrpheusChange = async (isRegistry: boolean) => {
    sendRegisterProtocol("orpheus", isRegistry);
  };

  // --- Backup & Restore Logic (from other.ts) ---
  const exportSettings = async () => {
    try {
      const rendererData = {
        "setting-store": localStorage.getItem("setting-store"),
        "shortcut-store": localStorage.getItem("shortcut-store"),
        // "status-store": localStorage.getItem("status-store"),
        // "music-store": localStorage.getItem("music-store"),
      };
      const result = await window.api.store.export(rendererData);
      if (result && result.success) {
        window.$message.success(`Settings exported successfully: ${result.path}`);
      } else {
        const errorMsg = result?.error === "cancelled" ? "Export canceled" : "Failed to export settings";
        if (result?.error !== "cancelled") {
          window.$message.error(errorMsg);
        }
      }
    } catch {
      window.$message.error("Error while exporting settings");
    }
  };

  const importSettings = async () => {
    window.$dialog.warning({
      title: "Import settings",
      content: () =>
        h("div", null, [
          h(
            NAlert,
            { type: "warning", showIcon: true, style: { marginBottom: "12px" } },
            {
              default: () =>
                "Importing settings will overwrite all current configurations (including theme, shortcuts, audio effects, etc.) and restart the app.",
            },
          ),
          h("div", null, "Continue?"),
        ]),
      positiveText: "Confirm",
      negativeText: "Cancel",
      onPositiveClick: async () => {
        try {
          const result = await window.api.store.import();
          if (result && result.success) {
            const data = result.data;
            let restoredCount = 0;
            if (data.renderer) {
              const storesToRestore = [
                "setting-store",
                "shortcut-store",
                // "status-store",
                // "music-store",
              ];

              storesToRestore.forEach((key) => {
                if (data.renderer[key]) {
                  localStorage.setItem(key, data.renderer[key]);
                  restoredCount++;
                }
              });
            }

            if (restoredCount > 0 || data.electron) {
              window.$message.success("Settings imported successfully, restarting soon");
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            } else {
              window.$message.warning("No recoverable settings data found");
            }
          } else {
            if (result?.error !== "cancelled") {
              window.$message.error("Failed to import settings: " + (result?.error || "Unknown error"));
            }
          }
        } catch (error) {
          window.$message.error("Error while importing settings");
          console.error(error);
        }
      },
    });
  };

  // --- Reset Logic (from other.ts) ---
  const resetSetting = () => {
    window.$dialog.warning({
      title: "Warning",
      content: "This action will reset all settings. Continue?",
      positiveText: "Confirm",
      negativeText: "Cancel",
      onPositiveClick: () => {
        settingStore.$reset();
        if (isElectron) window.electron.ipcRenderer.send("reset-setting");
        window.$message.success("Settings reset completed");
      },
    });
  };

  const clearAllData = () => {
    window.$dialog.warning({
      title: "High-risk operation",
      content: "This action will reset all settings, clear all data, and log you out. Continue?",
      positiveText: "Confirm",
      negativeText: "Cancel",
      onPositiveClick: async () => {
        window.localStorage.clear();
        window.sessionStorage.clear();
        await dataStore.deleteDB();
        if (isElectron) window.electron.ipcRenderer.send("reset-setting");
        window.$message.loading("Data cleared. The app will hot reload shortly", {
          duration: 3000,
          onAfterLeave: () => window.location.reload(),
        });
      },
    });
  };

  return {
    groups: [
      {
        title: "System behavior",
        show: isElectron,
        items: [
          {
            key: "useOnlineService",
            label: "Online services",
            type: "switch",
            description: "Whether to enable online services",
            value: computed({
              get: () => useOnlineService.value,
              set: (v) => handleModeChange(v),
            }),
          },
          {
            key: "closeAppMethod",
            label: "When closing the app",
            type: "select",
            description: "Choose how the app closes",
            disabled: computed(() => settingStore.showCloseAppTip),
            options: [
              { label: "Minimize to tray", value: "hide" },
              { label: "Exit directly", value: "close" },
            ],
            value: computed({
              get: () => settingStore.closeAppMethod,
              set: (v) => (settingStore.closeAppMethod = v),
            }),
          },
          {
            key: "showCloseAppTip",
            label: "Always remind before closing",
            type: "switch",
            value: computed({
              get: () => settingStore.showCloseAppTip,
              set: (v) => (settingStore.showCloseAppTip = v),
            }),
          },
          {
            key: "showTaskbarProgress",
            label: "Show playback progress on taskbar",
            type: "switch",
            description: "Whether to show song progress on the taskbar",
            value: computed({
              get: () => settingStore.showTaskbarProgress,
              set: (v) => {
                settingStore.showTaskbarProgress = v;
                closeTaskbarProgress(v);
              },
            }),
          },
          {
            key: "orpheusProtocol",
            label: "Launch this app via Orpheus protocol",
            type: "switch",
            description:
              "This protocol is usually used by the official web client to launch the official desktop client. Enabling it may prevent launching the official client",
            value: computed({
              get: () => settingStore.registryProtocol.orpheus,
              set: (v) => {
                settingStore.registryProtocol.orpheus = v;
                handleOrpheusChange(v);
              },
            }),
          },
          {
            key: "checkUpdateOnStart",
            label: "Check updates automatically",
            type: "switch",
            description: "Automatically check for updates at startup",
            value: computed({
              get: () => settingStore.checkUpdateOnStart,
              set: (v) => (settingStore.checkUpdateOnStart = v),
            }),
          },
          {
            key: "updateChannel",
            label: "Update channel",
            type: "select",
            description: "Switch update channel (nightly has newer features but may be unstable)",
            options: [
              { label: "Stable", value: "stable" },
              { label: "Nightly", value: "nightly" },
            ],
            value: computed({
              get: () => updateChannel.value,
              set: async (v) => {
                updateChannel.value = v;
                // 同步设置
                if (isElectron) {
                  await window.api.store.set("updateChannel", v);
                  // 切换后立即检查更新
                  statusStore.updateCheck = true;
                  window.electron.ipcRenderer.send("check-update", true);
                }
              },
            }),
          },
        ],
      },
      {
        title: "Search settings",
        items: [
          {
            key: "showSearchHistory",
            label: "Show search history",
            description: "Whether to show search history in the default search panel",
            type: "switch",
            value: computed({
              get: () => settingStore.showSearchHistory,
              set: (v) => (settingStore.showSearchHistory = v),
            }),
          },
          {
            key: "showHotSearch",
            label: "Show trending searches",
            type: "switch",
            show: computed(() => settingStore.useOnlineService),
            description: "Whether to show trending search list in the default search panel",
            value: computed({
              get: () => settingStore.showHotSearch,
              set: (v) => (settingStore.showHotSearch = v),
            }),
          },
          {
            key: "enableSearchKeyword",
            label: "Search keyword suggestions",
            type: "switch",
            show: computed(() => settingStore.useOnlineService),
            description: "Replace default idle search panel content with keyword suggestions",
            value: computed({
              get: () => settingStore.enableSearchKeyword,
              set: (v) => (settingStore.enableSearchKeyword = v),
            }),
          },
          {
            key: "searchInputBehavior",
            label: "Search box behavior",
            type: "select",
            description: "Customize search box behavior",
            options: [
              { label: "Keep keyword", value: "normal" },
              { label: "Clear on blur", value: "clear" },
              { label: "Sync keyword", value: "sync" },
            ],
            value: computed({
              get: () => settingStore.searchInputBehavior,
              set: (v) => (settingStore.searchInputBehavior = v),
            }),
          },
          {
            key: "hideBracketedContent",
            label: "Hide bracketed text and aliases",
            type: "switch",
            description: "Hide bracketed text and aliases in song and album names",
            value: computed({
              get: () => settingStore.hideBracketedContent,
              set: (v) => (settingStore.hideBracketedContent = v),
            }),
          },
          {
            key: "configExcludeComment",
            label: "Comment exclusion rules",
            type: "button",
            description: "Configure exclusion rules for comments (keywords or regex)",
            buttonLabel: "Configure",
            action: openExcludeComment,
          },
        ],
      },
      {
        title: "Other settings",
        items: [
          {
            key: "shareUrlFormat",
            label: "Share link format",
            type: "select",
            description: "Customize generated share link format",
            options: [
              { label: "Web", value: "web" },
              { label: "Mobile", value: "mobile" },
            ],
            value: computed({
              get: () => settingStore.shareUrlFormat,
              set: (v) => (settingStore.shareUrlFormat = v),
            }),
          },
        ],
      },
      {
        title: "Backup and restore",
        tags: [{ text: "Beta", type: "warning" }],
        show: isElectron,
        items: [
          {
            key: "exportSettings",
            label: "Export settings",
            type: "button",
            description: "Export all current settings to a JSON file",
            buttonLabel: "Export settings",
            action: exportSettings,
            componentProps: { type: "primary" },
          },
          {
            key: "importSettings",
            label: "Import settings",
            type: "button",
            description: "Restore settings from a JSON file (auto restarts after import)",
            buttonLabel: "Import settings",
            action: importSettings,
            componentProps: { type: "primary" },
          },
        ],
      },
      {
        title: "Reset",
        items: [
          {
            key: "resetSetting",
            label: "Reset all settings",
            type: "button",
            description: "Reset all settings to defaults",
            buttonLabel: "Reset settings",
            action: resetSetting,
            componentProps: { type: "warning" },
          },
          {
            key: "clearAllData",
            label: "Clear all data",
            type: "button",
            description: "Reset all settings and clear all data",
            buttonLabel: "Clear all",
            action: clearAllData,
            componentProps: { type: "error" },
          },
        ],
      },
    ],
  };
};
