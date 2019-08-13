import crypto from 'crypto'
import { ethers as eth } from 'ethers'
import express from 'express'

import { getChannel } from './channel'
import { config } from './config'
import { watchPendingDeposits } from './deposit'
import { handleTweet, handleMessage } from './events'
import { db } from './db'

const app = express()

const port = process.env.PORT || '8080'

app.use(express.json())

app.use((req, res, next) => {
  console.log(`=> ${req.method} ${req.path} -- ${JSON.stringify(req.query)}`)
  if (JSON.stringify(req.body) !== "{}") {
    if (req.path === '/webhooks/twitter') {
      const keys = Object.keys(req.body).filter(key => key !== 'for_user_id')
      console.log(`Events: ${JSON.stringify(keys)}`)
    } else {
      console.log(`Body: ${JSON.stringify(req.body)}`)
    }
  }
  next()
})

app.get('/webhooks/twitter', (req, res, next) => {
  const hmac = crypto.createHmac('sha256', config.hmac).update(req.query.crc_token);
  const response_token = `sha256=${hmac.digest('base64')}`
  console.log(`Got CRC, responding with: ${response_token}`)
  res.status(200).json({ response_token })
})

app.post('/webhooks/twitter', (req, res, next) => {
  if (req.body.tweet_create_events) {
    req.body.tweet_create_events.forEach(handleTweet)
  }
  if (req.body.direct_message_events) {
    req.body.direct_message_events.forEach(handleMessage)
  }
})

app.all('*', (req, res) => {
  res.status(200).send('Cool story, Bro')
})

app.listen(port, async () => {
  await db.firstConnection
  console.log(`TipDai app listening on ${port}`)
  console.log(`TipDai address: ${config.wallet.address}`)
  const bal = eth.utils.formatEther(await config.wallet.getBalance())
  console.log(`TipDai eth balance: ${eth.constants.EtherSymbol} ${bal}`)
  await getChannel()
  watchPendingDeposits()
})
