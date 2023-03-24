<script setup>
  import {RouterLink, RouterView} from 'vue-router'
  import router from '@/router/index.js'
  import { provide, reactive, ref } from 'vue'
  import { DataLoader, STATE_ERROR, STATE_NOT_LOADED } from '@/helpers/DataLoader.js'
  import { ApiHelper } from '@/helpers/ApiHelper.js'

  const AUTH_AUTHENTICATING = 0
  const AUTH_NOT_AUTHENTICATED = 1
  const AUTH_AUTHENTICATED = 2

  let apiHelper = new ApiHelper(appConfig.apmBaseurl, '')

  let userInfo = reactive({
    userId: -1,
    userName: 'guest',
    fullName: 'Guest',
    authenticationStatus: AUTH_AUTHENTICATING
  })


  function authenticate(user, pwd, withCredentials) {
    userInfo.authenticationStatus = AUTH_AUTHENTICATING
    apiHelper.login(user, pwd, withCredentials).then( async (response) => {
      console.log(response.status)
      if (response.status === 200) {
        console.log(`User is authenticated`)
        let data = await response.json()
        userInfo.userId = data['userId']
        userInfo.userName = data['userData'].username
        userInfo.fullName = data['userData'].fullname
        userInfo.authenticationStatus = AUTH_AUTHENTICATED
        document.cookie = data['authCookie']
      } else {
        userInfo.authenticationStatus = AUTH_NOT_AUTHENTICATED
      }
    })
  }
  // first, try to log in with credentials cookie
  authenticate('', '', true)

  function onClickLoginButton() {
    console.log('Click on login button')
    let user = $('#user-input').val()
    let pwd = $('#password-input').val()
    if (user === '' || pwd === '') {
      return
    }
    console.log(`Logging in user '${user}'`)
    authenticate(user, pwd, false)
  }

  // User Data
  // let userDataLoader = reactive(new DataLoader(FakeFetch.generateFakeFetcher(2000,[
  //   { id: 1, name: 'Peter'},
  //   { id: 2, name: 'Paul'},
  //   { id: 3, name: 'Mary'}
  // ] )))

  let userDataLoader = reactive(new DataLoader( () => { return apiHelper.getAllUsers()}))


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
  <template v-if="userInfo.authenticationStatus===AUTH_AUTHENTICATING">
    <p>Authenticating... please stand by</p>
  </template>
  <template v-else-if="userInfo.authenticationStatus===AUTH_NOT_AUTHENTICATED">
    <div class="flex flex-col max-w-md">
      <form action="http://localhost:8888/api/app/login" method="post">
      <h1>Login</h1>
      <table class="login-table">
        <tr><td>Username:</td><td><input id="user-input" type="text"></td></tr>
        <tr><td>Password:</td><td><input id="password-input" type="password"></td></tr>
        <tr><td></td><td><button @click="onClickLoginButton()">Login</button></td></tr>
      </table>
      </form>

    </div>

  </template>
  <template v-else>
    <div class="flex flex-row text-md items-end justify-between border-b mb-4 pb-1">
      <div class="space-x-4 flex flex-row items-end">
        <RouterLink to="/"><img class="h-9" src="@/logos/apm.svg" alt="APM"></RouterLink>
        <RouterLink to="/dashboard">Dashboard</RouterLink>
        <RouterLink to="/documents">Documents</RouterLink>
        <RouterLink to="/chunks">Chunks</RouterLink>
        <RouterLink to="/users">Users</RouterLink>
        <RouterLink to="/search">Search</RouterLink>
      </div>
      <div>
        {{userInfo.fullName}}
      </div>
    </div>

    <div class="content mt-4">
      <RouterView/>
    </div>
  </template>
</template>
<style scoped>

</style>