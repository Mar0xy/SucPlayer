<template>
  <div class="copy-song-info">
    <n-spin :show="loading" description="Loading song details">
      <n-scrollbar style="max-height: 70vh">
        <n-form :size="'small'" ref="formRef">
          <n-form-item label="Song Name">
            <n-input-group>
              <n-input :value="songInfo?.name" readonly placeholder="No song name" />
              <n-button
                type="primary"
                strong
                secondary
                @click="copyText(songInfo?.name, 'song name')"
              >
                <template #icon>
                  <SvgIcon name="Copy" />
                </template>
              </n-button>
            </n-input-group>
          </n-form-item>
          <n-form-item label="Alias" v-if="songInfo?.alia">
            <n-input-group>
              <n-input :value="songInfo?.alia" readonly placeholder="No alias" />
              <n-button type="primary" strong secondary @click="copyText(songInfo?.alia, 'alias')">
                <template #icon>
                  <SvgIcon name="Copy" />
                </template>
              </n-button>
            </n-input-group>
          </n-form-item>
          <n-divider class="divider"> Credits </n-divider>
          <template v-for="(artist, index) in artistsList" :key="index">
            <n-grid :cols="24" :x-gap="12">
              <n-form-item-gi
                :span="14"
                :label="artistsList.length > 1 ? `Artist ${index + 1}` : 'Artist'"
              >
                <n-input-group>
                  <n-input :value="artist.name" readonly />
                  <n-button
                    type="primary"
                    strong
                    secondary
                    @click="copyText(artist.name, 'artist name')"
                  >
                    <template #icon>
                      <SvgIcon name="Copy" />
                    </template>
                  </n-button>
                </n-input-group>
              </n-form-item-gi>
              <n-form-item-gi :span="10" label="ID" v-if="artist.id">
                <n-input-group>
                  <n-input :value="String(artist.id)" readonly />
                  <n-button
                    type="primary"
                    strong
                    secondary
                    @click="copyText(String(artist.id), 'artist ID')"
                  >
                    <template #icon>
                      <SvgIcon name="Copy" />
                    </template>
                  </n-button>
                </n-input-group>
              </n-form-item-gi>
            </n-grid>
          </template>
          <n-grid :cols="24" :x-gap="12" v-if="albumData">
            <n-form-item-gi :span="14" label="Album">
              <n-input-group>
                <n-input :value="albumData.name" readonly placeholder="No album info" />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(albumData.name, 'album name')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
            <n-form-item-gi :span="10" label="ID" v-if="albumData.id">
              <n-input-group>
                <n-input :value="String(albumData.id)" readonly />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(String(albumData.id), 'album ID')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
          </n-grid>
          <n-divider class="divider"> Song Info </n-divider>
          <n-grid :cols="24" :x-gap="12">
            <n-form-item-gi :span="12" label="Song ID">
              <n-input-group>
                <n-input :value="String(songInfo?.id || '')" readonly />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(String(songInfo?.id), 'song ID')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
            <n-form-item-gi :span="12" label="Duration">
              <n-input-group>
                <n-input :value="duration" readonly />
                <n-button type="primary" strong secondary @click="copyText(duration, 'duration')">
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
          </n-grid>
          <n-grid :cols="24" :x-gap="12">
            <n-form-item-gi :span="24" label="Publish Time" v-if="publishTime">
              <n-input-group>
                <n-input :value="publishTime" readonly />
                <n-button
                  type="primary"
                  strong
                  secondary
                  @click="copyText(publishTime, 'publish time')"
                >
                  <template #icon>
                    <SvgIcon name="Copy" />
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item-gi>
          </n-grid>
          <n-form-item label="Song Link">
            <n-input-group>
              <n-input :value="songLink" readonly placeholder="No link" />
              <n-button type="primary" strong secondary @click="copyText(songLink, 'link')">
                <template #icon>
                  <SvgIcon name="Copy" />
                </template>
              </n-button>
            </n-input-group>
          </n-form-item>
        </n-form>
      </n-scrollbar>
    </n-spin>
    <n-button block @click="handleCopyAll" :disabled="!songInfo" type="primary" secondary>
      Copy all information
    </n-button>
  </div>
</template>

<script setup lang="ts">
import type { SongType, MetaData } from "@/types/main";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";
import { copyData, getShareUrl } from "@/utils/helper";
import { msToTime, formatTimestamp } from "@/utils/time";

const props = defineProps<{ songId: number; onClose: () => void }>();

const loading = ref(true);
const songInfo = ref<SongType | null>(null);

const artistsList = computed<MetaData[]>(() => {
  if (!songInfo.value) return [];
  if (Array.isArray(songInfo.value.artists)) return songInfo.value.artists;
  if (typeof songInfo.value.artists === "string") {
    return [{ name: songInfo.value.artists, id: 0 }];
  }
  return [];
});

const albumData = computed<MetaData | null>(() => {
  if (!songInfo.value) return null;
  if (typeof songInfo.value.album === "object") return songInfo.value.album;
  if (typeof songInfo.value.album === "string") {
    return { name: songInfo.value.album, id: 0 };
  }
  return null;
});

const duration = computed(() => {
  return songInfo.value?.duration ? msToTime(songInfo.value.duration) : "";
});

const publishTime = computed(() => {
  const createTime = songInfo.value?.createTime;
  return typeof createTime === "number" ? formatTimestamp(createTime, "YYYY-MM-DD", true) : "";
});

const songLink = computed(() => {
  return songInfo.value?.id ? getShareUrl("song", songInfo.value.id) : "";
});

// 获取歌曲详情
const fetchSongDetail = async () => {
  try {
    loading.value = true;
    const result = await songDetail(props.songId);
    const songs = formatSongsList(result?.songs);
    if (!songs || songs.length === 0) {
      window.$message.error("Failed to get song details");
      return;
    }
    songInfo.value = songs[0];
  } catch (error) {
    console.error("Failed to get song details:", error);
    window.$message.error("Failed to get song details");
  } finally {
    loading.value = false;
  }
};

const copyText = (text: string | undefined, label: string) => {
  if (text) copyData(text, `Copied ${label}`);
};

// 复制全部
const handleCopyAll = () => {
  if (!songInfo.value) return;
  const lines = [
    `Song: ${songInfo.value.name}`,
    songInfo.value.alia ? `Alias: ${songInfo.value.alia}` : "",
    `Artist: ${artistsList.value.map((a) => `${a.name}${a.id ? ` (ID: ${a.id})` : ""}`).join(" / ")}`,
    albumData.value
      ? `Album: ${albumData.value.name}${albumData.value.id ? ` (ID: ${albumData.value.id})` : ""}`
      : "",
    `Song ID: ${songInfo.value.id}`,
    duration.value ? `Duration: ${duration.value}` : "",
    publishTime.value ? `Publish Time: ${publishTime.value}` : "",
    `Link: ${songLink.value}`,
  ].filter((line) => line);

  copyData(lines, "Copied all information");
};

onMounted(() => {
  fetchSongDetail();
});
</script>

<style lang="scss" scoped>
.copy-song-info {
  display: flex;
  flex-direction: column;
  width: 100%;
  .divider {
    font-size: 14px;
    margin: 16px 0 12px 0;
  }
}
</style>
