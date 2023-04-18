<template>
<span class="loader"></span>
</template>

<script setup>
const props = defineProps({
  size: { type: Number, default: 16},
  lightColor: { type: String, default: 'silver'},
  darkColor: {type: String, default: 'gray'}
})

let border = props.size/5
let border1 = `${props.size/5}px solid ${props.lightColor}`
let border2 = `${props.size/5}px solid ${props.darkColor}`
let styleSize= `${props.size}px`

</script>

<style scoped>
.loader {
  display: inline-block;
  border: v-bind(border1) ;
  border-top: v-bind(border2);
  border-radius: 50%;
  width: v-bind(styleSize);
  height: v-bind(styleSize);
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>