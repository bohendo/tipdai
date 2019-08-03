const express = require('express')

const twitter = require('./twitter')

const app = express()

const port = process.env.PORT || '8080'

app.use(express.json())

app.use((req, res, next) => {
  console.log(`=> ${req.method} ${req.path} -- ${JSON.stringify(req.query)}`)
  if (JSON.stringify(req.body) !== "{}") console.log(`body: ${JSON.stringify(req.body)}`)
  res.status(200).send('Cool story, Bro')
})

app.listen(port, () => {
  console.log(`TipDai app listening on ${port}`)
})
