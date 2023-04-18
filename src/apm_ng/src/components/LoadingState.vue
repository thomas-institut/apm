<template>
  <p v-if="state===STATE_NOT_LOADED">
    {{dataName}} not loaded
  </p>
  <p v-else-if="state===STATE_LOADING">
    Loading {{ dataName }}  <WheelSpinner :size="16"/>
  </p>
  <p class="error" v-else-if="state===STATE_ERROR">
    Error loading {{ dataName }}
  </p>
  <p v-else>
    {{ dataName }} loaded
  </p>
</template>

<script setup>
import {STATE_ERROR, STATE_LOADING, STATE_NOT_LOADED} from '@/helpers/DataLoader'
import WheelSpinner from '@/components/WheelSpinner.vue'
defineProps({
      state: { type: String, default: STATE_NOT_LOADED },
      dataName: { type: String, default: 'Data' }
    })
</script>

<style scoped>

</style>