<template>
  <div class="cloud-match">
    <n-form :model="matchFormData" :rules="matchFormRules">
      <n-form-item path="sid" label="Original Song ID">
        <n-input-number v-model:value="matchFormData.sid" :show-button="false" disabled />
      </n-form-item>
      <n-form-item path="asid" label="Matched ID">
        <n-flex :size="12" :wrap="false" class="input">
          <n-input-number
            v-model:value="matchFormData.asid"
            :show-button="false"
            placeholder="Enter target song ID"
            @input="isSongNormal = false"
          />
          <n-button
            :disabled="!matchFormData.asid || isSongNormal"
            :type="isSongNormal ? 'success' : 'primary'"
            @click="testSongId"
          >
            {{ isSongNormal ? "Verified" : "Verify" }}
          </n-button>
        </n-flex>
      </n-form-item>
    </n-form>
    <!-- 匹配信息 -->
    <n-collapse-transition :show="isSongNormal">
      <SongDataCard :data="matchSongData" />
    </n-collapse-transition>
    <n-flex class="menu" justify="end">
      <n-button strong secondary @click="emit('close')"> Cancel </n-button>
      <n-button type="primary" strong secondary @click="correctSong"> Confirm correction </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import type { SongType } from "@/types/main";
import type { FormRules } from "naive-ui";
import { useDataStore } from "@/stores";
import { matchCloudSong } from "@/api/cloud";
import { numberRule } from "@/utils/rules";
import { debounce } from "lodash-es";
import { songDetail } from "@/api/song";
import { formatSongsList } from "@/utils/format";

// 表单类型
interface MatchFormType {
  sid: number;
  asid: number | null;
}

const props = defineProps<{
  id: number;
  index: number;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dataStore = useDataStore();

// 验证结果
const isSongNormal = ref<boolean>(false);
const matchSongData = ref<SongType | null>(null);

// 表单数据
const matchFormData = ref<MatchFormType>({ sid: props.id, asid: null });
const matchFormRules: FormRules = { asid: { ...numberRule, message: "Please enter a song ID" } };

// 验证歌曲 ID
const testSongId = debounce(
  async () => {
    const asid = matchFormData.value.asid;
    if (!asid) {
      window.$message.warning("Please enter a song ID");
      return;
    }
    // 获取歌曲详情
    const { songs } = await songDetail(asid);
    // 结果是否为空
    if (!songs?.length) {
      window.$message.warning("Song not found, please try again");
    } else {
      window.$message.success("Verification succeeded");
      isSongNormal.value = true;
      matchSongData.value = formatSongsList(songs)[0];
    }
  },
  300,
  { leading: true, trailing: false },
);

// 歌曲纠正
const correctSong = debounce(
  async () => {
    const userId = dataStore.userData.userId;
    if (!matchFormData.value.asid || !userId) {
      window.$message.warning("Failed to get required information, please try again");
      return;
    }
    if (matchFormData.value.sid === matchFormData.value.asid) {
      window.$message.warning("Same as original song ID, no correction needed");
      return;
    }
    if (!isSongNormal.value) {
      window.$message.warning("Song has not passed verification, please try again");
      return;
    }
    // 开始纠正
    const result = await matchCloudSong(userId, matchFormData.value.sid, matchFormData.value.asid);
    if (result.code === 200) {
      emit("close");
      // 修改信息
      if (matchSongData.value) {
        dataStore.cloudPlayList[props.index] = matchSongData.value;
        dataStore.setCloudPlayList(dataStore.cloudPlayList);
      }
      window.$message.success("Song info corrected successfully");
    } else {
      window.$message.error(result.message || "Correction failed, please try again");
    }
  },
  300,
  { leading: true, trailing: false },
);
</script>

<style lang="scss" scoped>
.input {
  width: 100%;
}
</style>
