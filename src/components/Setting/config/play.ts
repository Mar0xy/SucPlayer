import type { VNodeChild } from "vue";
import { useSettingStore } from "@/stores";
import { usePlayerController } from "@/core/player/PlayerController";
import { isElectron, checkIsolationSupport } from "@/utils/env";
import { renderOption } from "@/utils/helper";
import { SettingConfig } from "@/types/settings";
import { AI_AUDIO_LEVELS } from "@/utils/meta";
import { openSongUnlockManager } from "@/utils/modal";
import { NTooltip, SelectOption } from "naive-ui";
import { uniqBy } from "lodash-es";

import { computed, ref, h, watch } from "vue";

export const usePlaySettings = (): SettingConfig => {
  const settingStore = useSettingStore();
  const player = usePlayerController();

  // 音频引擎数据
  const audioEngineData = {
    element: {
      label: "Web Audio",
      value: "element",
      tip: "Browser-native playback engine. Stable and lightweight, but does not support some audio formats",
    },
    ffmpeg: {
      label: "FFmpeg",
      value: "ffmpeg",
      tip: "FFmpeg playback engine supports more formats, but lacks some features such as playback speed control",
    },
    mpv: {
      label: "MPV",
      value: "mpv",
      tip: "MPV playback engine supports more formats and high sample rates with native system audio output, but does not support equalizer and spectrum",
    },
  };

  // 引擎提示文案
  const engineTip = computed(() => {
    if (settingStore.playbackEngine === "mpv") {
      return audioEngineData.mpv?.tip;
    }
    return audioEngineData[settingStore.audioEngine as keyof typeof audioEngineData]?.tip;
  });

  // 音频引擎选项渲染函数 (处理禁用状态的 Tooltip)
  const renderAudioEngineOption = ({
    node,
    option,
  }: {
    node: VNodeChild;
    option: SelectOption;
  }) => {
    if (option.value === "ffmpeg" && option.disabled) {
      return h(
        NTooltip,
        { placement: "left", keepAliveOnHover: false },
        {
          trigger: () => h("div", { style: "cursor: not-allowed;" }, [node]),
          default: () => "FFmpeg is not supported in the current environment",
        },
      );
    }
    if (option.value === "mpv" && option.disabled) {
      return h(
        NTooltip,
        { placement: "left", keepAliveOnHover: false },
        {
          trigger: () => h("div", { style: "cursor: not-allowed;" }, [node]),
          default: () => "MPV engine is not supported in the current environment",
        },
      );
    }
    return node;
  };

  // 组合下拉选项
  const audioEngineOptions = [
    { label: "Web Audio (default)", value: "element" },
    {
      label: "FFmpeg",
      value: "ffmpeg",
      disabled: !checkIsolationSupport(),
    },
    {
      label: "MPV",
      value: "mpv",
      disabled: !isElectron,
    },
  ];

  // 当前选中的引擎值
  const audioEngineSelectValue = computed<"element" | "ffmpeg" | "mpv">(() =>
    settingStore.playbackEngine === "mpv" ? "mpv" : settingStore.audioEngine,
  );

  // 处理引擎切换
  const handleAudioEngineSelect = async (value: "element" | "ffmpeg" | "mpv") => {
    if (value === "ffmpeg" && !checkIsolationSupport()) {
      window.$message.warning("FFmpeg engine is not supported in the current environment, reverted to default");
      return;
    }

    const targetPlaybackEngine = value === "mpv" ? "mpv" : "web-audio";
    // 如果是切回 web-audio，且 value 为 element/ffmpeg，则更新 audioEngine
    const targetAudioEngine = value !== "mpv" ? value : settingStore.audioEngine;

    // 检查是否有变化
    if (
      targetPlaybackEngine === settingStore.playbackEngine &&
      targetAudioEngine === settingStore.audioEngine
    ) {
      return;
    }

    // 如果切换到 MPV 引擎，先检查是否已安装
    if (targetPlaybackEngine === "mpv") {
      if (!isElectron) {
        window.$message.warning("MPV engine is not supported in the current environment, reverted to default");
        return;
      }
      try {
        const result = await window.electron.ipcRenderer.invoke("mpv-check-installed");
        if (!result.installed) {
          window.$message.error("MPV was not detected. Please install MPV player first", { duration: 3000 });
          return;
        }
      } catch (e) {
        console.error("Check MPV installed failed", e);
        return;
      }
    }

    window.$dialog.warning({
      title: "Change playback engine",
      content: "Changing playback engine requires app restart for settings to take effect. Restart now?",
      positiveText: "Restart",
      negativeText: "Cancel",
      onPositiveClick: () => {
        // 切换引擎类型时重置为目标引擎的默认设备，避免跨引擎设备 ID 不兼容
        if (targetPlaybackEngine !== settingStore.playbackEngine) {
          settingStore.playDevice = targetPlaybackEngine === "mpv" ? "auto" : "default";
        }
        settingStore.playbackEngine = targetPlaybackEngine;
        settingStore.audioEngine = targetAudioEngine;
        if (isElectron) {
          window.electron.ipcRenderer.send("win-restart");
        } else {
          window.location.reload();
        }
      },
    });
  };

  const outputDevices = ref<SelectOption[]>([]);

  // 获取全部输出设备
  const getOutputDevices = async () => {
    if (!isElectron) return; // 简单处理：非 Electron 环境暂不复杂处理

    // MPV 引擎：从主进程查询 mpv 设备列表
    if (settingStore.playbackEngine === "mpv") {
      try {
        const result = await window.electron.ipcRenderer.invoke("mpv-get-audio-devices");
        if (result.success && result.devices) {
          outputDevices.value = result.devices.map(
            (device: { id: string; description: string }) => ({
              label: device.description,
              value: device.id,
            }),
          );

          // 验证已保存的设备是否在当前设备列表中
          const deviceIds = result.devices.map((d: { id: string }) => d.id);
          const savedValid =
            settingStore.playDevice &&
            settingStore.playDevice !== "default" &&
            deviceIds.includes(settingStore.playDevice);

          if (!savedValid) {
            const current = await window.electron.ipcRenderer.invoke(
              "mpv-get-current-audio-device",
            );
            if (current.success) {
              settingStore.playDevice = current.deviceId;
            } else {
              settingStore.playDevice = "auto";
            }
          }
        }
      } catch (e) {
        console.error("Failed to get MPV audio devices:", e);
        if (!settingStore.playDevice) {
          settingStore.playDevice = "auto";
        }
      }
      return;
    }

    // WebAudio 引擎：使用浏览器设备列表
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const devices = uniqBy(
        allDevices.filter((device) => device.kind === "audiooutput" && device.deviceId),
        "groupId",
      );
      const outputData = devices.filter((device) => device.kind === "audiooutput");
      outputDevices.value = outputData.map((device) => ({
        label: device.label,
        value: device.deviceId,
      }));

      // 验证已保存的设备是否在当前设备列表中
      if (
        settingStore.playDevice &&
        !outputData.some((d) => d.deviceId === settingStore.playDevice)
      ) {
        settingStore.playDevice = "default";
      }
    } catch (e) {
      console.error("Failed to get WebAudio devices", e);
    }
  };

  // 切换输出设备
  const playDeviceChange = async (deviceId: string) => {
    // 找到对应的 label 用于显示
    const option = outputDevices.value.find((d) => d.value === deviceId);
    const label = option?.label || deviceId;

    if (settingStore.playbackEngine === "mpv") {
      try {
        const result = await window.electron.ipcRenderer.invoke("mpv-set-audio-device", deviceId);
        if (result.success) {
          settingStore.playDevice = deviceId;
          window.$message.success(`Output device switched to ${label}`);
        } else {
          window.$message.error(`Failed to switch output device: ${result.error}`);
        }
      } catch (e) {
        window.$message.error(`Failed to switch output device: ${e}`);
      }
      return;
    }

    try {
      await player.toggleOutputDevice(deviceId);
      settingStore.playDevice = deviceId;
      window.$message.success(`Output device switched to ${label}`);
    } catch (e) {
      window.$message.error(`Failed to switch output device: ${e}`);
    }
  };
  // 监听播放引擎变化以刷新设备列表
  watch(
    () => settingStore.playbackEngine,
    () => {
      if (isElectron) getOutputDevices();
    },
  );

  const onActivate = () => {
    if (isElectron) getOutputDevices();
  };

  // 音质数据
  const songLevelData: Record<string, { label: string; tip: string; value: string }> = {
    standard: { label: "Standard", tip: "Standard quality 128kbps", value: "standard" },
    higher: { label: "Higher", tip: "Higher quality 328kbps", value: "higher" },
    exhigh: { label: "High (HQ)", tip: "Near-CD detail experience, up to 320kbps", value: "exhigh" },
    lossless: { label: "Lossless (SQ)", tip: "Hi-Fi lossless quality, up to 48kHz/16bit", value: "lossless" },
    hires: {
      label: "High-Resolution Lossless (Hi-Res)",
      tip: "Richer and clearer high-resolution audio, up to 192kHz/24bit",
      value: "hires",
    },
    jyeffect: {
      label: "Spatial Audio",
      tip: "Enhanced listening experience, 96kHz/24bit",
      value: "jyeffect",
    },
    jymaster: { label: "Master", tip: "Restore audio details, 192kHz/24bit", value: "jymaster" },
    sky: {
      label: "Surround Audio",
      tip: "Immersive surround sound, up to 5.1 channels",
      value: "sky",
    },
    vivid: {
      label: "Audio Vivid",
      tip: "Highly immersive 3D spatial audio, up to 7.1.4 channels",
      value: "vivid",
    },
    dolby: {
      label: "Dolby Atmos",
      tip: "Dolby Atmos music with immersive listening experience",
      value: "dolby",
    },
  };

  // 动态计算音质选项
  const songLevelOptions = computed(() => {
    const options = Object.values(songLevelData);

    if (settingStore.disableAiAudio) {
      return options.filter((option) => {
        if (option.value === "dolby") return true;
        // 正确的类型转换或检查
        return !AI_AUDIO_LEVELS.includes(option.value);
      });
    }
    return options;
  });

  // 监听 Fuck AI Mode，重置不合法音质
  watch(
    () => settingStore.disableAiAudio,
    (val) => {
      if (!val) return;
      // 正确的类型检查
      if (AI_AUDIO_LEVELS.includes(settingStore.songLevel)) {
        settingStore.songLevel = "hires";
      }
    },
  );

  return {
    onActivate,
    groups: [
      {
        title: "Playback control",
        items: [
          {
            key: "autoPlay",
            label: "Auto play",
            type: "switch",
            description: "Whether to start playback automatically when launching the app",
            show: isElectron,
            value: computed({
              get: () => settingStore.autoPlay,
              set: (v) => (settingStore.autoPlay = v),
            }),
            disabled: !isElectron,
          },
          {
            key: "useNextPrefetch",
            label: "Prefetch next song",
            type: "switch",
            description: "Preload next song URL in advance to improve switch speed",
            value: computed({
              get: () => settingStore.useNextPrefetch,
              set: (v) => (settingStore.useNextPrefetch = v),
            }),
          },
          {
            key: "memoryLastSeek",
            label: "Remember last playback position",
            type: "switch",
            description: "Restore last playback position when app starts",
            value: computed({
              get: () => settingStore.memoryLastSeek,
              set: (v) => (settingStore.memoryLastSeek = v),
            }),
          },
          {
            key: "preventSleep",
            label: "Prevent system sleep",
            type: "switch",
            description: "Prevent system sleep on playback page",
            value: computed({
              get: () => settingStore.preventSleep,
              set: (v) => (settingStore.preventSleep = v),
            }),
          },
          {
            key: "progressTooltipShow",
            label: "Show progress hover info",
            type: "switch",
            value: computed({
              get: () => settingStore.progressTooltipShow,
              set: (v) => (settingStore.progressTooltipShow = v),
            }),
            children: [
              {
                key: "progressLyricShow",
                label: "Show lyrics on progress hover",
                type: "switch",
                value: computed({
                  get: () => settingStore.progressLyricShow,
                  set: (v) => (settingStore.progressLyricShow = v),
                }),
              },
            ],
          },
          {
            key: "progressAdjustLyric",
            label: "Snap to nearest lyric on seek",
            type: "switch",
            description: "Start from the nearest lyric line when adjusting progress",
            value: computed({
              get: () => settingStore.progressAdjustLyric,
              set: (v) => (settingStore.progressAdjustLyric = v),
            }),
          },
          {
            key: "songVolumeFade",
            label: "Fade in/out",
            type: "switch",
            value: computed({
              get: () => settingStore.songVolumeFade,
              set: (v) => (settingStore.songVolumeFade = v),
            }),
            children: [
              {
                key: "songVolumeFadeTime",
                label: "Fade duration",
                type: "input-number",
                description: "Unit: ms, min 200, max 2000",
                min: 200,
                max: 2000,
                suffix: "ms",
                value: computed({
                  get: () => settingStore.songVolumeFadeTime,
                  set: (v) => (settingStore.songVolumeFadeTime = v),
                }),
              },
            ],
          },
          {
            key: "enableAutomix",
            label: "Enable automix",
            type: "switch",
            tags: [{ text: "Beta", type: "warning" }],
            description: computed(() =>
              settingStore.playbackEngine === "web-audio"
                ? "Enable automatic mixing"
                : "Automix is only available with Web Audio engine",
            ),
            value: computed({
              get: () => settingStore.enableAutomix,
              set: (v) => {
                if (v) {
                  window.$dialog.warning({
                    title: "Enable automix (Beta)",
                    content:
                      "Compatibility issues may occur. This feature is in early testing. Please report issues if encountered. Effect may vary by song.",
                    positiveText: "Enable",
                    negativeText: "Cancel",
                    onPositiveClick: () => {
                      settingStore.enableAutomix = true;
                    },
                  });
                } else {
                  settingStore.enableAutomix = v;
                }
              },
            }),
            disabled: computed(() => settingStore.playbackEngine !== "web-audio"),
            children: [
              {
                key: "automixMaxAnalyzeTime",
                label: "Max analysis time",
                type: "input-number",
                description: "Unit: seconds. Longer is more accurate but slower (recommended 60s)",
                min: 5,
                max: 300,
                suffix: "s",
                value: computed({
                  get: () => settingStore.automixMaxAnalyzeTime,
                  set: (v) => (settingStore.automixMaxAnalyzeTime = v),
                }),
              },
            ],
          },
        ],
      },
      {
        title: "Audio settings",
        items: [
          {
            key: "songLevel",
            label: "Online song quality",
            type: "select",
            description: () => songLevelData[settingStore.songLevel]?.tip,
            options: songLevelOptions,
            componentProps: {
              renderOption,
            },
            value: computed({
              get: () => settingStore.songLevel,
              set: (v) => (settingStore.songLevel = v),
            }),
          },
          {
            key: "disableAiAudio",
            label: "Fuck AI Mode",
            type: "switch",
            description:
              "Hide some AI-enhanced quality options (such as Master and Surround) while keeping Dolby Atmos",
            value: computed({
              get: () => settingStore.disableAiAudio,
              set: (v) => (settingStore.disableAiAudio = v),
            }),
          },
          {
            key: "disableDjMode",
            label: "Fuck DJ Mode",
            type: "switch",
            description: "Automatically skip songs with DJ/short-video/car/remix-style keywords in title",
            value: computed({
              get: () => settingStore.disableDjMode,
              set: (v) => (settingStore.disableDjMode = v),
            }),
          },
          {
            key: "uncensorMaskedProfanity",
            label: "Fuck *** Mode",
            type: "switch",
            description: "Restore masked profanity like f**k back to original words in lyrics",
            value: computed({
              get: () => settingStore.uncensorMaskedProfanity,
              set: (v) => (settingStore.uncensorMaskedProfanity = v),
            }),
          },
          {
            key: "audioEngine",
            label: "Audio processing engine",
            type: "select",
            tags: [{ text: "Beta", type: "warning" }],
            description: () =>
              h("div", [
                h("span", null, engineTip.value),
                h("br"),
                h(NTooltip, null, {
                  default: () => "Restart app to take effect",
                  trigger: () =>
                    h("span", { style: "color: var(--n-warning-color);" }, "Restart app to take effect"),
                }),
              ]),
            options: audioEngineOptions,
            componentProps: {
              renderOption: renderAudioEngineOption,
            },
            value: computed({
              get: () => audioEngineSelectValue.value,
              set: (v) => handleAudioEngineSelect(v),
            }),
          },
          {
            key: "audioLatencyHint",
            label: "Web Audio latency strategy",
            type: "select",
            tags: [{ text: "Beta", type: "warning" }],
            description:
              "Adjust Web Audio latency strategy (restart required).<br>" +
              "Low latency mode (interactive) has lower latency but may be less stable;<br>" +
              "High performance mode (playback) has higher latency but more stable playback.<br>" +
              "Audio output delay has been compensated for playback mode to reduce lyric/audio desync.",
            options: [
              { label: "Low latency mode (interactive)", value: "interactive" },
              { label: "High performance mode (playback)", value: "playback" },
            ],
            value: computed({
              get: () => settingStore.audioLatencyHint,
              set: (v) => {
                window.$dialog.warning({
                  title: "Change latency strategy",
                  content: "This change requires app restart to take effect. Restart now?",
                  positiveText: "Restart",
                  negativeText: "Cancel",
                  onPositiveClick: () => {
                    settingStore.audioLatencyHint = v;
                    if (isElectron) {
                      window.electron.ipcRenderer.send("win-restart");
                    } else {
                      window.location.reload();
                    }
                  },
                });
              },
            }),
            show: computed(
              () =>
                settingStore.playbackEngine === "web-audio" &&
                settingStore.audioEngine === "element",
            ),
          },
          {
            key: "audioDelayCompensation",
            label: "Audio-lyric sync compensation",
            type: "input-number",
            description:
              "Manually compensate audio/lyric timing delay.<br>Positive values make lyrics faster, negative values slower.<br>Useful for devices where auto delay detection is inaccurate.",
            tags: [{ text: "Beta", type: "warning" }],
            show: computed(() => settingStore.audioLatencyHint === "playback"),
            min: -1000,
            max: 1000,
            step: 10,
            suffix: "ms",
            value: computed({
              get: () => settingStore.audioDelayCompensation,
              set: (v) => (settingStore.audioDelayCompensation = v ?? 0),
            }),
            defaultValue: 0,
          },
          {
            key: "playSongDemo",
            label: "Play preview clips",
            type: "switch",
            description: "Allow preview playback when not a premium user",
            show: !isElectron,
            value: computed({
              get: () => settingStore.playSongDemo,
              set: (v) => (settingStore.playSongDemo = v),
            }),
          },
          {
            key: "playDevice",
            label: "Audio output device",
            type: "select",
            show: isElectron,
            description: (() => {
              return () => {
                if (settingStore.audioEngine === "ffmpeg") return "FFmpeg engine does not support switching output device";
                if (settingStore.playbackEngine === "mpv")
                  return 'If unsure, select "Autoselect" or "Default". A wrong selection may cause no sound or a locked state. Re-select "Autoselect" and switch song to recover';
                return "Reopen settings after adding or removing audio devices";
              };
            })(),
            options: outputDevices,
            componentProps: {
              renderOption,
            },
            disabled: computed(
              () => settingStore.playbackEngine !== "mpv" && settingStore.audioEngine === "ffmpeg",
            ),
            value: computed({
              get: () => settingStore.playDevice,
              set: (v) => playDeviceChange(v),
            }),
          },
          {
            key: "enableReplayGain",
            label: "Volume normalization",
            type: "switch",
            description:
              "Balance loudness across different audio content (requires replayGain data in local song tags)",
            value: computed({
              get: () => settingStore.enableReplayGain,
              set: (v) => (settingStore.enableReplayGain = v),
            }),
            children: [
              {
                key: "replayGainMode",
                label: "Normalization mode",
                type: "select",
                description: "Choose the basis for volume normalization",
                options: [
                  { label: "Track", value: "track" },
                  { label: "Album", value: "album" },
                ],
                value: computed({
                  get: () => settingStore.replayGainMode,
                  set: (v) => (settingStore.replayGainMode = v),
                }),
              },
            ],
          },
        ],
      },
      {
        title: "Song unlock",
        tags: [{ text: "Beta", type: "warning" }],
        show: isElectron,
        items: [
          {
            key: "useSongUnlock",
            label: "Enable song unlock",
            type: "switch",
            description: "Replace source when normal playback fails; result may differ from the original",
            value: computed({
              get: () => settingStore.useSongUnlock,
              set: (v) => (settingStore.useSongUnlock = v),
            }),
          },
          {
            key: "songUnlockConfig",
            label: "Source configuration",
            type: "button",
            description: "Configure source order and enable status for song unlock",
            buttonLabel: "Configure",
            action: openSongUnlockManager,
            disabled: computed(() => !settingStore.useSongUnlock),
          },
        ],
      },
    ],
  };
};
