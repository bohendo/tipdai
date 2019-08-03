const handleTweet = (tweet) => {
  console.log(`Got a tweet event: ${JSON.stringify(tweet)}`)
}

const handleMessage = (message) => {
  console.log(`Got a message event: ${JSON.stringify(message)}`)
}

module.exports = { handleMessage, handleTweet }
