const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8888',
    setupNodeEvents(on, config) {
      // implement node event listeners here

      // let firefox = {
      //   name: 'firefox',
      //   channel: 'stable',
      //   family: 'firefox',
      //   displayName: 'Firefox',
      //   version: '136.0.2',
      //   path: '/snap/firefox/current/usr/lib/firefox/firefox',
      //   majorVersion: '136',
      // }
      // return { browsers: config.browsers.concat(firefox) }
    },
  },
});
