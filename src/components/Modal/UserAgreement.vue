<!-- 用户协议 -->
<template>
  <div class="user-agreement">
    <n-h1 class="title">Software License Agreement</n-h1>
    <n-scrollbar class="scrollbar">
      <n-flex class="date" justify="center">
        <n-tag round>Effective Date: July 16, 2024</n-tag>
        <n-tag type="warning" round>Updated Date: December 10, 2025</n-tag>
        <n-tag type="info" round>Agreement Version: v2.0</n-tag>
      </n-flex>
      <n-alert type="warning" title="Important Notice">
        SPlayer is a completely free and open-source music player released under AGPL-3.0.
        This software will never charge users any fees. If you paid for this software from a third-party source,
        you may have encountered a scam. Please stop using it immediately and report it.
      </n-alert>
      <n-p>
        Welcome to SPlayer ("the Software"). This software is a local music player and may call third-party APIs
        to enhance functionality. Please read this agreement carefully before using the Software. This agreement is a
        legal agreement between you ("User") and the SPlayer development team ("Developer"). By downloading,
        installing, or using the Software, you agree to all terms and conditions in this agreement.
      </n-p>
      <n-h3 prefix="bar"> Software Use </n-h3>
      <n-ol>
        <n-li>The Software is a local music player that allows users to play audio files stored on their devices.</n-li>
        <n-li>The Developer reserves the right to modify, update, or terminate the Software and its features at any time without prior notice.</n-li>
        <n-li>Users must be at least 18 years old, or use the Software under parent or guardian supervision.</n-li>
      </n-ol>
      <n-h3 prefix="bar"> Open Source License </n-h3>
      <n-ol>
        <n-li>The Software is open-source software released under the AGPL-3.0 license.</n-li>
        <n-li>When using, modifying, or distributing SPlayer, users must comply with AGPL-3.0 terms and conditions.</n-li>
        <n-li>
          More details of the AGPL-3.0 license can be found at:
          <n-a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank">
            GNU Affero General Public License v3.0
          </n-a>
        </n-li>
      </n-ol>
      <n-h3 prefix="bar"> Third-Party Services </n-h3>
      <n-ol>
        <n-li>The Software may call third-party APIs to provide additional features (for example, lyrics display or album artwork retrieval).</n-li>
        <n-li>
          The Developer is not responsible for the accuracy, completeness, or legality of third-party APIs.
          Users must comply with third-party providers' terms of service and privacy policies.
        </n-li>
        <n-li>The Developer is not liable for any issues or disputes caused by third-party APIs.</n-li>
      </n-ol>
      <n-h3 prefix="bar"> User Responsibilities </n-h3>
      <n-ol>
        <n-li>
          Users must comply with all applicable laws and regulations, obtain music files through legal means,
          and avoid infringing any third-party copyrights or other lawful rights while using the Software.
        </n-li>
        <n-li>
          Users must not use the Software for illegal activities, including but not limited to copyright infringement,
          malware distribution, or illegal data acquisition.
        </n-li>
      </n-ol>
      <n-h3 prefix="bar"> Intellectual Property </n-h3>
      <n-ol>
        <n-li>
          Except for open-source parts under AGPL-3.0, the Software and all its content (including but not limited to software,
          logos, graphics, user interfaces, scripts, and service names) are owned by the Developer or its licensors and
          protected by intellectual property laws.
        </n-li>
        <n-li>Without written permission from the Developer, users may not copy, modify, distribute, sell, or lease the Software and its content.</n-li>
      </n-ol>
      <n-h3 prefix="bar"> Disclaimer </n-h3>
      <n-ol>
        <n-li>
          The Software is provided "as is" without express or implied warranties,
          including but not limited to merchantability, fitness for a particular purpose, and non-infringement.
        </n-li>
        <n-li>
          The Developer does not guarantee uninterrupted or error-free operation,
          nor guarantee that the Software meets specific user requirements.
        </n-li>
        <n-li>The Developer is not liable for any direct or indirect losses arising from use of the Software.</n-li>
      </n-ol>
      <n-h3 prefix="bar"> Limitation of Liability </n-h3>
      <n-ol>
        <n-li>
          To the maximum extent permitted by law, the Developer shall not be liable for any indirect, incidental,
          special, consequential, or punitive damages arising from use or inability to use the Software,
          even if advised of such possibility.
        </n-li>
        <n-li>
          In any case, the Developer's total liability to the user, whether in contract, tort (including negligence),
          or otherwise, shall not exceed the amount paid by the user for the Software (if any).
        </n-li>
      </n-ol>
      <n-h3 prefix="bar"> Termination </n-h3>
      <n-ol>
        <n-li>The Developer may terminate this agreement at any time, with or without reason, without prior notice.</n-li>
        <n-li>After termination, users must stop using the Software and delete all copies.</n-li>
      </n-ol>
      <n-h3 prefix="bar"> Privacy Policy </n-h3>
      <n-ol>
        <n-li>The Software may collect and use certain user information to provide and improve services.</n-li>
        <n-li>
          The Developer is committed to protecting user privacy and will not sell user information to third parties.
          Please refer to our privacy statement for details.
        </n-li>
      </n-ol>
      <n-h3 prefix="bar"> Updates and Changes </n-h3>
      <n-ol>
        <n-li>The Developer reserves the right to update and modify this agreement at any time.</n-li>
        <n-li>
          Updated agreements will be communicated appropriately, including but not limited to publication in the Software
          or notification by email.
        </n-li>
      </n-ol>
      <n-h3 prefix="bar"> Miscellaneous </n-h3>
      <n-ol>
        <n-li>This agreement is governed by the laws of the People's Republic of China, without regard to conflict-of-law rules.</n-li>
        <n-li>
          If any provision of this agreement is deemed invalid or unenforceable, it will be modified to reflect the parties' intent,
          and the remaining provisions will remain fully effective.
        </n-li>
        <n-li>
          Section titles in this agreement are for readability only and do not affect interpretation.
        </n-li>
        <n-li>
          This agreement constitutes the complete agreement between you and the Developer regarding use of the Software,
          and supersedes all prior oral or written agreements and representations.
        </n-li>
      </n-ol>
      <n-card ref="readOverRef">
        If you (the user) accept this agreement, click "Agree and continue" below to sign it.
        If you do not accept, click "Disagree" and the app will exit and clear all app data.
      </n-card>
    </n-scrollbar>
    <n-flex justify="center">
      <n-button v-if="isElectron" type="error" @click="closeApp">Disagree</n-button>
      <n-button type="success" @click="agreeToAgreement" :disabled="!isReadOver">
        {{ isReadOver ? "Agree and continue" : "Please read to the end first" }}
      </n-button>
    </n-flex>
  </div>
