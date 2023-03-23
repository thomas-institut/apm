<script setup>
  import {RouterLink, RouterView} from 'vue-router'
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