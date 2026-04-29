import { useShortcutStore } from "@/stores";
import { SettingItem, SettingConfig } from "@/types/settings";
import { computed, markRaw } from "vue";
import ShortcutRecorder from "../components/ShortcutRecorder.vue";

export const useKeyboardSettings = (): SettingConfig => {
  const shortcutStore = useShortcutStore();

  const updateGlobalOpen = async (val: boolean) => {
    if (val) {
      await shortcutStore.registerAllShortcuts();
    } else {
      window.electron.ipcRenderer.send("unregister-all-shortcut");
      // 清除状态
      for (const key in shortcutStore.shortcutList) {
        shortcutStore.shortcutList[key as keyof typeof shortcutStore.shortcutList].isRegistered =
          false;
      }
    }
    shortcutStore.globalOpen = val;
  };

  const createShortcutItems = (filterKeys: string[], allowGlobal: boolean): SettingItem[] => {
    return Object.entries(shortcutStore.shortcutList)
      .filter(([key]) => filterKeys.includes(key))
      .map(([key, item]) => ({
        key,
        label: item.name,
        type: "custom",
        component: markRaw(ShortcutRecorder),
        componentProps: { shortcutKey: key, allowGlobal },
      }));
  };

  // 页面快捷键的 Key
  const pageShortcutKeys = ["openPlayer", "openPlayList", "closePlayer"];
  // 全局快捷键的 Key
  const globalShortcutKeys = Object.keys(shortcutStore.shortcutList).filter(
    (key) => !pageShortcutKeys.includes(key),
  );

  return {
    groups: [
      {
        title: "Global shortcuts",
        items: [
          {
            key: "globalOpen",
            label: "Enable global shortcuts",
            type: "switch",
            description: "May conflict with other applications, enable with caution",
            value: computed({
              get: () => shortcutStore.globalOpen,
              set: (v) => updateGlobalOpen(v),
            }),
          },
        ],
      },
      {
        title: "Global shortcut mappings",
        items: createShortcutItems(globalShortcutKeys, true),
      },
      {
        title: "Restore global defaults",
        items: [
          {
            key: "resetShortcut",
            label: "Restore default global shortcuts",
            type: "button",
            buttonLabel: "Restore defaults",
            action: () => {
              window.$dialog.warning({
                title: "Reset shortcuts",
                content: "Reset current shortcut configuration?",
                positiveText: "Reset",
                negativeText: "Cancel",
                onPositiveClick: () => {
                  shortcutStore.$reset();
                  window.$message.success("Shortcuts reset successfully");
                },
              });
            },
          },
        ],
      },
      {
        title: "In-page shortcuts",
        items: createShortcutItems(pageShortcutKeys, false),
      },
    ],
  };
};
