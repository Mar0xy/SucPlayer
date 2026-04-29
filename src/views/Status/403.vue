<template>
  <n-result status="403" title="Access denied" description="You are not allowed to access this page">
    <template #footer>
      <n-button type="primary" @click="router.go(-1)"> Go back </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
const router = useRouter();
</script>
