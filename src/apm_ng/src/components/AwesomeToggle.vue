<script setup>
import { ref } from 'vue'

let awesome = ref(true)
const count = ref(0)

function doToggle() {
  awesome.value = !awesome.value
  count.value++
  console.log(`Toggled to ${awesome.value}`)
}

</script>

<template>
  <button @click="doToggle">toggle</button>

  <template v-if="awesome">
    <h5>Vue is awesome!</h5>
  </template>
  <h5 v-else>Oh no 😢</h5>
  <p class="counter">Count is {{count}}</p>
</template>

<style>
p.counter { font-size: 0.6em; }
</style>