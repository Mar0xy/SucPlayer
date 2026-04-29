import { DropdownOption } from "naive-ui";
import { SongType } from "@/types/main";
import {
  useStatusStore,
  useDataStore,
  useMusicStore,
  useSettingStore,
  useLocalStore,
} from "@/stores";
import { useDownloadManager } from "@/core/resource/DownloadManager";
import { usePlayerController } from "@/core/player/PlayerController";
import { renderIcon, copyData, getShareUrl } from "@/utils/helper";
import { deleteCloudSong, importCloudSong } from "@/api/cloud";
import {
  openCloudMatch,
  openCopySongInfo,
  openDownloadSong,
  openPlaylistAdd,
  openSongInfoEditor,
} from "@/utils/modal";
import { deleteSongs, isLogin } from "@/utils/auth";
import { songUrl } from "@/api/song";
import { dailyRecommendDislike } from "@/api/rec";
import { formatSongsList } from "@/utils/format";

/** 歌曲菜单 */
export const useSongMenu = () => {
  const router = useRouter();
  const dataStore = useDataStore();
  const musicStore = useMusicStore();
  const statusStore = useStatusStore();
  const settingStore = useSettingStore();
  const player = usePlayerController();
  const downloadManager = useDownloadManager();
  const localStore = useLocalStore();

  // 删除本地歌曲
  const deleteLocalSong = (song: SongType, emit?: (event: "removeSong", args: any[]) => void) => {
    if (emit === undefined) return;
    if (!song.path) return;
    window.$dialog.warning({
      title: "Confirm deletion",
      content: () =>
        h("div", { style: { marginTop: "20px" } }, [
          h("div", { style: { marginBottom: "10px", opacity: 0.8, fontSize: "12px" } }, song.path),
          h("div", null, [
            `Confirm deleting from local disk `,
            h("strong", null, song.name),
            `? This action cannot be undone!`,
          ]),
        ]),
      positiveText: "Delete",
      negativeText: "Cancel",
      onPositiveClick: async () => {
        const result = await window.electron.ipcRenderer.invoke("delete-file", song.path);
        if (result) {
          emit("removeSong", [song.id]);
          const currentPlayList = dataStore.playList;
          const songToRemoveIndex = currentPlayList.findIndex(
            (playSong) => playSong.id === song.id,
          );
          if (songToRemoveIndex !== -1) {
            player.removeSongIndex(songToRemoveIndex);
          }
          window.$message.success(`${song.name} deleted successfully`);
        } else {
          window.$message.error(`Failed to delete ${song.name}, please try again`);
        }
      },
    });
  };

  // 删除云盘歌曲
  const deleteCloudSongData = (song: SongType, index: number) => {
    window.$dialog.warning({
      title: "Confirm deletion",
      content: `Confirm deleting ${song.name} from cloud? This action cannot be undone!`,
      positiveText: "Delete",
      negativeText: "Cancel",
      onPositiveClick: async () => {
        const result = await deleteCloudSong(song.id);
        if (result.code == 200) {
          dataStore.cloudPlayList.splice(index, 1);
          dataStore.setCloudPlayList(dataStore.cloudPlayList);
          const currentPlayList = dataStore.playList;
          const songToRemoveIndex = currentPlayList.findIndex(
            (playSong) => playSong.id === song.id,
          );
          if (songToRemoveIndex !== -1) {
            player.removeSongIndex(songToRemoveIndex);
          }
          window.$message.success("Deleted successfully");
        } else {
          window.$message.error("Delete failed, please try again");
        }
      },
    });
  };

  // 导入至云盘
  const importSongToCloud = async (song: SongType) => {
    if (!song?.id) return;
    const songData = await songUrl(song.id);
    const songDetail = songData?.data?.[0];
    if (!songDetail) {
      window.$message.error("Failed to get song information");
      return;
    }
    const { id, type, size, br, md5 } = songDetail;
    const result = await importCloudSong(song?.name, type, size, Math.floor(br / 1000), md5, id);
    if (result.code === 200) {
      const failed = result?.data?.failed?.[0];
      if (failed?.code !== -200) {
        window.$message.success("Imported successfully");
      } else {
        window.$message.error(failed?.msg || "Import failed, please try again");
      }
    } else {
      window.$message.error("Import failed, please try again");
    }
  };

  // 每日推荐 - 不感兴趣
  const dislikeSong = async (song: SongType, index: number) => {
    if (!song?.id) return;
    const loadingMessage = window.$message.loading("Marking as not interested...", { duration: 0 });
    try {
      const result = await dailyRecommendDislike(song.id);
      loadingMessage.destroy();
      if (result.code === 200) {
        const currentList = [...musicStore.dailySongsData.list];
        currentList.splice(index, 1);
        if (result.data) {
          const formattedSong = formatSongsList([result.data])[0];
          currentList.splice(index, 0, formattedSong);
        }
        musicStore.dailySongsData = {
          list: currentList,
          timestamp: Date.now(),
        };
        window.$message.success("Marked as not interested");
      } else {
        window.$message.error("Operation failed, please try again");
      }
    } catch (error) {
      loadingMessage.destroy();
      window.$message.error("Operation failed, please try again");
      console.error("Not interested operation failed:", error);
    }
  };

  // 判断两首歌是否相同
  const isSameSong = (song1: SongType, song2: SongType): boolean => {
    if (song1.id != null && song2.id != null) {
      return song1.id === song2.id;
    }
    if (song1.path && song2.path) {
      return song1.path === song2.path;
    }
    return false;
  };

  // 生成菜单选项
  const getMenuOptions = (
    song: SongType,
    index: number = -1,
    playListId: number = 0,
    isDailyRecommend: boolean = false,
    emit?: (event: "removeSong", args: any[]) => void,
  ): DropdownOption[] => {
    const userPlaylistsData = dataStore.userLikeData.playlists?.filter(
      (pl) => pl.userId === dataStore.userData.userId,
    );
    const type = song.type || "song";
    const isHasMv = !!song?.mv && song.mv !== 0;
    const isCloud = router.currentRoute.value.name === "cloud";
    const isLocal = !!song?.path;
    const isLoginNormal = isLogin() === 1;
    const isCurrent = isSameSong(musicStore.playSong, song);
    const isLocalPlaylist = localStore.isLocalPlaylist(playListId);
    const isUserPlaylist =
      (!!playListId && userPlaylistsData.some((pl) => pl.id === playListId)) || isLocalPlaylist;
    const isDownloading = dataStore.downloadingSongs.some((item) => item.song.id === song.id);

    return [
      {
        key: "play",
        label: "Play now",
        show: settingStore.contextMenuOptions.play,
        props: {
          onClick: () => player.addNextSong(song, true),
        },
        icon: renderIcon("Play", { size: 18 }),
      },
      {
        key: "play-next",
        label: "Play next",
        show: settingStore.contextMenuOptions.playNext && !isCurrent && !statusStore.personalFmMode,
        props: {
          onClick: () => player.addNextSong(song, false),
        },
        icon: renderIcon("PlayNext", { size: 18 }),
      },
      {
        key: "playlist-add",
        label: "Add to playlist",
        show: settingStore.contextMenuOptions.addToPlaylist && type !== "streaming",
        props: {
          onClick: () => openPlaylistAdd([song], isLocal),
        },
        icon: renderIcon("AddList", { size: 18 }),
      },
      {
        key: "mv",
        label: "Watch MV",
        show: settingStore.contextMenuOptions.mv && type === "song" && isHasMv,
        props: {
          onClick: () => router.push({ name: "video", query: { id: song.mv, type: "mv" } }),
        },
        icon: renderIcon("Video", { size: 18 }),
      },
      {
        key: "comment",
        label: "View comments",
        show: !isLocal && type !== "streaming",
        props: {
          onClick: () => {
            const commentType = type === "radio" ? 4 : 0;
            router.push({ name: "comment", query: { id: song.id, type: commentType } });
          },
        },
        icon: renderIcon("Message", { size: 18 }),
      },
      {
        key: "line-1",
        type: "divider",
        show:
          settingStore.contextMenuOptions.play ||
          settingStore.contextMenuOptions.playNext ||
          settingStore.contextMenuOptions.addToPlaylist ||
          settingStore.contextMenuOptions.mv,
      },
      {
        key: "dislike",
        label: "Not interested",
        show: settingStore.contextMenuOptions.dislike && isDailyRecommend && isLoginNormal,
        props: {
          onClick: () => dislikeSong(song, index),
        },
        icon: renderIcon("HeartBroken"),
      },
      {
        key: "more",
        label: "More actions",
        show: settingStore.contextMenuOptions.more,
        icon: renderIcon("Menu", { size: 18 }),
        children: [
          {
            key: "code-name",
            label: `Copy ${type === "song" ? "song" : type === "streaming" ? "streaming" : "program"} name`,
            show: settingStore.contextMenuOptions.copyName,
            props: {
              onClick: () => copyData(song.name),
            },
            icon: renderIcon("Copy", { size: 18 }),
          },
          {
            key: "code-id",
            label: `Copy ${type === "song" ? "song" : type === "streaming" ? "streaming" : "program"} ID`,
            show: !isLocal,
            props: {
              onClick: () => copyData(song.id),
            },
            icon: renderIcon("Copy", { size: 18 }),
          },
          {
            key: "copy-song-info",
            label: "Copy more info",
            show: !isLocal && type === "song",
            props: {
              onClick: () => openCopySongInfo(song.id),
            },
            icon: renderIcon("FormatList", { size: 18 }),
          },
          {
            key: "share",
            label: `Share ${type === "song" ? "song" : "program"} link`,
            show: !isLocal && type !== "streaming",
            props: {
              onClick: () => copyData(getShareUrl(type, song.id), "Share link copied to clipboard"),
            },
            icon: renderIcon("Share", { size: 18 }),
          },
          {
            key: "line-2",
            type: "divider",
            show: settingStore.contextMenuOptions.musicTagEditor && isLocal,
          },
          {
            key: "meta-edit",
            label: "Edit music tags",
            show: settingStore.contextMenuOptions.musicTagEditor && isLocal,
            props: {
              onClick: () => {
                if (song.path) openSongInfoEditor(song);
              },
            },
            icon: renderIcon("EditNote", { size: 20 }),
          },
        ],
      },
      {
        key: "line-two",
        type: "divider",
        show: settingStore.contextMenuOptions.dislike || settingStore.contextMenuOptions.more,
      },
      {
        key: "cloud-import",
        label: "Import to cloud",
        show:
          settingStore.contextMenuOptions.cloudImport &&
          !isCloud &&
          isLoginNormal &&
          type === "song" &&
          !isLocal,
        props: {
          onClick: () => importSongToCloud(song),
        },
        icon: renderIcon("Cloud"),
      },
      {
        key: "delete-playlist",
        label: "Remove from playlist",
        show:
          settingStore.contextMenuOptions.deleteFromPlaylist &&
          emit !== undefined &&
          isUserPlaylist &&
          (isLocalPlaylist || isLoginNormal) &&
          !isCloud,
        props: {
          onClick: () =>
            deleteSongs(playListId!, [song.id], {
              callback: () => emit?.("removeSong", [song.id]),
              songName: song.name,
            }),
        },
        icon: renderIcon("Delete"),
      },
      {
        key: "delete-cloud",
        label: "Remove from cloud",
        show: settingStore.contextMenuOptions.deleteFromCloud && isCloud,
        props: {
          onClick: () => deleteCloudSongData(song, index),
        },
        icon: renderIcon("Delete"),
      },
      {
        key: "delete-local",
        label: "Delete from local disk",
        show:
          settingStore.contextMenuOptions.deleteFromLocal &&
          emit !== undefined &&
          isLocal &&
          !isCurrent,
        props: {
          onClick: () => deleteLocalSong(song, emit),
        },
        icon: renderIcon("Delete"),
      },
      {
        key: "open-folder",
        label: "Open song folder",
        show: settingStore.contextMenuOptions.openFolder && isLocal,
        props: {
          onClick: () => window.electron.ipcRenderer.send("open-folder", song.path),
        },
        icon: renderIcon("SnippetFolder"),
      },
      {
        key: "cloud-match",
        label: "Cloud song correction",
        show: settingStore.contextMenuOptions.cloudMatch && isCloud,
        props: {
          onClick: () => openCloudMatch(song?.id, index),
        },
        icon: renderIcon("AutoFix"),
      },
      {
        key: "wiki",
        label: "Music wiki",
        show: settingStore.contextMenuOptions.wiki && type === "song" && !isLocal,
        props: {
          onClick: () => router.push({ name: "song-wiki", query: { id: song.id } }),
        },
        icon: renderIcon("Info"),
      },
      {
        key: "search",
        label: "Search same title",
        show: settingStore.contextMenuOptions.search && settingStore.useOnlineService,
        props: {
          onClick: () => router.push({ name: "search", query: { keyword: song.name } }),
        },
        icon: renderIcon("Search"),
      },
      {
        key: "download",
        label: "Download song",
        show:
          settingStore.contextMenuOptions.download &&
          statusStore.isDeveloperMode &&
          !isLocal &&
          type === "song" &&
          !isDownloading,
        props: { onClick: () => openDownloadSong(song) },
        icon: renderIcon("Download"),
      },
      {
        key: "retry-download",
        label: "Retry download",
        show:
          settingStore.contextMenuOptions.download && statusStore.isDeveloperMode && isDownloading,
        props: { onClick: () => downloadManager.retryDownload(song.id) },
        icon: renderIcon("Refresh"),
      },
    ];
  };

  return { getMenuOptions };
};
