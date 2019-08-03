require('dotenv').config()
var qs = require('qs');

const Twitter = require('./client').Twitter
const { handleError } = require('../utils')

/*
const bohendo_id = '259539164'
const tipdai_id = '1154313992141099008'
*/

const twitter = new Twitter({
  consumerKey: process.env.consumerKey,
  consumerSecret: process.env.consumerSecret,
  accessToken: process.env.accessToken,
  accessTokenSecret: process.env.accessTokenSecret,
  callBackUrl: process.env.callBackUrl,
})

const authorize = () => {
  return new Promise((resolve, reject) => {
    twitter.authorize(
      { oauthCallback: 'https://tipdai.bohendo.com' },
      handleError(reject),
      (res) => {
        console.log(`Success!`)
        const data = qs.parse(res)
        console.log(`Got auth data: ${JSON.stringify(data)}`)
        resolve(data)
      },
    )
  })
}

const getMentions = (options) => {
  return new Promise((resolve, reject) => {
    const defaults = { count: '5', trim_user: true, include_entities: true }
    twitter.getMentionsTimeline({ ...defaults, ...options }, handleError(reject), (rawData) => {
      console.log(`Success!`)
      const data = JSON.parse(rawData)
      const mentions = data.map(tweet => tweet.text)
      console.log(`Got mentions: ${JSON.stringify(mentions, null, 2)}`)
      resolve(data)
    })
  })
}

const getUser = (screen_name) => {
  return new Promise((resolve, reject) => {
    twitter.getCustomApiCall('/users/lookup.json', { screen_name }, handleError(reject), (data) => {
      console.log(`Success!`)
      const user = JSON.parse(rawData)
      console.log(`Got user: ${JSON.stringify(user, null, 2)}`)
      resolve(user)
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

module.exports = { authorize, getMentions, getUser, sendDM }
