const config = require('./config')
const { getChannel } = require('./channel')
const store = require('./store')
const twitter = require('./twitter')

const handleTweet = async (tweet) => {
  console.log(`Got a tweet event: ${JSON.stringify(tweet, null, 2)}`)
}

/*
Got a message event: {
  "type": "message_create",
  "id": "1157728808532709380",
  "created_timestamp": "1564859032172",
  "message_create": {
    "target": {
      "recipient_id": "1154313992141099008"
    },
    "sender_id": "259539164",
    "message_data": {
      "text": "deposit",
      "entities": {
        "hashtags": [],
        "symbols": [],
        "user_mentions": [],
        "urls": []
      }
    }
  }
}
*/

const handleMessage = async (event) => {
  console.log(`Got a message event: ${JSON.stringify(event, null, 2)}`)
  const sender = event.message_create.sender_id
  const message = event.message_create.messsage_data.text


  if (message.match(/^deposit/i)) {
    let pendingDeposits = await store.get('pendingDeposits')
    let depositAddress
    if (!pendingDeposits) {
      pendingDeposits = []
      depositAddress = config.getWallet(1).address
    } else {
      const prevDeposit = pendingDeposits.filter(dep => dep.user === sender)
      if (prevDeposit[0]) {
        depositAddress = prevDeposit[0].address
        pendingDeposits = pendingDeposits.filter(dep => dep.user !== sender)[0]
      } else {
        depositAddress = config.getWallet(pendingDeposits.length + 1).address
      }
    }
    await store.set('pendingDeposits', JSON.stringify([{
      address: depositAddress,
      startTime: Date.now(),
      user: sender,
    }, ...pendingDeposits]))
    twitter.sendDM(sender, `Send funds to ${depositAddress} to deposit. This address will be available for deposits for 10 minutes. If you send a transaction with low gas, reply "wait" and the timeout will be extended.`)
    return
  }


  if (message.match(/^wait/i)) {
    let pendingDeposits = await store.get('pendingDeposits')
    if (!pendingDeposits) { return } // No prevDeposit, ignore
    const prevDeposit = pendingDeposits.filter(dep => dep.user === sender)
    if (!prevDeposit[0]) { return } // No prevDeposit, ignore
    pendingDeposits = pendingDeposits.filter(dep => dep.user !== sender)[0]
    await store.set('pendingDeposits', JSON.stringify([{
      address: prevDeposit[0].address,
      startTime: Date.now(),
      user: sender,
    }, ...pendingDeposits]))
    twitter.sendDM(sender, `Timeout extended, you have 10 more minutes to send funds to ${depositAddress} to deposit. If you want to extend again, reply "wait" as many times as needed.`)
    return
  }


}

module.exports = { handleMessage, handleTweet }
