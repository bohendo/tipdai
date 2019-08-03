require('dotenv').config()
const eth = require('ethers')
const fs = require('fs')

const provider = new eth.providers.JsonRpcProvider(process.env.ETH_PROVIDER)
const mnemonic = fs.readFileSync(process.env.MNEMONIC_FILE, 'utf8')
const wallet = eth.Wallet.fromMnemonic(mnemonic).connect(provider)

const config = {
  provider,
  wallet,
  webhookUrl: `${process.env.CALLBACK_URL}/webhooks/twitter`,
  webhookId: process.env.WEBHOOK_ID,
  env: 'prod',
  hmac: process.env.CONSUMER_SECRET,
  twitterBot: {
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    accessToken: process.env.BOT_ACCESS_TOKEN,
    accessTokenSecret: process.env.BOT_ACCESS_SECRET,
    callBackUrl: process.env.CALLBACK_URL,
  },
  twitterDev: {
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    callBackUrl: process.env.CALLBACK_URL,
  }
}

module.exports = { config }
