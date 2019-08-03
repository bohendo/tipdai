require('dotenv').config()
const { PostgresServiceFactory } = require("@counterfactual/postgresql-node-connector")
const eth = require('ethers')
const fs = require('fs')

const provider = new eth.providers.JsonRpcProvider(process.env.ETH_PROVIDER)
const mnemonic = fs.readFileSync(process.env.MNEMONIC_FILE, 'utf8')
const wallet = eth.Wallet.fromMnemonic(mnemonic).connect(provider)
const getWallet = (index) =>
  eth.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`).connect(provider)

const databaseConfig = {
  database: process.env.PGDATABASE,
  host: process.env.PGHOST,
  password: fs.readFileSync(process.env.PGPASSFILE, 'utf8'),
  port: parseInt(process.env.PGPORT, 10),
  username: process.env.PGUSER,
}

const storeFactory = new PostgresServiceFactory({
  ...databaseConfig,
  user: process.env.PGUSER,
})

module.exports = {
  provider,
  wallet,
  getWallet,
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
  },
  postgres: {
    ...databaseConfig,
    user: process.env.PGUSER,
  },
  connext: {
    ethProviderUrl: process.env.ETH_PROVIDER,
    logLevel: 5,
    mnemonic,
    nodeUrl: `nats://indra-v2.connext.network:4222`,
    storeFactory,
    type: 'postgres',
  }
}
