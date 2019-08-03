const crypto = require('crypto')
const express = require('express')

const { config } = require('./config')

const app = express()

const port = process.env.PORT || '8080'

app.use(express.json())

app.use((req, res, next) => {
  console.log(`=> ${req.method} ${req.path} -- ${JSON.stringify(req.query)}`)
  if (JSON.stringify(req.body) !== "{}") console.log(`body: ${JSON.stringify(req.body)}`)
  res.status(200).send('Cool story, Bro')
})

app.get('/webhooks/twitter', (req, res, next) => {
  const hmac = crypto.createHmac('sha256', config.hmac).update(req.query.crc_token);
  const response_token = `sha256=${hmac.digest('base64')}`
  console.log(`Got CRC, responding with: ${response_token}`)
  res.status(200).json({ response_token })
})

app.listen(port, () => {
  console.log(`TipDai app listening on ${port}`)
})
