require('dotenv').config()

const config = {
  webhookUrl: `${process.env.callBackUrl}/webooks/twitter`,
  env: 'prod',
  hmac: process.env.consumerSecret,
  twitter: {
    consumerKey: process.env.consumerKey,
    consumerSecret: process.env.consumerSecret,
    accessToken: process.env.accessToken,
    accessTokenSecret: process.env.accessTokenSecret,
    callBackUrl: process.env.callBackUrl,
  }
}

module.exports = { config }
