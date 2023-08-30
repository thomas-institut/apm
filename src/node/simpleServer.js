// import http from 'http'
import express from 'express'

const API_PATH_PREFIX = '/api/nodejs'
const PORT = 3000

let app = express()

app.route('/api/')

app.get(`${API_PATH_PREFIX}/hello`, (req, res) => {
  res.append('Content-Type', 'text/plain').send('Hello World!')
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
