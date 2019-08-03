require('dotenv').config()

const config = {
  webhookUrl: `${process.env.CALLBACK_URL}/webhooks/twitter`,
  env: 'prod',
  hmac: process.env.CONSUMER_SECRET,
  twitter: {
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessTokenSecret: process.env.ACCESS_SECRET,
    callBackUrl: process.env.CALLBACK_URL,
  }
}

module.exports = { config }
