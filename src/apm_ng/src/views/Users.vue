<template>
  <h1>Users</h1>
  <ul>
    <li v-for="user in userList">
      {{user}}
    </li>
  </ul>
</template>

<script setup>
import { onMounted, ref } from 'vue'

 let userList = ref([])
 let loaded = ref(false)

 onMounted(() =>{
   getUsers()
 })

 async function getUsers() {
  console.log(`Executing getUsers, loaded= ${loaded.value}`)
   if (!loaded.value) {
     console.log('Getting users')
     setTimeout( () => {
       console.log("Got users")
       userList.value = [ 'Peter', 'Paul', 'Mary']
       loaded.value = true
     }, 2000)
   }
 }

</script>

<style scoped>

</style>