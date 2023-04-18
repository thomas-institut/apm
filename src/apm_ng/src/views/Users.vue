<script setup>
import { inject } from 'vue'
import { STATE_LOADED } from '@/helpers/DataLoader'
import LoadingState from '@/components/LoadingState.vue'
let userDataLoader = inject('userDataLoader')

</script>

<template>
  <h1>Users</h1>
    <template v-if="userDataLoader.state===STATE_LOADED">
      <ul v-if="userDataLoader.data.length!==0">
      <li v-for="user in userDataLoader.data" :key="user.id">
        {{user.fullname}}
      </li>
      </ul>
      <p v-else>No users</p>
    </template>
  <LoadingState :state="userDataLoader.state" data-name="User Data" v-else/>
</template>

<style scoped>

</style>