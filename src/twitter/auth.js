const { twitter } = require('./index')

const authorize = () => {
  return new Promise((resolve, reject) => {
    twitter.authorize(
      { oauthCallback: 'https://tipdai.bohendo.com' },
      handleError(reject),
      (res) => {
        console.log(`Success!`)
        const data = qs.parse(res)
        console.log(`Got auth data: ${JSON.stringify(data)}`)
        const baseUrl = 'https://api.twitter.com/oauth/authorize'
        console.log(`Login at: ${baseUrl}?oauth_token=${data.oauth_token}`)
        resolve(data)
      },
    )
  })
}

const getAccessToken = (consumer_key, token, verifier) => {
  return new Promise((resolve, reject) => {
    twitter.getAccessToken(
      {
        oauth_consumer_key: consumer_key,
        oauth_token: token,
        oauth_verifier: verifier,
      },
      handleError(reject),
      (res) => {
        console.log(`Success!`)
        const data = qs.parse(res)
        console.log(`Got access token: ${JSON.stringify(data)}`)
        resolve(data)
      },
    )
  })
}

module.exports = { authorize, getAccessToken }
