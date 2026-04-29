import defaultDesktopLyricConfig from "@/assets/data/lyricConfig";
import { useLyricManager } from "@/core/player/LyricManager";
import { usePlayerController } from "@/core/player/PlayerController";
import { useSettingStore, useStatusStore } from "@/stores";
import type { LyricConfig } from "@/types/desktop-lyric";
import type { SettingConfig } from "@/types/settings";
import { DEFAULT_TASKBAR_CONFIG, TASKBAR_IPC_CHANNELS, type TaskbarConfig } from "@/types/shared";
import { isElectron, isWin, isMac } from "@/utils/env";
import { descMultiline } from "@/utils/format";
import { openAMLLServer, openExcludeLyric, openFontManager } from "@/utils/modal";
import { cloneDeep, isEqual } from "lodash-es";
import { toRef } from "vue";
import LyricPreview from "../components/LyricPreview.vue";

export const useLyricSettings = (): SettingConfig => {
  const player = usePlayerController();
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const lyricManager = useLyricManager();

  // 桌面歌词配置
  const desktopLyricConfig = reactive<LyricConfig>({ ...defaultDesktopLyricConfig });
  // 任务栏歌词配置
  const taskbarLyricConfig = reactive<TaskbarConfig>({ ...DEFAULT_TASKBAR_CONFIG });

  const getDesktopLyricConfig = async () => {
    if (!isElectron) return;
    const config = await window.electron.ipcRenderer.invoke("desktop-lyric:get-option");
    if (config) Object.assign(desktopLyricConfig, config);

    // 监听更新
    window.electron.ipcRenderer.on("desktop-lyric:update-option", (_, config) => {
      if (config && !isEqual(desktopLyricConfig, config)) {
        Object.assign(desktopLyricConfig, config);
      }
    });
  };

  const saveDesktopLyricConfig = () => {
    try {
      if (!isElectron) return;
      window.electron.ipcRenderer.send(
        "desktop-lyric:set-option",
        cloneDeep(desktopLyricConfig),
        true,
      );
      window.$message.success("Desktop lyric settings saved");
    } catch (error) {
      console.error("Failed to save options:", error);
      window.$message.error("Failed to save desktop lyric settings");
      getDesktopLyricConfig();
    }
  };

  const restoreDesktopLyricConfig = () => {
    try {
      if (!isElectron) return;
      window.$dialog.warning({
        title: "Warning",
        content: "This will restore all desktop lyric settings to defaults. Continue?",
        positiveText: "Confirm",
        negativeText: "Cancel",
        onPositiveClick: () => {
          window.electron.ipcRenderer.send(
            "desktop-lyric:set-option",
            defaultDesktopLyricConfig,
            true,
          );
          window.$message.success("Desktop lyric settings restored to default");
        },
      });
    } catch (error) {
      console.error("Failed to save options:", error);
      window.$message.error("Failed to restore desktop lyric settings");
      getDesktopLyricConfig();
    }
  };

  const getTaskbarLyricConfig = async () => {
    if (!isElectron) return;
    const config = await window.electron.ipcRenderer.invoke(TASKBAR_IPC_CHANNELS.GET_OPTION);
    if (config) Object.assign(taskbarLyricConfig, config);
  };

  const saveTaskbarLyricConfig = (patch?: Partial<TaskbarConfig>) => {
    if (!isElectron) return;
    const toSave = cloneDeep(patch ? { ...taskbarLyricConfig, ...patch } : taskbarLyricConfig);
    window.electron.ipcRenderer.send(TASKBAR_IPC_CHANNELS.SET_OPTION, toSave, true);
  };

  const restoreTaskbarLyricConfig = () => {
    if (!isElectron) return;
    window.$dialog.warning({
      title: "Warning",
      content: "This will restore all taskbar lyric settings to defaults. Continue?",
      positiveText: "Confirm",
      negativeText: "Cancel",
      onPositiveClick: () => {
        Object.assign(taskbarLyricConfig, DEFAULT_TASKBAR_CONFIG);
        window.electron.ipcRenderer.send(
          TASKBAR_IPC_CHANNELS.SET_OPTION,
          DEFAULT_TASKBAR_CONFIG,
          true,
        );
        window.$message.success("Taskbar lyric settings restored to default");
      },
    });
  };

  const onActivate = async () => {
    if (isElectron) {
      getDesktopLyricConfig();
      getTaskbarLyricConfig();
      await window.api.store.set("amllDbServer", settingStore.amllDbServer);
    }
  };

  return {
    onActivate,
    groups: [
      {
        title: "Lyric settings",
        items: [
          {
            key: "lyricPreview",
            label: "Preview",
            type: "custom",
            noWrapper: true,
            component: markRaw(LyricPreview),
          },
          {
            key: "lyricFontSizeMode",
            label: "Adaptive lyric size",
            type: "switch",
            description: "Automatically scale lyric size based on window height",
            value: computed({
              get: () => settingStore.lyricFontSizeMode === "adaptive",
              set: (v) => (settingStore.lyricFontSizeMode = v ? "adaptive" : "fixed"),
            }),
          },
          {
            key: "lyricFontSize",
            label: "Lyric font size",
            type: "input-number",
            description: computed(() =>
              settingStore.lyricFontSizeMode === "adaptive"
                ? "Base size (based on 1080p height)"
                : "Unit px, min 12, max 60",
            ),
            min: 12,
            max: 60,
            suffix: "px",
            value: computed({
              get: () => settingStore.lyricFontSize,
              set: (v) => (settingStore.lyricFontSize = v || 30),
            }),
            defaultValue: 46,
          },
          {
            key: "lyricTranFontSize",
            label: "Translated lyric size",
            type: "input-number",
            description: computed(() =>
              settingStore.lyricFontSizeMode === "adaptive"
                ? "Base size (based on 1080p height)"
                : "Unit px, min 5, max 40",
            ),
            min: 5,
            max: 40,
            suffix: "px",
            value: computed({
              get: () => settingStore.lyricTranFontSize,
              set: (v) => (settingStore.lyricTranFontSize = v || 22),
            }),
            forceIf: {
              condition: () => settingStore.useAMLyrics,
              forcedValue: () => Math.max(0.5 * settingStore.lyricFontSize, 10),
              forcedTitle: "Controlled automatically by AMLL",
            },
            defaultValue: 22,
          },
          {
            key: "lyricRomaFontSize",
            label: "Romanized lyric size",
            type: "input-number",
            description: computed(() =>
              settingStore.lyricFontSizeMode === "adaptive"
                ? "Base size (based on 1080p height)"
                : "Unit px, min 5, max 40",
            ),
            min: 5,
            max: 40,
            suffix: "px",
            value: computed({
              get: () => settingStore.lyricRomaFontSize,
              set: (v) => (settingStore.lyricRomaFontSize = v || 18),
            }),
            forceIf: {
              condition: () => settingStore.useAMLyrics,
              forcedValue: () => Math.max(0.5 * settingStore.lyricFontSize, 10),
              forcedTitle: "Controlled automatically by AMLL",
            },
            defaultValue: 18,
          },
          {
            key: "fontConfig",
            label: "Lyric font settings",
            type: "button",
            description: "Configure fonts for different lyric language regions",
            buttonLabel: "Configure",
            action: openFontManager,
          },
          {
            key: "lyricFontWeight",
            label: "Lyric font weight",
            type: "input-number",
            description: "Set font weight for lyrics (some fonts may not support all weights)",
            min: 100,
            max: 900,
            step: 100,
            value: computed({
              get: () => settingStore.lyricFontWeight,
              set: (v) => (settingStore.lyricFontWeight = v),
            }),
          },
          {
            key: "lyricTransition",
            label: "Lyric transition animation",
            type: "select",
            description: "Animation effect for lyric switching in bottom player",
            options: [
              { label: "Slide", value: "slide" },
              { label: "Fade", value: "fade" },
            ],
            value: computed({
              get: () => settingStore.lyricTransition,
              set: (v) => (settingStore.lyricTransition = v),
            }),
          },
          {
            key: "lyricsPosition",
            label: "Lyric position",
            type: "select",
            description: "Default vertical lyric position",
            options: [
              { label: "Left", value: "flex-start" },
              { label: "Center", value: "center" },
              { label: "Right", value: "flex-end" },
            ],
            value: computed({
              get: () => settingStore.lyricsPosition,
              set: (v) => (settingStore.lyricsPosition = v),
            }),
            forceIf: {
              condition: () => settingStore.useAMLyrics,
              forcedValue: "flex-start",
              forcedDescription: "Default vertical lyric position; AMLL defaults to left",
            },
          },
          {
            key: "lyricHorizontalOffset",
            label: "Lyric left offset",
            type: "slider",
            description: "Adjust lyric start position in fullscreen mode",
            min: 0,
            max: 200,
            step: 1,
            marks: { 10: "Default" },
            formatTooltip: (v) => `${v}px`,
            value: computed({
              get: () => settingStore.lyricHorizontalOffset,
              set: (v) => (settingStore.lyricHorizontalOffset = v),
            }),
          },
          {
            key: "lyricAlignRight",
            label: "Right-align lyrics by default",
            type: "switch",
            description: "Swap left/right positions for duet lyrics",
            value: computed({
              get: () => settingStore.lyricAlignRight,
              set: (v) => (settingStore.lyricAlignRight = v),
            }),
          },
          {
            key: "lyricsScrollOffset",
            label: "Lyric scroll position",
            type: "slider",
            description: "Vertical position of highlighted lyric on screen",
            min: 0.1,
            max: 0.9,
            step: 0.05,
            marks: { 0.1: "Top", 0.9: "Bottom" },
            formatTooltip: (v) => `${(v * 100).toFixed(0)}%`,
            value: computed({
              get: () => settingStore.lyricsScrollOffset,
              set: (v) => (settingStore.lyricsScrollOffset = v),
            }),
          },
          {
            key: "showWordLyrics",
            label: "Show word-by-word lyrics",
            type: "switch",
            description: "Requires more performance; disable if stuttering occurs",
            value: computed({
              get: () => settingStore.showWordLyrics,
              set: (v) => (settingStore.showWordLyrics = v),
            }),
            children: [
              {
                key: "enableQQMusicLyric",
                label: "Enable QM lyrics",
                type: "switch",
                description: "Fetch word-by-word lyrics from QM via fuzzy matching (may be inaccurate)",
                show: isElectron,
                value: computed({
                  get: () => settingStore.enableQQMusicLyric,
                  set: (v) => (settingStore.enableQQMusicLyric = v),
                }),
              },
              {
                key: "localLyricQQMusicMatch",
                label: "Use QM lyrics for local songs",
                type: "switch",
                disabled: computed(() => !settingStore.enableQQMusicLyric),
                description: "Match word-by-word lyrics from QM for local songs; skip if TTML exists",
                show: isElectron,
                value: computed({
                  get: () => settingStore.localLyricQQMusicMatch,
                  set: (v) => (settingStore.localLyricQQMusicMatch = v),
                }),
              },
            ],
          },
          {
            key: "showTran",
            label: "Show translated lyrics",
            type: "switch",
            value: computed({
              get: () => settingStore.showTran,
              set: (v) => (settingStore.showTran = v),
            }),
          },
          {
            key: "showRoma",
            label: "Show romanized lyrics",
            type: "switch",
            value: computed({
              get: () => settingStore.showRoma,
              set: (v) => (settingStore.showRoma = v),
            }),
          },
          {
            key: "swapTranRoma",
            label: "Swap translation and romanization order",
            type: "switch",
            description: "When enabled, romanization appears above translation",
            value: computed({
              get: () => settingStore.swapTranRoma,
              set: (v) => (settingStore.swapTranRoma = v),
            }),
            forceIf: {
              condition: () => !settingStore.showTran || !settingStore.showRoma,
              forcedValue: false,
            },
          },
          {
            key: "lyricsBlur",
            label: "Auto blur lyrics",
            type: "switch",
            description: "Focus current line while blurring other lines",
            value: computed({
              get: () => settingStore.lyricsBlur,
              set: (v) => (settingStore.lyricsBlur = v),
            }),
          },
          {
            key: "lyricsBlendMode",
            label: "Lyric blend mode",
            type: "select",
            description: "Color blend mode for fullscreen lyric area",
            options: [
              { label: "Screen", value: "screen" },
              { label: "Plus Lighter", value: "plus-lighter" },
            ],
            value: computed({
              get: () => settingStore.lyricsBlendMode,
              set: (v) => (settingStore.lyricsBlendMode = v),
            }),
          },
          {
            key: "lyricOffsetStep",
            label: "Lyric offset adjustment step",
            type: "input-number",
            description: "Unit: milliseconds, adjustment amount per click",
            min: 10,
            max: 10000,
            step: 10,
            suffix: "ms",
            value: computed({
              get: () => settingStore.lyricOffsetStep,
              set: (v) => (settingStore.lyricOffsetStep = v || 500),
            }),
            defaultValue: 500,
          },
        ],
      },
      {
        title: "Lyric content",
        items: [
          {
            key: "lyricPriority",
            label: "Lyric source priority",
            type: "select",
            description: "Set preferred order for lyric sources",
            options: computed(() => {
              const options = [{ label: "Auto", value: "auto" }];
              if (settingStore.enableQQMusicLyric) {
                options.push({ label: "QM First", value: "qm" });
              }
              if (settingStore.enableOnlineTTMLLyric) {
                options.push({ label: "TTML First", value: "ttml" });
              }
              return options;
            }),
            value: computed({
              get: () => settingStore.lyricPriority,
              set: (v) => lyricManager.switchLyricSource(v),
            }),
          },
          {
            key: "preferTraditionalChinese",
            label: "Prefer Traditional Chinese",
            type: "switch",
            description: "Convert Simplified Chinese lyrics and translations to Traditional Chinese",
            value: computed({
              get: () => settingStore.preferTraditionalChinese,
              set: (v) => (settingStore.preferTraditionalChinese = v),
            }),
            children: [
              {
                key: "traditionalChineseVariant",
                label: "Traditional Chinese variant",
                type: "select",
                description: "Preferred Traditional Chinese variant",
                options: [
                  { label: "Traditional Chinese (standard)", value: "s2t" },
                  { label: "Taiwan Traditional", value: "s2tw" },
                  { label: "Hong Kong Traditional", value: "s2hk" },
                ],
                value: computed({
                  get: () => settingStore.traditionalChineseVariant,
                  set: (v) => (settingStore.traditionalChineseVariant = v),
                }),
              },
            ],
          },
          {
            key: "enableOnlineTTMLLyric",
            label: "Enable online TTML lyrics",
            type: "switch",
            description:
              "Fetch lyrics from AMLL TTML DB when available. TTML supports word-by-word, translation, and romanization. Takes effect on the next song",
            tags: [{ text: "Beta", type: "warning" }],
            value: computed({
              get: () => settingStore.enableOnlineTTMLLyric,
              set: (v) => (settingStore.enableOnlineTTMLLyric = v),
            }),
            children: [
              {
                key: "amllDbServer",
                label: "AMLL TTML DB URL",
                type: "button",
                description: "AMLL TTML DB URL. Ensure it is correct, otherwise lyric fetching will fail",
                buttonLabel: "Configure",
                action: openAMLLServer,
              },
            ],
          },
          {
            key: "configExcludeLyric",
            label: "Lyric exclusion rules",
            type: "button",
            description: "Configure excluded lyric lines by keywords or regex",
            buttonLabel: "Configure",
            action: openExcludeLyric,
          },
          {
            key: "replaceLyricBrackets",
            label: "Replace bracketed lyric text",
            type: "switch",
            description: "Replace bracketed text in lyrics with selected style",
            value: computed({
              get: () => settingStore.replaceLyricBrackets,
              set: (v) => (settingStore.replaceLyricBrackets = v),
            }),
            children: [
              {
                key: "bracketReplacementPreset",
                label: "Bracket replacement style",
                type: "select",
                description: "Choose bracket style after replacement",
                options: [
                  { label: "Dash ( - )", value: "dash" },
                  { label: "Hex brackets (〔 〕)", value: "angleBrackets" },
                  { label: "Corner quotes (「 」)", value: "cornerBrackets" },
                  { label: "Custom", value: "custom" },
                ],
                value: computed({
                  get: () => settingStore.bracketReplacementPreset,
                  set: (v) => (settingStore.bracketReplacementPreset = v),
                }),
                condition: () => settingStore.bracketReplacementPreset === "custom",
                children: [
                  {
                    key: "customBracketReplacement",
                    label: "Custom replacement text",
                    type: "text-input",
                    description:
                      "Enter custom replacement characters. Supports single separator (for example -) or paired symbols (for example ())",
                    value: computed({
                      get: () => settingStore.customBracketReplacement,
                      set: (v) => {
                        if (v.trim().length > 5) {
                          window.$message.warning("Custom replacement text cannot exceed 5 characters");
                          return;
                        }
                        settingStore.customBracketReplacement = v;
                      },
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        title: "Apple Music-like Lyrics",
        tags: [{ text: "Beta", type: "warning" }],
        items: [
          {
            key: "useAMLyrics",
            label: "Use Apple Music-like Lyrics",
            type: "switch",
            description: "Render lyrics with Apple Music-like Lyrics. High-performance device recommended",
            value: computed({
              get: () => settingStore.useAMLyrics,
              set: (v) => (settingStore.useAMLyrics = v),
            }),
            children: [
              {
                key: "useAMSpring",
                label: "Lyric spring effect",
                type: "switch",
                description: "Use spring physics for lyric animation. High-performance device recommended",
                value: computed({
                  get: () => settingStore.useAMSpring,
                  set: (v) => (settingStore.useAMSpring = v),
                }),
              },
              {
                key: "hidePassedLines",
                label: "Hide played lines",
                type: "switch",
                description: "Whether to hide already-played lyric lines",
                value: computed({
                  get: () => settingStore.hidePassedLines,
                  set: (v) => (settingStore.hidePassedLines = v),
                }),
              },
              {
                key: "wordFadeWidth",
                label: "Word animation fade width",
                type: "input-number",
                description: descMultiline`
                  Unit is a multiple of the main lyric font size
                  Default is 0.5 (about half-width of a full-width character)
                  Use 1 to mimic Apple Music for Android
                  Use 0.5 to mimic Apple Music for iPad
                  To almost disable fade, set a very small value such as 0.01
                `,
                min: 0.01,
                max: 1,
                step: 0.01,
                value: computed({
                  get: () => settingStore.wordFadeWidth,
                  set: (v) => (settingStore.wordFadeWidth = v),
                }),
              },
              {
                key: "showWordsRoma",
                label: "Show word-by-word romanization",
                type: "switch",
                value: computed({
                  get: () => settingStore.showWordsRoma,
                  set: (v) => (settingStore.showWordsRoma = v),
                }),
              },
            ],
          },
        ],
      },
      {
        title: "Desktop lyrics",
        tags: [{ text: "Beta", type: "warning" }],
        show: isElectron,
        items: [
          {
            key: "showDesktopLyric",
            label: "Enable desktop lyrics",
            type: "switch",
            description: "Please report issues to the developers",
            value: computed({
              get: () => statusStore.showDesktopLyric,
              set: (v) => player.setDesktopLyricShow(v),
            }),
          },
          {
            key: "desktopLyricLock",
            label: "Lock desktop lyric position",
            type: "switch",
            description: "Lock desktop lyric position to avoid accidental movement or obstruction",
            value: computed({
              get: () => desktopLyricConfig.isLock,
              set: (v) => {
                desktopLyricConfig.isLock = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricDoubleLine",
            label: "Two-line lyrics",
            type: "switch",
            description: "Enable two-line lyrics, alternating current and next line",
            value: computed({
              get: () => desktopLyricConfig.isDoubleLine,
              set: (v) => {
                desktopLyricConfig.isDoubleLine = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricLimitBounds",
            label: "Limit lyric position",
            type: "switch",
            description: "Keep desktop lyric position within current screen bounds",
            value: computed({
              get: () => desktopLyricConfig.limitBounds,
              set: (v) => {
                desktopLyricConfig.limitBounds = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricPosition",
            label: "Alignment",
            type: "select",
            description: "Desktop lyric alignment",
            options: [
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
              { label: "Split left/right", value: "both" },
            ],
            value: computed({
              get: () => desktopLyricConfig.position,
              set: (v) => {
                desktopLyricConfig.position = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricFont",
            label: "Lyric font",
            type: "button",
            description: "Change desktop lyric font",
            buttonLabel: "Configure",
            action: openFontManager,
          },
          {
            key: "desktopLyricShowWordLyrics",
            label: "Show word-by-word lyrics",
            type: "switch",
            description: "Show word-by-word effect on desktop lyrics",
            value: computed({
              get: () => desktopLyricConfig.showWordLyrics,
              set: (v) => {
                desktopLyricConfig.showWordLyrics = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricShowTran",
            label: "Show translation",
            type: "switch",
            description: "Show desktop lyric translations",
            value: computed({
              get: () => desktopLyricConfig.showTran,
              set: (v) => {
                desktopLyricConfig.showTran = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricAnimation",
            label: "Lyric transition animation",
            type: "switch",
            description: "Enable animated transitions when lyrics switch",
            value: computed({
              get: () => desktopLyricConfig.animation,
              set: (v) => {
                desktopLyricConfig.animation = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricFontWeight",
            label: "Font weight",
            type: "input-number",
            description: "Set desktop lyric font weight",
            min: 100,
            max: 900,
            step: 100,
            value: computed({
              get: () => desktopLyricConfig.fontWeight,
              set: (v) => {
                desktopLyricConfig.fontWeight = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricFontSize",
            label: "Font size",
            type: "select",
            description: "Translation and other text sizes will follow",
            options: Array.from({ length: 96 - 20 + 1 }, (_, i) => ({
              label: `${20 + i} px`,
              value: 20 + i,
            })),
            value: computed({
              get: () => desktopLyricConfig.fontSize,
              set: (v) => {
                desktopLyricConfig.fontSize = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricPlayedColor",
            label: "Played text",
            type: "color-picker",
            description: "Color for already-played desktop lyric text",
            componentProps: { showAlpha: false, modes: ["hex"] },
            value: computed({
              get: () => desktopLyricConfig.playedColor,
              set: (v) => (desktopLyricConfig.playedColor = v),
            }),
            action: saveDesktopLyricConfig,
          },
          {
            key: "desktopLyricUnplayedColor",
            label: "Unplayed text",
            type: "color-picker",
            description: "Color for unplayed desktop lyric text",
            componentProps: { showAlpha: false, modes: ["hex"] },
            value: computed({
              get: () => desktopLyricConfig.unplayedColor,
              set: (v) => (desktopLyricConfig.unplayedColor = v),
            }),
            action: saveDesktopLyricConfig,
          },
          {
            key: "desktopLyricShadowColor",
            label: "Outline color",
            type: "color-picker",
            description: "Outline color for desktop lyric text",
            componentProps: { showAlpha: true, modes: ["rgb"] },
            value: computed({
              get: () => desktopLyricConfig.shadowColor,
              set: (v) => (desktopLyricConfig.shadowColor = v),
            }),
            action: saveDesktopLyricConfig,
          },
          {
            key: "desktopLyricTextBackgroundMask",
            label: "Text background mask",
            type: "switch",
            description: "Improve text visibility on some backgrounds",
            value: computed({
              get: () => desktopLyricConfig.textBackgroundMask,
              set: (v) => {
                desktopLyricConfig.textBackgroundMask = v;
                saveDesktopLyricConfig();
              },
            }),
            children: [
              {
                key: "desktopLyricBackgroundMaskColor",
                label: "Mask color",
                type: "color-picker",
                description: "Set background mask color and opacity",
                componentProps: { showAlpha: true, modes: ["rgb", "hex"] },
                value: computed({
                  get: () => desktopLyricConfig.backgroundMaskColor,
                  set: (v) => (desktopLyricConfig.backgroundMaskColor = v),
                }),
                action: saveDesktopLyricConfig,
              },
            ],
          },
          {
            key: "desktopLyricAlwaysShowPlayInfo",
            label: "Always show playback info",
            type: "switch",
            description: "Always show current song title and artist",
            value: computed({
              get: () => desktopLyricConfig.alwaysShowPlayInfo,
              set: (v) => {
                desktopLyricConfig.alwaysShowPlayInfo = v;
                saveDesktopLyricConfig();
              },
            }),
          },
          {
            key: "desktopLyricRestore",
            label: "Restore defaults",
            type: "button",
            description: "Restore default desktop lyric settings",
            buttonLabel: "Restore",
            action: restoreDesktopLyricConfig,
          },
        ],
      },
      {
        title: isWin ? "Taskbar Lyrics" : "Floating Lyrics",
        show: isElectron,
        items: [
          {
            key: "taskbarLyricEnabled",
            label: "Enable taskbar lyrics",
            type: "switch",
            description: "Show lyrics on the taskbar when enabled",
            value: computed({
              get: () => statusStore.showTaskbarLyric,
              set: (v) => player.setTaskbarLyricShow(v ?? false),
            }),
          },
          {
            key: "taskbarLyricMode",
            label: "Display mode",
            type: "select",
            description: "Attach to taskbar or show as independent floating window",
            options: [
              { label: "Taskbar attached", value: "taskbar" },
              { label: "Standalone window", value: "floating" },
            ],
            value: computed({
              get: () => taskbarLyricConfig.mode,
              set: (v) => {
                taskbarLyricConfig.mode = v ?? "taskbar";
                saveTaskbarLyricConfig({ mode: taskbarLyricConfig.mode });
              },
            }),
          },
          {
            key: "taskbarLyricFloatingAlign",
            label: "Floating alignment",
            type: "select",
            description: "Control cover position and text alignment direction",
            show: () => taskbarLyricConfig.mode === "floating",
            options: [
              { label: "Left", value: "left" },
              { label: "Right", value: "right" },
            ],
            value: computed({
              get: () => taskbarLyricConfig.floatingAlign,
              set: (v) => {
                taskbarLyricConfig.floatingAlign = v ?? "right";
                saveTaskbarLyricConfig({ floatingAlign: taskbarLyricConfig.floatingAlign });
              },
            }),
          },
          {
            key: "taskbarLyricFloatingAlwaysOnTop",
            label: "Always on top (floating)",
            type: "switch",
            description: "Keep floating window always on top",
            show: () => taskbarLyricConfig.mode === "floating",
            value: computed({
              get: () => taskbarLyricConfig.floatingAlwaysOnTop,
              set: (v) => {
                taskbarLyricConfig.floatingAlwaysOnTop = v ?? false;
                saveTaskbarLyricConfig({
                  floatingAlwaysOnTop: taskbarLyricConfig.floatingAlwaysOnTop,
                });
              },
            }),
          },
          {
            key: "taskbarLyricFloatingAutoWidth",
            label: "Auto width (floating)",
            type: "switch",
            description: "Automatically adjust window width based on lyric content",
            show: () => taskbarLyricConfig.mode === "floating",
            value: computed({
              get: () => taskbarLyricConfig.floatingAutoWidth,
              set: (v) => {
                taskbarLyricConfig.floatingAutoWidth = v ?? true;
                saveTaskbarLyricConfig({ floatingAutoWidth: taskbarLyricConfig.floatingAutoWidth });
              },
            }),
          },
          {
            key: "taskbarLyricFloatingWidth",
            label: "Floating width",
            type: "input-number",
            description: "Set manually when auto width is disabled",
            show: () =>
              taskbarLyricConfig.mode === "floating" &&
              taskbarLyricConfig.floatingAutoWidth === false,
            min: 100,
            max: 5000,
            step: 10,
            suffix: "px",
            value: computed({
              get: () => taskbarLyricConfig.floatingWidth,
              set: (v) => {
                taskbarLyricConfig.floatingWidth = v ?? 300;
                saveTaskbarLyricConfig({ floatingWidth: taskbarLyricConfig.floatingWidth });
              },
            }),
            defaultValue: 300,
          },
          {
            key: "taskbarLyricFloatingHeight",
            label: "Window height",
            type: "input-number",
            description: "Adjust window height",
            show: () => taskbarLyricConfig.mode === "floating",
            min: 48,
            max: 100,
            step: 1,
            suffix: "px",
            value: computed({
              get: () => taskbarLyricConfig.floatingHeight,
              set: (v) => {
                taskbarLyricConfig.floatingHeight = v ?? 48;
                saveTaskbarLyricConfig({ floatingHeight: taskbarLyricConfig.floatingHeight });
              },
            }),
            defaultValue: 48,
          },
          {
            key: "taskbarLyricShowWhenPaused",
            label: "Show when paused",
            type: "switch",
            description: "Show taskbar lyrics while playback is paused",
            value: computed({
              get: () => taskbarLyricConfig.showWhenPaused,
              set: (v) => {
                taskbarLyricConfig.showWhenPaused = v ?? true;
                saveTaskbarLyricConfig({ showWhenPaused: taskbarLyricConfig.showWhenPaused });
              },
            }),
          },
          {
            key: "taskbarLyricUseThemeColor",
            label: "Follow cover color",
            type: "switch",
            description: "Taskbar lyric color follows song cover color (takes effect next song)",
            value: toRef(settingStore, "taskbarLyricUseThemeColor"),
          },
          {
            key: "taskbarLyricShowCover",
            label: "Show cover",
            type: "switch",
            description: "Show song cover in taskbar lyrics",
            value: computed({
              get: () => taskbarLyricConfig.showCover,
              set: (v) => {
                taskbarLyricConfig.showCover = v ?? true;
                saveTaskbarLyricConfig({ showCover: taskbarLyricConfig.showCover });
              },
            }),
          },
          {
            key: "taskbarLyricAutoMaxWidth",
            label: "Auto width",
            type: "switch",
            description: "Fill available taskbar space when enabled; otherwise limit by max width",
            show: () => taskbarLyricConfig.mode === "taskbar",
            value: computed({
              get: () => taskbarLyricConfig.autoMaxWidth,
              set: (v) => {
                taskbarLyricConfig.autoMaxWidth = v ?? true;
                saveTaskbarLyricConfig({ autoMaxWidth: taskbarLyricConfig.autoMaxWidth });
              },
            }),
          },
          {
            key: "taskbarLyricMaxWidth",
            label: "Maximum width",
            type: "slider",
            description: "Use available space if smaller than max width to avoid overlap",
            show: () => taskbarLyricConfig.mode === "taskbar" && !taskbarLyricConfig.autoMaxWidth,
            min: 200,
            max: 800,
            step: 20,
            value: computed({
              get: () => taskbarLyricConfig.maxWidth,
              set: (v) => {
                taskbarLyricConfig.maxWidth = v ?? 400;
              },
            }),
            action: () => {
              saveTaskbarLyricConfig({ maxWidth: taskbarLyricConfig.maxWidth });
            },
            suffix: "px",
          },
          {
            key: "taskbarLyricMargin",
            label: "Lyric margin",
            type: "input-number",
            description: "Spacing between taskbar lyrics and adjacent elements",
            min: 0,
            max: 500,
            step: 10,
            suffix: "px",
            value: computed({
              get: () => taskbarLyricConfig.margin,
              set: (v) => {
                taskbarLyricConfig.margin = v ?? 10;
                saveTaskbarLyricConfig({ margin: taskbarLyricConfig.margin });
              },
            }),
            defaultValue: 10,
          },
          {
            key: "taskbarLyricPosition",
            label: "Display position",
            type: "select",
            description: "Display position of taskbar lyrics",
            show: () => taskbarLyricConfig.mode === "taskbar",
            options: [
              { label: "Auto", value: "automatic" },
              { label: "Left", value: "left" },
              { label: "Right", value: "right" },
            ],
            value: computed({
              get: () => taskbarLyricConfig.position,
              set: (v) => {
                taskbarLyricConfig.position = v ?? "automatic";
                saveTaskbarLyricConfig({ position: taskbarLyricConfig.position });
              },
            }),
          },
          {
            key: "taskbarLyricAnimationMode",
            label: "Animation",
            type: "select",
            description: "Animation effect when taskbar lyric line changes",
            options: [
              { label: "Slide blur", value: "slide-blur" },
              { label: "Slide in from left", value: "left-sm" },
            ],
            value: computed({
              get: () => taskbarLyricConfig.animationMode,
              set: (v) => {
                taskbarLyricConfig.animationMode = v ?? "slide-blur";
                saveTaskbarLyricConfig({ animationMode: taskbarLyricConfig.animationMode });
              },
            }),
          },
          {
            key: "taskbarLyricSingleLineMode",
            label: "Single-line mode",
            type: "switch",
            description: "Show only one lyric line (hide next line)",
            value: computed({
              get: () => taskbarLyricConfig.singleLineMode,
              set: (v) => {
                taskbarLyricConfig.singleLineMode = v ?? false;
                saveTaskbarLyricConfig({ singleLineMode: taskbarLyricConfig.singleLineMode });
              },
            }),
          },
          {
            key: "taskbarLyricShowWordLyrics",
            label: "Show word-by-word lyrics",
            type: "switch",
            description: "Show word-by-word effect in taskbar lyrics",
            value: computed({
              get: () => taskbarLyricConfig.showWordLyrics,
              set: (v) => {
                taskbarLyricConfig.showWordLyrics = v ?? true;
                saveTaskbarLyricConfig({ showWordLyrics: taskbarLyricConfig.showWordLyrics });
              },
            }),
          },
          {
            key: "taskbarLyricShowTranslation",
            label: "Show translation",
            type: "switch",
            description: "Show translation line in taskbar lyrics",
            value: computed({
              get: () => taskbarLyricConfig.showTranslation,
              set: (v) => {
                taskbarLyricConfig.showTranslation = v ?? true;
                saveTaskbarLyricConfig({ showTranslation: taskbarLyricConfig.showTranslation });
              },
            }),
          },
          {
            key: "taskbarLyricFontWeight",
            label: "Font weight",
            type: "input-number",
            description: "Set taskbar lyric font weight",
            min: 100,
            max: 900,
            step: 100,
            value: computed({
              get: () => taskbarLyricConfig.fontWeight,
              set: (v) => {
                taskbarLyricConfig.fontWeight = v ?? 400;
                saveTaskbarLyricConfig({ fontWeight: taskbarLyricConfig.fontWeight });
              },
            }),
          },
          {
            key: "taskbarLyricFontScale",
            label: "Font scale",
            type: "input-number",
            description: "Scale on top of adaptive font sizing",
            min: 0.5,
            max: 2.0,
            step: 0.1,
            value: computed({
              get: () => taskbarLyricConfig.fontScale,
              set: (v) => {
                taskbarLyricConfig.fontScale = v ?? 1.0;
                saveTaskbarLyricConfig({ fontScale: taskbarLyricConfig.fontScale });
              },
            }),
            defaultValue: 1.0,
          },
          {
            key: "taskbarLyricLineHeight",
            label: "Line spacing",
            type: "input-number",
            description: "Lyric line height",
            min: 0.8,
            max: 3.0,
            step: 0.1,
            value: computed({
              get: () => taskbarLyricConfig.lineHeight,
              set: (v) => {
                const next = v ?? 1.1;
                taskbarLyricConfig.lineHeight = next;
                saveTaskbarLyricConfig({ lineHeight: next });
              },
            }),
            defaultValue: 1.1,
          },
          {
            key: "taskbarLyricMainScale",
            label: "Main lyric scale",
            type: "input-number",
            description: "Scale factor for main lyric line",
            min: 0.5,
            max: 1.5,
            step: 0.05,
            value: computed({
              get: () => taskbarLyricConfig.mainScale,
              set: (v) => {
                const next = v ?? 1.0;
                taskbarLyricConfig.mainScale = next;
                saveTaskbarLyricConfig({ mainScale: next });
              },
            }),
            defaultValue: 1.0,
          },
          {
            key: "taskbarLyricSubScale",
            label: "Sub lyric scale",
            type: "input-number",
            description: "Scale factor for secondary lyric line",
            min: 0.5,
            max: 1.0,
            step: 0.05,
            value: computed({
              get: () => taskbarLyricConfig.subScale,
              set: (v) => {
                const next = v ?? 0.8;
                taskbarLyricConfig.subScale = next;
                saveTaskbarLyricConfig({ subScale: next });
              },
            }),
            defaultValue: 0.8,
          },
          {
            key: "taskbarLyricRestore",
            label: "Restore defaults",
            type: "button",
            description: "Restore default taskbar lyric settings",
            buttonLabel: "Restore",
            action: restoreTaskbarLyricConfig,
          },
        ],
      },
      {
        title: "macOS Status Bar Lyrics",
        show: isElectron && isMac,
        items: [
          {
            key: "macStatusBarLyricEnabled",
            label: "Enable status bar lyrics",
            type: "switch",
            description: "Show lyrics in macOS status bar when enabled",
            value: computed({
              get: () => settingStore.macos.statusBarLyric.enabled,
              set: (v) => {
                settingStore.macos.statusBarLyric.enabled = v;
                window.electron.ipcRenderer.send("macos-lyric:toggle", v);
                window.$message.success(`${v ? "Enabled" : "Disabled"} status bar lyrics`);
              },
            }),
          },
        ],
      },
    ],
  };
};
