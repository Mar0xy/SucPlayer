import { useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { SettingConfig } from "@/types/settings";
import { computed, ref, h, markRaw } from "vue";
import { debounce } from "lodash-es";
import { NA } from "naive-ui";
import { disableDiscordRpc, enableDiscordRpc, updateDiscordConfig } from "@/core/player/PlayerIpc";
import { getAuthToken, getAuthUrl, getSession } from "@/api/lastfm";
import StreamingServerList from "../components/StreamingServerList.vue";

export const useNetworkSettings = (): SettingConfig => {
  const settingStore = useSettingStore();
  const testProxyLoading = ref<boolean>(false);

  // --- Network Proxy Logic (from other.ts) ---
  const proxyConfig = computed(() => ({
    protocol: settingStore.proxyProtocol,
    server: settingStore.proxyServe,
    port: settingStore.proxyPort,
  }));

  const setProxy = debounce(() => {
    if (
      settingStore.proxyProtocol === "off" ||
      !settingStore.proxyServe ||
      !settingStore.proxyPort
    ) {
      window.electron.ipcRenderer.send("remove-proxy");
      window.$message.success("Network proxy disabled successfully");
      return;
    }
    window.electron.ipcRenderer.send("set-proxy", proxyConfig.value);
    window.$message.success("Network proxy configured, please restart the app");
  }, 300);

  const testProxy = async () => {
    testProxyLoading.value = true;
    const result = await window.electron.ipcRenderer.invoke("test-proxy", proxyConfig.value);
    if (result) {
      window.$message.success("Proxy is available");
    } else {
      window.$message.error("Proxy test failed, please try again");
    }
    testProxyLoading.value = false;
  };

  // --- Discord RPC Logic (from third.ts) ---
  const handleDiscordConfigUpdate = () => {
    if (!settingStore.discordRpc.enabled) return;
    updateDiscordConfig({
      showWhenPaused: settingStore.discordRpc.showWhenPaused,
      displayMode: settingStore.discordRpc.displayMode,
    });
  };

  const handleDiscordEnabledUpdate = (val: boolean) => {
    settingStore.discordRpc.enabled = val;
    if (val) {
      enableDiscordRpc();
      handleDiscordConfigUpdate();
    } else {
      disableDiscordRpc();
    }
  };

  // --- WebSocket Logic (from third.ts) ---
  const socketPort = ref(25885);
  const socketEnabled = ref(false);
  const socketPortSaved = ref<number | null>(null);

  const initSocketConfig = async () => {
    if (!isElectron) return;
    const wsOptions = await window.api.store.get("websocket");
    const portFromStore = wsOptions?.port ?? 25885;
    socketPort.value = portFromStore;
    socketPortSaved.value = portFromStore;
    socketEnabled.value = wsOptions?.enabled ?? false;
  };

  const saveSocketConfig = async () => {
    if (!isElectron) return;
    await window.api.store.set("websocket", {
      enabled: socketEnabled.value,
      port: socketPort.value,
    });
  };

  const handleSocketEnabledUpdate = async (value: boolean) => {
    if (!isElectron) {
      socketEnabled.value = value;
      await saveSocketConfig();
      return;
    }
    if (value) {
      if (socketPort.value !== socketPortSaved.value) {
        window.$message.warning("Please test and save the port configuration before enabling WebSocket");
        return;
      }
      const result = await window.electron.ipcRenderer.invoke("socket-start");
      if (result?.success) {
        socketEnabled.value = true;
        await saveSocketConfig();
        window.$message.success("WebSocket service started");
      } else {
        window.$message.error(result?.message ?? "Failed to start WebSocket");
        socketEnabled.value = false;
      }
    } else {
      const result = await window.electron.ipcRenderer.invoke("socket-stop");
      if (result?.success) {
        socketEnabled.value = false;
        await saveSocketConfig();
        window.$message.success("WebSocket service stopped");
      } else {
        window.$message.error(result?.message ?? "Failed to stop WebSocket");
        socketEnabled.value = true;
      }
    }
  };

  const testSocketPort = async () => {
    if (!isElectron) return;
    if (!socketPort.value) {
      window.$message.error("Please enter a port number");
      return;
    }
    try {
      const result = await window.electron.ipcRenderer.invoke("socket-test-port", socketPort.value);
      if (result?.success) {
        await saveSocketConfig();
        socketPortSaved.value = socketPort.value;
        window.$message.success("WebSocket configuration saved");
      } else {
        window.$message.error(result?.message ?? "This port is unavailable, please choose another");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- Last.fm Logic (from third.ts) ---
  const lastfmAuthLoading = ref(false);

  const connectLastfm = async () => {
    try {
      lastfmAuthLoading.value = true;
      const tokenResponse = await getAuthToken();
      if (!tokenResponse.token) throw new Error("Unable to get auth token");
      const token = tokenResponse.token;
      const authUrl = getAuthUrl(token);

      if (typeof window !== "undefined") {
        const authWindow = window.open(authUrl, "_blank", "width=800,height=600");
        const checkAuth = setInterval(async () => {
          if (authWindow?.closed) {
            clearInterval(checkAuth);
            if (lastfmAuthLoading.value) {
              lastfmAuthLoading.value = false;
              window.$message.warning("Authorization canceled");
            }
            return;
          }
          try {
            const sessionResponse = await getSession(token);
            if (sessionResponse.session) {
              clearInterval(checkAuth);
              authWindow?.close();
              settingStore.lastfm.sessionKey = sessionResponse.session.key;
              settingStore.lastfm.username = sessionResponse.session.name;
              window.$message.success(`Connected to Last.fm account: ${sessionResponse.session.name}`);
              lastfmAuthLoading.value = false;
            }
          } catch {
            // 用户还未授权，继续等待
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(checkAuth);
          if (lastfmAuthLoading.value) {
            lastfmAuthLoading.value = false;
            window.$message.warning("Authorization timed out, please try again");
          }
        }, 30000);
      }
    } catch (error: any) {
      console.error("Last.fm connection failed:", error);
      window.$message.error(`Connection failed: ${error.message || "Unknown error"}`);
      lastfmAuthLoading.value = false;
    }
  };

  const disconnectLastfm = () => {
    window.$dialog.warning({
      title: "Disconnect",
      content: "Are you sure you want to disconnect from Last.fm?",
      positiveText: "Confirm",
      negativeText: "Cancel",
      onPositiveClick: () => {
        settingStore.lastfm.sessionKey = "";
        settingStore.lastfm.username = "";
        window.$message.success("Disconnected from Last.fm");
      },
    });
  };

  const onActivate = () => {
    initSocketConfig();
  };

  return {
    onActivate,
    groups: [
      {
        title: "Streaming services",
        items: [
          {
            key: "streamingEnabled",
            label: "Enable streaming",
            type: "switch",
            description: "Enable and manage streaming services such as Navidrome and Jellyfin",
            value: computed({
              get: () => settingStore.streamingEnabled,
              set: (v) => (settingStore.streamingEnabled = v),
            }),
          },
          {
            key: "serverList",
            label: "Server management",
            type: "custom",
            description: "Add and manage your streaming servers here",
            noWrapper: true,
            component: markRaw(StreamingServerList),
          },
        ],
      },
      {
        title: "Network proxy",
        items: [
          {
            key: "proxyProtocol",
            label: "Proxy protocol",
            show: isElectron,
            type: "select",
            description: "Click save or restart app to apply changes",
            options: [
              { label: "Disable proxy", value: "off" },
              { label: "HTTP proxy", value: "HTTP" },
              { label: "HTTPS proxy", value: "HTTPS" },
            ],
            value: computed({
              get: () => settingStore.proxyProtocol,
              set: (v) => (settingStore.proxyProtocol = v),
            }),
            extraButton: {
              label: "Save and apply",
              action: setProxy,
              type: "primary",
              secondary: true,
              strong: true,
            },
          },
          {
            key: "proxyServe",
            label: "Proxy server address",
            show: isElectron,
            type: "text-input",
            description: "Enter proxy server address, e.g. 127.0.0.1",
            disabled: computed(() => settingStore.proxyProtocol === "off"),
            prefix: computed(() =>
              settingStore.proxyProtocol === "off" ? "-" : settingStore.proxyProtocol,
            ),
            componentProps: {
              placeholder: "Enter proxy server address",
            },
            value: computed({
              get: () => settingStore.proxyServe,
              set: (v) => (settingStore.proxyServe = v),
            }),
          },
          {
            key: "proxyPort",
            label: "Proxy server port",
            show: isElectron,
            type: "input-number",
            description: "Enter proxy server port, e.g. 80",
            disabled: computed(() => settingStore.proxyProtocol === "off"),
            componentProps: {
              min: 1,
              max: 65535,
              showButton: false,
              placeholder: "Enter proxy server port",
            },
            value: computed({
              get: () => settingStore.proxyPort,
              set: (v) => (settingStore.proxyPort = v),
            }),
          },
          {
            key: "proxyTest",
            label: "Test proxy",
            show: isElectron,
            type: "button",
            description: "Test whether proxy configuration is reachable",
            buttonLabel: "Test proxy",
            action: testProxy,
            condition: () => settingStore.proxyProtocol !== "off",
            componentProps: computed(() => ({
              loading: testProxyLoading.value,
              type: "primary",
            })),
          },
          {
            key: "useRealIP",
            label: "Use real IP address",
            type: "switch",
            description: "May help in regions with restrictions",
            value: computed({
              get: () => settingStore.useRealIP,
              set: (v) => (settingStore.useRealIP = v),
            }),
          },
          {
            key: "realIP",
            label: "Real IP address",
            type: "text-input",
            description: "Enter a domestic IP here, leave empty for random",
            disabled: computed(() => !settingStore.useRealIP),
            prefix: "IP",
            componentProps: { placeholder: "127.0.0.1" },
            value: computed({
              get: () => settingStore.realIP,
              set: (v) => (settingStore.realIP = v),
            }),
          },
        ],
      },
      {
        title: "Third-party integrations",
        items: [
          {
            key: "smtcOpen",
            label: isElectron ? "Enable system media integration" : "Enable browser media session",
            type: "switch",
            description: isElectron
              ? "Integrate with system media controls and show media metadata with HD cover"
              : "Send media metadata to browser Media Session",
            value: computed({
              get: () => settingStore.smtcOpen,
              set: (v) => (settingStore.smtcOpen = v),
            }),
          },
          {
            key: "lastfm_enabled",
            label: "Enable Last.fm",
            type: "switch",
            description: "Record playback history to Last.fm when enabled",
            value: computed({
              get: () => settingStore.lastfm.enabled,
              set: (v) => (settingStore.lastfm.enabled = v),
            }),
            children: [
              {
                key: "lastfm_apikey",
                label: "API Key",
                type: "text-input",
                description: () =>
                  h("div", null, [
                    h("div", null, [
                      "Get it from ",
                      h(
                        NA,
                        {
                          href: "https://www.last.fm/zh/api/account/create",
                          target: "_blank",
                        },
                        { default: () => "Create Last.fm API account" },
                      ),
                      ", only the app name is required",
                    ]),
                    h("div", null, [
                      "If you already created one, check it at ",
                      h(
                        NA,
                        {
                          href: "https://www.last.fm/zh/api/accounts",
                          target: "_blank",
                        },
                        { default: () => "Last.fm API Applications" },
                      ),
                      "",
                    ]),
                  ]),
                value: computed({
                  get: () => settingStore.lastfm.apiKey,
                  set: (v) => (settingStore.lastfm.apiKey = v),
                }),
              },
              {
                key: "lastfm_secret",
                label: "API Secret",
                type: "text-input",
                description: "Shared Secret used for signature verification",
                componentProps: { type: "password", showPasswordOn: "click" },
                value: computed({
                  get: () => settingStore.lastfm.apiSecret,
                  set: (v) => (settingStore.lastfm.apiSecret = v),
                }),
              },
              {
                key: "lastfm_connect",
                label: computed(() =>
                  !settingStore.lastfm.sessionKey ? "Connect Last.fm account" : "Connected account",
                ),
                type: "button",
                description: computed(() =>
                  !settingStore.lastfm.sessionKey ? "Authorization required for first use" : settingStore.lastfm.username,
                ),
                buttonLabel: computed(() =>
                  !settingStore.lastfm.sessionKey ? "Connect account" : "Disconnect",
                ),
                action: () =>
                  !settingStore.lastfm.sessionKey ? connectLastfm() : disconnectLastfm(),
                componentProps: computed(() =>
                  !settingStore.lastfm.sessionKey
                    ? {
                        type: "primary",
                        loading: lastfmAuthLoading.value,
                        disabled: !settingStore.isLastfmConfigured,
                      }
                    : { type: "error" },
                ),
              },
              {
                key: "lastfm_scrobble",
                label: "Scrobble (play history)",
                type: "switch",
                description: "Automatically record play history to Last.fm",
                condition: () => !!settingStore.lastfm.sessionKey,
                value: computed({
                  get: () => settingStore.lastfm.scrobbleEnabled,
                  set: (v) => (settingStore.lastfm.scrobbleEnabled = v),
                }),
              },
              {
                key: "lastfm_nowplaying",
                label: "Now playing status",
                type: "switch",
                description: "Sync currently playing song to Last.fm",
                condition: () => !!settingStore.lastfm.sessionKey,
                value: computed({
                  get: () => settingStore.lastfm.nowPlayingEnabled,
                  set: (v) => (settingStore.lastfm.nowPlayingEnabled = v),
                }),
              },
            ],
          },
        ],
      },
      {
        title: "Discord RPC",
        show: isElectron,
        items: [
          {
            key: "discord_enabled",
            label: "Enable Discord RPC",
            type: "switch",
            description: "Show currently playing song in Discord status",
            value: computed({
              get: () => settingStore.discordRpc.enabled,
              set: (v) => handleDiscordEnabledUpdate(v),
            }),
            children: [
              {
                key: "discord_paused",
                label: "Show when paused",
                type: "switch",
                description: "Whether to keep Discord status when paused",
                value: computed({
                  get: () => settingStore.discordRpc.showWhenPaused,
                  set: (v) => {
                    settingStore.discordRpc.showWhenPaused = v;
                    handleDiscordConfigUpdate();
                  },
                }),
              },
              {
                key: "discord_mode",
                label: "Compact status text",
                type: "select",
                description: "Small text shown under username when details panel is collapsed",
                options: [
                  { label: "App name", value: "Name" },
                  { label: "Song name", value: "Details" },
                  { label: "Artist name", value: "State" },
                ],
                value: computed({
                  get: () => settingStore.discordRpc.displayMode,
                  set: (v) => {
                    settingStore.discordRpc.displayMode = v;
                    handleDiscordConfigUpdate();
                  },
                }),
              },
            ],
          },
        ],
      },
      {
        title: "WebSocket configuration",
        show: isElectron,
        items: [
          {
            key: "socket_enabled",
            label: "Enable WebSocket",
            type: "switch",
            description: "Enable status query and player control through WebSocket",
            value: computed({
              get: () => socketEnabled.value,
              set: (v) => handleSocketEnabledUpdate(v),
            }),
          },
          {
            key: "socket_port",
            label: "WebSocket port",
            type: "input-number",
            description: "Changes take effect only after testing and saving",
            componentProps: { min: 1, max: 65535, showButton: false, placeholder: "Enter port number" },
            disabled: computed(() => socketEnabled.value),
            value: computed({
              get: () => socketPort.value,
              set: (v) => (socketPort.value = v || 25885),
            }),
          },
          {
            key: "socket_test",
            label: "Test port configuration",
            type: "button",
            buttonLabel: "Test and save",
            show: computed(() => socketPort.value !== socketPortSaved.value),
            action: testSocketPort,
            componentProps: { type: "primary" },
          },
        ],
      },
    ],
  };
};
