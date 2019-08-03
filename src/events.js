const handleTweet = (tweet) => {
  console.log(`Got a tweet event: ${JSON.stringify(tweet, null, 2)}`)
}

const handleMessage = (message) => {
  console.log(`Got a message event: ${JSON.stringify(message, null, 2)}`)
}

module.exports = { handleMessage, handleTweet }
