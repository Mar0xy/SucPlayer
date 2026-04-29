import { useSettingStore, useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";
import {
  openFontManager,
  openCustomCode,
  openThemeConfig,
  openSidebarHideManager,
  openHomePageSectionManager,
  openPlaylistPageManager,
  openFullscreenPlayerManager,
  openCoverManager,
  openContextMenuManager,
} from "@/utils/modal";
import { SettingConfig } from "@/types/settings";
import { computed, ref } from "vue";
import { isLogin } from "@/utils/auth";

export const useAppearanceSettings = (): SettingConfig => {
  const settingStore = useSettingStore();
  const statusStore = useStatusStore();

  // --- Window / Borderless Logic (from general.ts) ---
  const useBorderless = ref(true);

  const handleBorderlessChange = async (val: boolean) => {
    if (!isElectron) return;
    const windowConfig = await window.api.store.get("window");
    window.api.store.set("window", {
      ...windowConfig,
      useBorderless: val,
    });
    window.$message.warning("Settings saved. Takes effect after restart");
  };

  const onActivate = async () => {
    if (isElectron) {
      const windowConfig = await window.api.store.get("window");
      useBorderless.value = windowConfig?.useBorderless ?? true;
    }
  };

  return {
    onActivate,
    groups: [
      {
        title: "Theme and style",
        items: [
          {
            key: "themeMode",
            label: "Theme mode",
            type: "select",
            description: "Adjust global light/dark mode",
            options: [
              { label: "Follow system", value: "auto" },
              { label: "Light mode", value: "light" },
              { label: "Dark mode", value: "dark" },
            ],
            value: computed({
              get: () => settingStore.themeMode,
              set: (v) => (settingStore.themeMode = v),
            }),
            forceIf: {
              condition: () => statusStore.isCustomBackground,
              forcedValue: "auto",
              forcedDescription: "Disable custom background before adjusting",
            },
          },
          {
            key: "themeConfig",
            label: "Theme configuration",
            type: "button",
            description: "Change theme colors or custom image",
            buttonLabel: "Configure",
            action: openThemeConfig,
          },
          {
            key: "useBorderless",
            label: "Borderless window mode",
            type: "switch",
            show: isElectron,
            description: "Enable borderless window mode. Disable to use system frame (restart required)",
            value: computed({
              get: () => useBorderless.value,
              set: (v) => {
                useBorderless.value = v;
                handleBorderlessChange(v);
              },
            }),
          },
          {
            key: "fontConfig",
            label: "Global fonts",
            type: "button",
            description: "Configure fonts for global UI and lyric areas",
            buttonLabel: "Configure",
            action: openFontManager,
          },
          {
            key: "customCode",
            label: "Custom code injection",
            type: "button",
            description: "Inject custom CSS and JavaScript",
            buttonLabel: "Configure",
            action: openCustomCode,
            show: computed(() => statusStore.isDeveloperMode),
          },
        ],
      },
      {
        title: "Layout",
        items: [
          {
            key: "sidebarHide",
            label: "Sidebar manager",
            type: "button",
            description: "Configure which menu items appear in the sidebar",
            buttonLabel: "Configure",
            action: openSidebarHideManager,
          },
          {
            key: "homePageSection",
            label: "Home sections",
            type: "button",
            description: "Reorder or hide sections on the home page",
            buttonLabel: "Configure",
            action: openHomePageSectionManager,
          },
          {
            key: "playlistPageElements",
            label: "Playlist page",
            type: "button",
            description: "Customize tags, owner, time, and description display on playlist page",
            buttonLabel: "Configure",
            action: openPlaylistPageManager,
          },
          {
            key: "fullscreenPlayer",
            label: "Fullscreen player",
            type: "button",
            description: "Customize visible elements in fullscreen player (like, download, comments, etc.)",
            buttonLabel: "Configure",
            action: openFullscreenPlayerManager,
          },
          {
            key: "contextMenu",
            label: "Context menu",
            type: "button",
            description: "Customize options shown in song context menu",
            buttonLabel: "Configure",
            action: openContextMenuManager,
          },
          {
            key: "menuShowCover",
            label: "Show playlist covers in sidebar",
            type: "switch",
            description: "Whether to show playlist covers in sidebar (if available)",
            value: computed({
              get: () => settingStore.menuShowCover,
              set: (v) => (settingStore.menuShowCover = v),
            }),
          },
          {
            key: "showPlaylistCount",
            label: "Show playlist count",
            type: "switch",
            description: "Show song count on the bottom-right playlist button",
            value: computed({
              get: () => settingStore.showPlaylistCount,
              set: (v) => (settingStore.showPlaylistCount = v),
            }),
          },
          {
            key: "routeAnimation",
            label: "Page transition animation",
            type: "select",
            description: "Choose animation effect for page transitions",
            options: [
              { label: "None", value: "none" },
              { label: "Fade", value: "fade" },
              { label: "Zoom", value: "zoom" },
              { label: "Slide", value: "slide" },
              { label: "Lift", value: "up" },
              { label: "Flow", value: "flow" },
              { label: "Left-right mask", value: "mask-left" },
              { label: "Top-bottom mask", value: "mask-top" },
            ],
            value: computed({
              get: () => settingStore.routeAnimation,
              set: (v) => (settingStore.routeAnimation = v),
            }),
          },
        ],
      },
      {
        title: "Player appearance",
        items: [
          {
            key: "playerType",
            label: "Player style",
            type: "select",
            description: "Main player style",
            options: [
              { label: "Cover mode", value: "cover" },
              { label: "Record mode", value: "record" },
              { label: "Fullscreen cover", value: "fullscreen" },
            ],
            value: computed({
              get: () => settingStore.playerType,
              set: (v) => (settingStore.playerType = v),
            }),
            condition: () => true,
            children: computed(() => {
              const type = settingStore.playerType;
              if (type === "cover" || type === "record") {
                return [
                  {
                    key: "playerStyleRatio",
                    label: "Cover / lyric ratio",
                    type: "slider",
                    description: "Adjust width ratio between cover and lyrics in fullscreen player",
                    min: 30,
                    max: 70,
                    step: 1,
                    marks: { 50: "Default" },
                    formatTooltip: (v) => `${v}%`,
                    value: computed({
                      get: () => settingStore.playerStyleRatio,
                      set: (v) => (settingStore.playerStyleRatio = v),
                    }),
                  },
                ];
              }
              if (type === "fullscreen") {
                return [
                  {
                    key: "playerFullscreenGradient",
                    label: "Cover gradient position",
                    type: "slider",
                    description: "Adjust gradient transition position on the right side of fullscreen cover",
                    min: 0,
                    max: 100,
                    step: 1,
                    marks: { 15: "Default" },
                    formatTooltip: (v) => `${v}%`,
                    value: computed({
                      get: () => settingStore.playerFullscreenGradient,
                      set: (v) => (settingStore.playerFullscreenGradient = v),
                    }),
                  },
                ];
              }
              return [];
            }),
          },
          {
            key: "playerBackgroundType",
            label: "Player background style",
            type: "select",
            description: "Switch player background type",
            options: [
              { label: "Fluid effect", value: "animation" },
              { label: "Blurred cover", value: "blur" },
              { label: "Cover primary color", value: "color" },
            ],
            value: computed({
              get: () => settingStore.playerBackgroundType,
              set: (v) => (settingStore.playerBackgroundType = v),
            }),
            condition: () => settingStore.playerBackgroundType === "animation",
            children: [
              {
                key: "playerBackgroundFps",
                label: "Background animation FPS",
                type: "input-number",
                description: "Unit: fps, min 24, max 240",
                min: 24,
                max: 256,
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundFps,
                  set: (v) => (settingStore.playerBackgroundFps = v),
                }),
              },
              {
                key: "playerBackgroundFlowSpeed",
                label: "Background flow speed",
                type: "input-number",
                description: "Unit: multiplier, min 0.1, max 10",
                min: 0.1,
                max: 10,
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundFlowSpeed,
                  set: (v) => (settingStore.playerBackgroundFlowSpeed = v),
                }),
              },
              {
                key: "playerBackgroundRenderScale",
                label: "Background render scale",
                type: "input-number",
                description:
                  "Set render scale, default 0.5. Increasing this value (for example 1.0 or 1.5) can reduce edge aliasing and improve visuals, but increases GPU load",
                min: 0.1,
                max: 3,
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundRenderScale,
                  set: (v) => (settingStore.playerBackgroundRenderScale = v),
                }),
              },
              {
                key: "playerBackgroundPause",
                label: "Pause background animation when paused",
                type: "switch",
                description: "Whether to pause background animation when playback is paused",
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundPause,
                  set: (v) => (settingStore.playerBackgroundPause = v),
                }),
              },
              {
                key: "playerBackgroundLowFreqVolume",
                label: "Background pulse effect",
                type: "switch",
                description: "Make fluid background pulse with low-frequency beats",
                show: () => settingStore.playerBackgroundType === "animation",
                value: computed({
                  get: () => settingStore.playerBackgroundLowFreqVolume,
                  set: (v) => (settingStore.playerBackgroundLowFreqVolume = v),
                }),
              },
            ],
          },
          {
            key: "playerExpandAnimation",
            label: "Player expand animation",
            type: "select",
            description: "Choose animation when expanding player",
            options: [
              { label: "Lift", value: "up" },
              { label: "Flow", value: "flow" },
            ],
            value: computed({
              get: () => settingStore.playerExpandAnimation,
              set: (v) => (settingStore.playerExpandAnimation = v),
            }),
          },
          {
            key: "playerFollowCoverColor",
            label: "Player accent follows cover",
            type: "switch",
            description: "Whether player accent color follows cover main color (applies on next song)",
            value: computed({
              get: () => settingStore.playerFollowCoverColor,
              set: (v) => (settingStore.playerFollowCoverColor = v),
            }),
          },
          {
            key: "dynamicCover",
            label: "Dynamic cover",
            type: "switch",
            description: "Show dynamic covers for some songs, only available in cover mode",
            value: computed({
              get: () => settingStore.dynamicCover,
              set: (v) => (settingStore.dynamicCover = v),
            }),
            forceIf: {
              condition: () => isLogin() !== 1,
              forcedValue: false,
              forcedTitle: "Please log in first",
            },
          },
          {
            key: "showPlayerComment",
            label: "Show comments",
            type: "switch",
            description: "Whether to show comment button in fullscreen player",
            value: computed({
              get: () => settingStore.fullscreenPlayerElements.comments,
              set: (v) => (settingStore.fullscreenPlayerElements.comments = v),
            }),
            condition: () => settingStore.fullscreenPlayerElements.comments,
            children: [
              {
                key: "commentDisplayMode",
                label: "Comment display mode",
                type: "select",
                description: "Choose how comments are shown in fullscreen player",
                options: [
                  { label: "Fullscreen", value: "fullscreen" },
                  { label: "Left half", value: "left" },
                  { label: "Right half", value: "right" },
                ],
                value: computed({
                  get: () => settingStore.commentDisplayMode,
                  set: (v) => (settingStore.commentDisplayMode = v),
                }),
              },
            ],
          },
          {
            key: "showSpectrums",
            label: "Audio spectrum",
            type: "switch",
            show: isElectron,
            description: "Enabling spectrum may impact performance or memory usage. Disable if issues occur",
            value: computed({
              get: () => settingStore.showSpectrums,
              set: (v) => (settingStore.showSpectrums = v),
            }),
            forceIf: {
              condition: () => settingStore.playbackEngine === "mpv",
              forcedValue: false,
              forcedDescription: "MPV engine does not currently support audio spectrum",
            },
          },
        ],
      },
      {
        title: "UI element visibility",
        items: [
          {
            key: "coverManager",
            label: "Cover visibility manager",
            type: "button",
            description: "Configure cover visibility across pages (playlist square, charts, player, etc.)",
            buttonLabel: "Configure",
            action: openCoverManager,
          },
          {
            key: "autoHidePlayerMeta",
            label: "Auto-hide player controls",
            type: "switch",
            description: "Auto-hide controls when mouse is idle or leaves the player",
            value: computed({
              get: () => settingStore.autoHidePlayerMeta,
              set: (v) => (settingStore.autoHidePlayerMeta = v),
            }),
          },
          {
            key: "showPlayMeta",
            label: "Show playback status info",
            type: "switch",
            description: "Show status info for current song and lyrics",
            value: computed({
              get: () => settingStore.showPlayMeta,
              set: (v) => (settingStore.showPlayMeta = v),
            }),
          },
          {
            key: "barLyricShow",
            label: "Show lyrics in bottom bar",
            type: "switch",
            description: "Replace artist info with lyrics during playback",
            value: computed({
              get: () => settingStore.barLyricShow,
              set: (v) => (settingStore.barLyricShow = v),
            }),
          },
          {
            key: "showSongQuality",
            label: "Show song quality",
            type: "switch",
            description: "Whether to show quality in song list",
            value: computed({
              get: () => settingStore.showSongQuality,
              set: (v) => (settingStore.showSongQuality = v),
            }),
          },
          {
            key: "showPlayerQuality",
            label: "Show quality switch button in player",
            type: "switch",
            description: "Whether to show quality switch button in player",
            value: computed({
              get: () => settingStore.showPlayerQuality,
              set: (v) => (settingStore.showPlayerQuality = v),
            }),
          },
          {
            key: "countDownShow",
            label: "Show intro countdown",
            type: "switch",
            description: "Some songs may display incorrect intro countdown",
            value: computed({
              get: () => settingStore.countDownShow,
              set: (v) => (settingStore.countDownShow = v),
            }),
          },
          {
            key: "timeFormat",
            label: "Time display format",
            type: "select",
            description: "How time is shown at bottom-right bar and player footer (click time to switch quickly)",
            options: [
              { label: "Current / Total", value: "current-total" },
              { label: "Remaining / Total", value: "remaining-total" },
              { label: "Current / Remaining", value: "current-remaining" },
            ],
            value: computed({
              get: () => settingStore.timeFormat,
              set: (v) => (settingStore.timeFormat = v),
            }),
          },
        ],
      },
      {
        title: "Song list display",
        items: [
          {
            key: "showSongAlbum",
            label: "Show album",
            type: "switch",
            description: "Show album column in song list",
            value: computed({
              get: () => settingStore.showSongAlbum,
              set: (v) => (settingStore.showSongAlbum = v),
            }),
          },
          {
            key: "showSongArtist",
            label: "Show artist",
            type: "switch",
            description: "Show artist information in song list",
            value: computed({
              get: () => settingStore.showSongArtist,
              set: (v) => (settingStore.showSongArtist = v),
            }),
          },
          {
            key: "showSongDuration",
            label: "Show duration",
            type: "switch",
            description: "Show duration column in song list",
            value: computed({
              get: () => settingStore.showSongDuration,
              set: (v) => (settingStore.showSongDuration = v),
            }),
          },
          {
            key: "showSongOperations",
            label: "Show actions",
            type: "switch",
            description: "Show action column in song list (favorite, etc.)",
            value: computed({
              get: () => settingStore.showSongOperations,
              set: (v) => (settingStore.showSongOperations = v),
            }),
          },
          {
            key: "showSongQuality",
            label: "Show song quality",
            type: "switch",
            description: "Whether to show quality in song list",
            value: computed({
              get: () => settingStore.showSongQuality,
              set: (v) => (settingStore.showSongQuality = v),
            }),
          },
          {
            key: "showSongPrivilegeTag",
            label: "Show privilege tags",
            type: "switch",
            description: "Whether to show privilege tags such as VIP and EP",
            value: computed({
              get: () => settingStore.showSongPrivilegeTag,
              set: (v) => (settingStore.showSongPrivilegeTag = v),
            }),
          },
          {
            key: "showSongExplicitTag",
            label: "Show explicit tag",
            type: "switch",
            description: "Whether to show explicit tag (🅴)",
            value: computed({
              get: () => settingStore.showSongExplicitTag,
              set: (v) => (settingStore.showSongExplicitTag = v),
            }),
          },
          {
            key: "showSongOriginalTag",
            label: "Show original/cover tags",
            type: "switch",
            description: "Whether to show original/cover labels for songs",
            value: computed({
              get: () => settingStore.showSongOriginalTag,
              set: (v) => (settingStore.showSongOriginalTag = v),
            }),
          },
          {
            key: "hideBracketedContent",
            label: "Hide bracketed text",
            type: "switch",
            description: "Hide bracketed text such as (Live), (Instrumental), etc.",
            value: computed({
              get: () => settingStore.hideBracketedContent,
              set: (v) => (settingStore.hideBracketedContent = v),
            }),
          },
        ],
      },
    ],
  };
};
