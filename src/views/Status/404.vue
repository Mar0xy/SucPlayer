<template>
  <n-result status="404" title="Page not found" description="How did you end up here?">
    <template #footer>
      <n-button type="primary" @click="router.go(-1)"> Go back </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
const router = useRouter();
</script>
