const express = require('express')

const twitter = require('./twitter')

const app = express()

const port = process.env.PORT || '8080'

app.use(express.json())

app.all('/', (req, res) => {
  console.log(`${req.method} ${req.originalUrl}: ${JSON.stringify(req.body)}`)
  console.log(`query: ${JSON.stringify(req.query)}`)
})

app.listen(port, () => {
  console.log(`TipDai app listening on ${port}`)
})

twitter.authorize()
