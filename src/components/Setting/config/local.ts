import { useSettingStore, useStatusStore } from "@/stores";
import { useCacheManager } from "@/core/resource/CacheManager";
import { formatFileSize } from "@/utils/helper";
import { songLevelData, getSongLevelsData, AI_AUDIO_LEVELS } from "@/utils/meta";
import { SettingConfig } from "@/types/settings";
import { openLocalMusicDirectoryModal } from "@/utils/modal";
import { pick } from "lodash-es";
import LocalLyricDirectories from "../components/LocalLyricDirectories.vue";
import CacheSizeLimit from "../components/CacheSizeLimit.vue";

export const useLocalSettings = (): SettingConfig => {
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const cacheManager = useCacheManager();

  // --- 缓存逻辑 ---
  const cacheSizeDisplay = ref<string>("--");
  const cachePath = ref<string>("");

  // 统计全部缓存目录占用大小
  const loadCacheSize = async () => {
    const res = await cacheManager.getSize();
    if (res.success && res.data !== undefined) {
      cacheSizeDisplay.value = formatFileSize(res.data);
    } else {
      cacheSizeDisplay.value = "--";
    }
  };

  // 获取缓存目录
  const loadCachePath = async () => {
    try {
      const path = await window.api.store.get("cachePath");
      cachePath.value = path || "";
    } catch (error) {
      console.error("Failed to read cache path:", error);
    }
  };

  // 初始加载
  const onActivate = () => {
    loadCacheSize();
    loadCachePath();
  };

  // 更改缓存目录
  const changeCachePath = async () => {
    const path = await window.electron.ipcRenderer.invoke("choose-path");
    if (path) {
      cachePath.value = path;
      await window.api.store.set("cachePath", path);
    }
  };

  // 确认更改缓存目录
  const confirmChangeCachePath = () => {
    window.$dialog.warning({
      title: "Change cache directory",
      content:
        "Changing the cache directory will not automatically move existing cache files. It is recommended to clear cache before switching. Continue?",
      positiveText: "Confirm",
      negativeText: "Cancel",
      onPositiveClick: () => {
        return changeCachePath();
      },
    });
  };

  // 清空所有缓存目录
  const clearCache = async () => {
    const res = await cacheManager.clearAll();
    await loadCacheSize();
    if (!res.success) {
      window.$message.error("Failed to clear cache: " + (res.message || "Unknown error"));
    } else {
      window.$message.success("Cache cleared");
    }
  };

  // 确认清空缓存
  const confirmClearCache = () => {
    window.$dialog.warning({
      title: "Clear cache",
      content:
        "This will delete all cached music, lyrics, and local data. This action cannot be undone. Continue?",
      positiveText: "Clear cache",
      negativeText: "Cancel",
      onPositiveClick: () => {
        return clearCache();
      },
    });
  };

  // --- 下载逻辑 ---

  // 繁体变体标签
  const variantMap: Record<string, string> = {
    s2t: "Traditional Chinese (standard)",
    s2tw: "Taiwan Traditional",
    s2hk: "Hong Kong Traditional",
    s2twp: "Taiwan Traditional (with phrases)",
  };

  const traditionalVariantLabel = computed(() => {
    return variantMap[settingStore.traditionalChineseVariant] || "Traditional Chinese";
  });

  // 默认下载音质选项
  const downloadQualityOptions = computed(() => {
    const levels = pick(songLevelData, ["l", "m", "h", "sq", "hr", "je", "sk", "db", "jm"]);
    let allData = getSongLevelsData(levels);

    if (settingStore.disableAiAudio) {
      allData = allData.filter((item) => {
        if (item.level === "dolby") return true;
        return !AI_AUDIO_LEVELS.includes(item.level);
      });
    }

    return allData.map((item) => ({
      label: item.name,
      value: item.value,
    }));
  });

  const fileNameFormatOptions = [
    { label: "Song title", value: "title" },
    { label: "Artist - Song title", value: "artist-title" },
    { label: "Song title - Artist", value: "title-artist" },
  ];

  const folderStrategyOptions = [
    { label: "No folder split", value: "none" },
    { label: "Split by artist", value: "artist" },
    { label: "Split by artist \\ album", value: "artist-album" },
  ];

  // 模拟播放下载开关
  const handlePlaybackDownloadChange = (value: boolean) => {
    if (value) {
      window.$dialog.warning({
        title: "Enable notice",
        content:
          "Playback-based downloading may cause abnormal lyric embedding for some quality levels, and it is not fully tested. Enable anyway?",
        positiveText: "Enable",
        negativeText: "Cancel",
        onPositiveClick: () => {
          settingStore.usePlaybackForDownload = true;
        },
      });
    } else {
      settingStore.usePlaybackForDownload = false;
    }
  };

  // 解锁接口下载开关
  const handleUnlockDownloadChange = (value: boolean) => {
    if (value) {
      window.$dialog.warning({
        title: "Enable notice",
        content: "Enabling this feature may reduce quality or produce results different from the original. Enable anyway?",
        positiveText: "Enable",
        negativeText: "Cancel",
        onPositiveClick: () => {
          settingStore.useUnlockForDownload = true;
        },
      });
    } else {
      settingStore.useUnlockForDownload = false;
    }
  };

  // 歌词编码更改
  const handleLyricEncodingChange = (value: "utf-8" | "gbk" | "utf-16" | "iso-8859-1") => {
    if (value === settingStore.downloadLyricEncoding) return;
    window.$dialog.warning({
      title: "Encoding change notice",
      content:
        "Please make sure your target player supports this encoding. Changing encoding may cause garbled text. Confirm change?",
      positiveText: "Confirm",
      negativeText: "Cancel",
      onPositiveClick: () => {
        settingStore.downloadLyricEncoding = value;
      },
    });
  };

  // 更改下载目录
  const chooseDownloadPath = async () => {
    const path = await window.electron.ipcRenderer.invoke("choose-path");
    if (path) settingStore.downloadPath = path;
  };

  return {
    onActivate,
    groups: [
      {
        title: "Local music",
        items: [
          {
            key: "showLocalCover",
            label: "Show local song covers",
            type: "switch",
            description: "Do not enable when library is very large; it may hurt performance",
            value: computed({
              get: () => settingStore.showLocalCover,
              set: (v) => (settingStore.showLocalCover = v),
            }),
          },
          {
            key: "localFolderDisplayMode",
            label: "Local folder display mode",
            type: "select",
            description: "Choose how folders are displayed on the local music page",
            options: [
              { label: "Tab mode", value: "tab" },
              { label: "Dropdown filter mode", value: "dropdown" },
            ],
            value: computed({
              get: () => settingStore.localFolderDisplayMode,
              set: (v) => (settingStore.localFolderDisplayMode = v),
            }),
          },
          {
            key: "showDefaultLocalPath",
            label: "Show default local music directory",
            type: "switch",
            value: computed({
              get: () => settingStore.showDefaultLocalPath,
              set: (v) => (settingStore.showDefaultLocalPath = v),
            }),
          },
          {
            key: "localFilesPath",
            label: "Local music directories",
            type: "button",
            buttonLabel: "Manage directories",
            description: "Add or remove local music directories with real-time sync",
            action: openLocalMusicDirectoryModal,
          },
          {
            key: "localLyricPath",
            label: "Use local lyrics over online lyrics",
            type: "custom",
            noWrapper: true,
            component: markRaw(LocalLyricDirectories),
          },
        ],
      },
      {
        title: "Cache settings",
        items: [
          {
            key: "cacheEnabled",
            label: "Enable cache",
            type: "switch",
            description: "Caching improves loading speed but uses more disk space",
            value: computed({
              get: () => settingStore.cacheEnabled,
              set: (v) => (settingStore.cacheEnabled = v),
            }),
          },
          {
            key: "songCacheEnabled",
            label: "Cache songs",
            type: "switch",
            description: "Cache song audio; disabling can save cache space",
            value: computed({
              get: () => settingStore.songCacheEnabled,
              set: (v) => (settingStore.songCacheEnabled = v),
            }),
            condition: () => settingStore.cacheEnabled,
          },
          {
            key: "cacheLimit",
            label: "Cache size limit",
            type: "custom",
            description: "Oldest cache is cleaned when limit is reached; decimal allowed, minimum 2GB",
            component: markRaw(CacheSizeLimit),
            condition: () => settingStore.cacheEnabled,
            noWrapper: true,
          },
          {
            key: "cachePath",
            label: "Cache directory",
            type: "button",
            description: computed(() => cachePath.value || "Default cache directory will be used when unset"),
            buttonLabel: "Change",
            action: confirmChangeCachePath,
            condition: () => settingStore.cacheEnabled,
          },
          {
            key: "clearCache",
            label: "Cache usage and cleanup",
            type: "button",
            description: () => `Current cache usage: ${cacheSizeDisplay.value}`,
            buttonLabel: "Clear cache",
            action: confirmClearCache,
            componentProps: { type: "error" },
          },
        ],
      },
      {
        title: "Download settings",
        show: computed(() => statusStore.isDeveloperMode),
        items: [
          {
            key: "downloadPath",
            label: "Default download directory",
            type: "button",
            description: computed(() => settingStore.downloadPath || "Downloads are unavailable until this is set"),
            buttonLabel: "Change",
            action: chooseDownloadPath,
            extraButton: {
              label: "Clear selection",
              type: "primary",
              secondary: true,
              strong: true,
              action: () => (settingStore.downloadPath = ""),
              show: computed(() => !!settingStore.downloadPath),
            },
          },
          {
            key: "enableDownloadHttp2",
            label: "Enable HTTP/2 download",
            type: "switch",
            tags: [{ text: "Beta", type: "warning" }],
            description: "Download using HTTP/2 protocol",
            value: computed({
              get: () => settingStore.enableDownloadHttp2,
              set: (v) => (settingStore.enableDownloadHttp2 = v),
            }),
          },
          {
            key: "downloadSongLevel",
            label: "Default download quality",
            type: "select",
            description: "Default quality to use; available quality depends on account permissions and song resources",
            options: downloadQualityOptions,
            value: computed({
              get: () => settingStore.downloadSongLevel,
              set: (v) => (settingStore.downloadSongLevel = v),
            }),
          },
          {
            key: "downloadThreadCount",
            label: "Download threads",
            type: "slider",
            description: "Multithreading can improve speed. Default is 8, recommended range is 4-16",
            min: 1,
            max: 32,
            step: 1,
            value: computed({
              get: () => settingStore.downloadThreadCount,
              set: (v) => (settingStore.downloadThreadCount = v),
            }),
          },
          {
            key: "downloadMeta",
            label: "Download song metadata",
            type: "switch",
            description: "Attach metadata such as cover and lyrics for downloaded songs",
            value: computed({
              get: () => settingStore.downloadMeta,
              set: (v) => (settingStore.downloadMeta = v),
            }),
          },
          {
            key: "downloadCover",
            label: "Download cover as well",
            type: "switch",
            description: "Download cover together with songs",
            disabled: computed(() => !settingStore.downloadMeta),
            value: computed({
              get: () => settingStore.downloadCover,
              set: (v) => (settingStore.downloadCover = v),
            }),
          },
          {
            key: "downloadLyric",
            label: "Download lyrics as well",
            type: "switch",
            description: "Download lyrics together with songs",
            disabled: computed(() => !settingStore.downloadMeta),
            value: computed({
              get: () => settingStore.downloadLyric,
              set: (v) => (settingStore.downloadLyric = v),
            }),
          },
          {
            key: "downloadLyricTranslation",
            label: "Download translated lyrics",
            type: "switch",
            description: "Include translations when downloading lyrics",
            disabled: computed(() => !settingStore.downloadMeta || !settingStore.downloadLyric),
            value: computed({
              get: () => settingStore.downloadLyricTranslation,
              set: (v) => (settingStore.downloadLyricTranslation = v),
            }),
          },
          {
            key: "downloadLyricRomaji",
            label: "Download romaji lyrics",
            type: "switch",
            description: "Include transliteration (romaji) when downloading lyrics",
            disabled: computed(() => !settingStore.downloadMeta || !settingStore.downloadLyric),
            value: computed({
              get: () => settingStore.downloadLyricRomaji,
              set: (v) => (settingStore.downloadLyricRomaji = v),
            }),
          },
          {
            key: "fileNameFormat",
            label: "Music file naming format",
            type: "select",
            description: "Choose naming format for downloaded files; including artist info is recommended",
            options: fileNameFormatOptions,
            value: computed({
              get: () => settingStore.fileNameFormat,
              set: (v) => (settingStore.fileNameFormat = v),
            }),
          },
          {
            key: "folderStrategy",
            label: "Smart file organization",
            type: "select",
            description: "Automatically organize into subfolders by artist or artist+album",
            options: folderStrategyOptions,
            value: computed({
              get: () => settingStore.folderStrategy,
              set: (v) => (settingStore.folderStrategy = v),
            }),
          },
          {
            key: "usePlaybackForDownload",
            label: "Playback-based download",
            type: "switch",
            tags: [{ text: "Beta", type: "warning" }],
            description: "Use playback interface for downloading, which may solve some download failures",
            value: computed({
              get: () => settingStore.usePlaybackForDownload,
              set: (v) => handlePlaybackDownloadChange(v),
            }),
          },
          {
            key: "useUnlockForDownload",
            label: "Use unlock service for downloads",
            type: "switch",
            tags: [{ text: "Beta", type: "warning" }],
            description: "Use configured unlock services to get download links (higher priority than default)",
            value: computed({
              get: () => settingStore.useUnlockForDownload,
              set: (v) => handleUnlockDownloadChange(v),
            }),
          },
          {
            key: "downloadMakeYrc",
            label: "Save word-level lyric file when downloading",
            type: "switch",
            tags: [{ text: "Beta", type: "warning" }],
            description: "Save independent YRC/TTML word-level lyric files when possible (source file still embeds LRC)",
            disabled: computed(() => !settingStore.downloadMeta || !settingStore.downloadLyric),
            value: computed({
              get: () => settingStore.downloadMakeYrc,
              set: (v) => (settingStore.downloadMakeYrc = v),
            }),
          },
          {
            key: "downloadSaveAsAss",
            label: "Save as ASS file when downloading",
            type: "switch",
            description: "Generate ASS subtitle file for third-party player support (source file still embeds LRC)",
            disabled: computed(() => !settingStore.downloadMeta || !settingStore.downloadLyric),
            value: computed({
              get: () => settingStore.downloadSaveAsAss,
              set: (v) => (settingStore.downloadSaveAsAss = v),
            }),
          },
          {
            key: "downloadLyricToTraditional",
            label: "Convert downloaded lyrics to Traditional Chinese",
            type: "switch",
            description: () =>
              h("div", {
                innerHTML:
                  "Downloaded lyric files will be converted to Traditional Chinese (including LRC, YRC, TTML)<br />Using variant from lyric settings: " +
                  traditionalVariantLabel.value,
              }),
            disabled: computed(() => !settingStore.downloadMeta || !settingStore.downloadLyric),
            value: computed({
              get: () => settingStore.downloadLyricToTraditional,
              set: (v) => (settingStore.downloadLyricToTraditional = v),
            }),
          },
          {
            key: "downloadLyricEncoding",
            label: "Downloaded lyric file encoding",
            type: "select",
            description: "Some car players or older players may only support GBK encoding",
            options: [
              { label: "UTF-8", value: "utf-8" },
              { label: "GBK", value: "gbk" },
              { label: "UTF-16", value: "utf-16" },
              { label: "ISO-8859-1", value: "iso-8859-1" },
            ],
            value: computed({
              get: () => settingStore.downloadLyricEncoding,
              set: (v) => handleLyricEncodingChange(v),
            }),
          },
          {
            key: "saveMetaFile",
            label: "Keep metadata files",
            type: "switch",
            description: "Whether to keep metadata files in the download directory",
            disabled: computed(() => !settingStore.downloadMeta),
            value: computed({
              get: () => settingStore.saveMetaFile,
              set: (v) => (settingStore.saveMetaFile = v),
            }),
          },
        ],
      },
    ],
  };
};
