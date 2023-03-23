<script setup>
  import {RouterLink, RouterView} from 'vue-router'
  import router from '@/router/index.js'
  import { provide, reactive } from 'vue'
  import { DataLoader, STATE_ERROR, STATE_NOT_LOADED } from '@/helpers/DataLoader.js'
  import { FakeFetch } from '@/helpers/FakeFetch.js'

  let userDataLoader = reactive(new DataLoader(FakeFetch.generateFakeFetcher(2000,[
    { id: 1, name: 'Peter'},
    { id: 2, name: 'Paul'},
    { id: 3, name: 'Mary'}
  ] )))


  provide('userDataLoader', userDataLoader)

  router.beforeEach( (to, from) => {
    console.log(`Navigating from ${from.name} to ${to.name}`)
    if (to.name === 'users') {
      let currentState = userDataLoader.state
      if (currentState === STATE_NOT_LOADED || currentState === STATE_ERROR) {
        userDataLoader.doFetch().then( (state) => {
          console.log(`User data loader now in state '${state}'`)
        })
      }
    }
  })


</script>

<template>
  <header class="space-x-4 flex flex-row text-md items-end border-b mb-4 pb-1">
    <RouterLink to="/"><img class="h-9" src="@/logos/apm.svg" alt="APM"></RouterLink>
    <RouterLink to="/dashboard">Dashboard</RouterLink>
    <RouterLink to="/documents">Documents</RouterLink>
    <RouterLink to="/chunks">Chunks</RouterLink>
    <RouterLink to="/users">Users</RouterLink>
    <RouterLink to="/search">Search</RouterLink>
  </header>
  <div class="content mt-4">
    <RouterView/>
  </div>
</template>

<style scoped>
</style>