import { cloneDeep } from "lodash-es";
import { defineStore } from "pinia";

type ShortcutType = {
  name: string;
  shortcut: string;
  globalShortcut: string;
  // 是否被注册
  isRegistered?: boolean;
};

interface ShortcutStore {
  globalOpen: boolean;
  shortcutList: {
    playOrPause: ShortcutType;
    playPrev: ShortcutType;
    playNext: ShortcutType;
    seekForward: ShortcutType;
    seekBackward: ShortcutType;
    volumeUp: ShortcutType;
    volumeDown: ShortcutType;
    "toggle-desktop-lyric": ShortcutType;
    openPlayer: ShortcutType;
    openPlayList: ShortcutType;
    closePlayer: ShortcutType;
  };
}

export const useShortcutStore = defineStore("shortcut", {
  state: (): ShortcutStore => ({
    // 全局快捷键开启
    globalOpen: true,
    // 全部快捷键
    shortcutList: {
      // 播放或暂停
      playOrPause: {
        name: "Play / Pause",
        shortcut: "CmdOrCtrl+Space",
        globalShortcut: "CmdOrCtrl+Shift+Space",
      },
      // 上一曲 / 下一曲
      playPrev: {
        name: "Previous",
        shortcut: "CmdOrCtrl+ArrowLeft",
        globalShortcut: "CmdOrCtrl+Shift+Left",
      },
      playNext: {
        name: "Next",
        shortcut: "CmdOrCtrl+ArrowRight",
        globalShortcut: "CmdOrCtrl+Shift+Right",
      },
      // 快进 / 快退
      seekForward: {
        name: "Forward 5s",
        shortcut: "ArrowRight",
        globalShortcut: "CmdOrCtrl+Shift+Right",
      },
      seekBackward: {
        name: "Back 5s",
        shortcut: "ArrowLeft",
        globalShortcut: "CmdOrCtrl+Shift+Left",
      },
      // 音量加减
      volumeUp: {
        name: "Volume Up",
        shortcut: "CmdOrCtrl+ArrowUp",
        globalShortcut: "CmdOrCtrl+Shift+Up",
      },
      volumeDown: {
        name: "Volume Down",
        shortcut: "CmdOrCtrl+ArrowDown",
        globalShortcut: "CmdOrCtrl+Shift+Down",
      },
      // 桌面歌词
      "toggle-desktop-lyric": {
        name: "Desktop Lyric",
        shortcut: "CmdOrCtrl+KeyD",
        globalShortcut: "CmdOrCtrl+Shift+D",
      },
      // 打开播放界面
      openPlayer: {
        name: "Open Player",
        shortcut: "KeyP",
        globalShortcut: "",
      },
      // 打开播放列表
      openPlayList: {
        name: "Open Playlist",
        shortcut: "KeyL",
        globalShortcut: "",
      },
      // 关闭播放界面
      closePlayer: {
        name: "Close Player",
        shortcut: "Escape",
        globalShortcut: "",
      },
    },
  }),
  getters: {},
  actions: {
    // 注册全部全局快捷键
    async registerAllShortcuts() {
      if (!this.globalOpen) return;
      const result = await window.electron.ipcRenderer.invoke(
        "register-all-shortcut",
        cloneDeep(this.shortcutList),
      );
      console.log(result);
      return result;
    },
  },
  // 持久化
  persist: {
    key: "shortcut-store",
    storage: localStorage,
  },
});