</template>

<script setup lang="ts">
import { isElectron } from "@/utils/env";
import { useSettingStore } from "@/stores";
import { CURRENT_AGREEMENT_VERSION } from "@/constants/agreement";

const emit = defineEmits<{
  close: [];
}>();

const settingStore = useSettingStore();
const readOverRef = ref<HTMLElement | null>(null);

// 是否阅读完毕
const isReadOver = useElementVisibility(readOverRef);

// 同意协议
const agreeToAgreement = () => {
  if (!isReadOver.value) return;
  // 更新协议版本
  settingStore.userAgreementVersion = CURRENT_AGREEMENT_VERSION;
  // 关闭弹窗
  emit("close");
};

// 关闭软件
const closeApp = () => {
  window.electron.ipcRenderer.send("quit-app");
};
</script>

<style lang="scss" scoped>
.user-agreement {
  :deep(.scrollbar) {
    max-height: 60vh;
    margin-bottom: 20px;
    .n-scrollbar-content {
      overflow: hidden;
      padding-right: 12px;
    }
  }
  .n-alert {
    margin: 20px 0;
  }
  .title {
    text-align: center;
  }
  .n-p {
    font-size: 16px;
    text-indent: 2em;
  }
  .n-ol {
    font-size: 16px;
  }
  .n-card {
    --n-font-size: 18px;
    --n-border-radius: 12px;
    margin-top: 20px;
    margin-bottom: 20px;
  }
}
</style>
