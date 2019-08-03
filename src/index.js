const express = require('express')

const twitter = require('./twitter')

const app = express()

const port = process.env.PORT || '8080'

app.use(express.json())

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  console.log(`query: ${JSON.stringify(req.query)}`)
  console.log(`body: ${JSON.stringify(req.body)}`)
  console.log(``)
  next()
})

app.all('/', (req, res, next) => {
  const reply = 'Cool story, Bro'
  console.log(`Sending reply: ${reply}`)
  res.status(200).send(reply)
})

app.listen(port, () => {
  console.log(`TipDai app listening on ${port}`)
})
