var qs = require('qs');

const Twitter = require('./client').Twitter
const { handleError } = require('../utils')
const { config } = require('../config')

/*
const bohendo_id = '259539164'
const tipdai_id = '1154313992141099008'
*/

const twitter = new Twitter(config.twitterBot)
const twitterDev = new Twitter(config.twitterDev)

const getSubscriptions = () => {
  return new Promise((resolve, reject) => {
    twitterDev.getCustomApiCall(
      `/account_activity/all/${config.env}/subscriptions/list.json`,
      {},
      handleError(reject),
      (res) => {
        console.log(`Success!`)
        const data = JSON.parse(res)
        console.log(`Got subscriptions: ${JSON.stringify(data, null, 2)}`)
        resolve(data)
      },
    )
  })
}

const subscribe = () => {
  return new Promise((resolve, reject) => {
    twitter.postCustomApiCall(
      `/account_activity/all/${config.env}/subscriptions.json`,
      JSON.stringify({}),
      handleError(reject),
      (res) => {
        console.log(`Success!`)
        const data = JSON.parse(res)
        console.log(`Subscribed: ${JSON.stringify(data, null, 2)}`)
        resolve(data)
      },
    )
  })
}

const activateWebhook = () => {
  return new Promise((resolve, reject) => {
    twitter.activateWebhook({
      env: config.env,
      url: config.webhookUrl,
    }, handleError(reject), (res) => {
      console.log(`Success!`)
      const data = JSON.parse(res)
      console.log(`Triggered CRC: ${JSON.stringify(data, null, 2)}`)
      resolve(data)
    })
  })
}

const triggerCRC = () => {
  return new Promise((resolve, reject) => {
    const { env, webhookId } = config
    twitter.triggerCRC({ env, webhookId }, handleError(reject), (res) => {
      console.log(`Success fully triggered a CRC!`)
      resolve()
    })
  })
}

const tweet = (status) => {
  return new Promise((resolve, reject) => {
    twitter.postTweet({ status }, handleError(reject), (res) => {
      console.log(`Success!`)
      const data = JSON.parse(res)
      console.log(`Sent tweet: ${JSON.stringify(data, null, 2)}`)
      resolve(data)
    })
  })
}

const getMentions = (options) => {
  return new Promise((resolve, reject) => {
    const defaults = { count: '5', trim_user: true, include_entities: true }
    twitter.getMentionsTimeline({ ...defaults, ...options }, handleError(reject), (res) => {
      console.log(`Success!`)
      const data = JSON.parse(res)
      const mentions = data.map(tweet => tweet.text)
      console.log(`Got mentions: ${JSON.stringify(mentions, null, 2)}`)
      resolve(data)
    })
  })
}

const getUser = (screen_name) => {
  return new Promise((resolve, reject) => {
    twitter.getCustomApiCall('/users/lookup.json', { screen_name }, handleError(reject), (res) => {
      console.log(`Success!`)
      const data = JSON.parse(res)
      console.log(`Got user: ${JSON.stringify(data, null, 2)}`)
      resolve(data)
    })
  })
}

const sendDM = (recipient_id, message) => {
  return new Promise((resolve, reject) => {
    twitter.postCustomApiCall('/direct_messages/events/new.json', JSON.stringify({
      event: {
        type: "message_create",
        message_create: {
          target: {
              recipient_id,
            },
            message_data: {
              text: message
            }
          }
        }
      }),
      handleError(reject),
      (data) => {
        console.log(`Success!`)
        console.log(`Sent DM: ${data}`)
        resolve(data)
      },
    )
  })
}

module.exports = { activateWebhook, getMentions, getSubscriptions, getUser, sendDM, subscribe, triggerCRC, tweet, twitter }
