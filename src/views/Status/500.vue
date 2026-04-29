<template>
  <n-result status="500" title="Server error" description="Something went wrong on the server, please try again later">
    <template #footer>
      <n-button type="primary" @click="router.go(0)"> Reload </n-button>
    </template>
  </n-result>
</template>

<script setup lang="ts">
const router = useRouter();
</script>
