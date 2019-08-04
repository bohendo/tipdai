const eth = require('ethers')
const config = require('./config')
const { getChannel } = require('./channel')
const store = require('./store')
const twitter = require('./twitter')

const botId = "1154313992141099008"
const { formatEther, parseEther } = eth.utils

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
  const sender = event.message_create.sender_id
  const message = event.message_create.message_data.text
  if (sender === botId) return // ignore messages sent by the bot
  console.log(`Processing message event: ${JSON.stringify(event, null, 2)}`)

  const tokenAddress = await store.get('tokenAddress')
  let swapRate = await store.get(`swapRate`)
  console.log(`swap rate: ${swapRate}`)
  const maxDeposit = formatEther(parseEther(parseEther('10').toString()).div(parseEther(swapRate)))
  console.log(`maxDeposit: ${maxDeposit}`)

  let user = await store.get(`user-${sender}`)
  if (!user) {
    user = { hasBeenWelcomed: true }
    await store.set(`user-${sender}`, JSON.stringify(user))
  } else {
    user = JSON.parse(user)
  }

  if (message.match(/^tip/i)) {
    let tips = store.get(`unprocessedTips`)
    if (!tips) {
      tips = []
    } else {
      tips = JSON.parse(tips)
    }
    console.log(`Processing tips: ${JSON.stringify(tips)}`)
  }

  if (message.match(/^balance/i) || message.match(/^refresh/i)) {
    if (user.balance) {
      if (!user.linkPayment) {
        const channel = await getChannel()
        console.log(`Attempting to create link payment`)
        const link = await channel.conditionalTransfer({
          amount: parseEther(user.balance),
          assetId: tokenAddress,
          conditionType: "LINKED_TRANSFER",
        })
        console.log(`Link: ${JSON.stringify(link)}`)
        user.linkPayment = link
        await store.set(`user-${sender}`, JSON.stringify(user))
      } else {
        console.log(`Link: ${JSON.stringify(user.linkPayment)}`)
      }
      return await twitter.sendDM(sender, `Your balance is $${user.balance} (kovan) DAI.\n\nLink payment id: ${user.linkPayment.paymentId}\n\nSecret: ${user.linkPayment.preImage}`)
    }
    return await twitter.sendDM(sender, `Your balance is $0.00`)
  }


  if (message.match(/^deposit/i)) {
    let pendingDeposits = await store.get('pendingDeposits')
    let depositAddress
    if (!pendingDeposits) {
      pendingDeposits = []
      depositAddress = config.getWallet(1).address
    } else {
      pendingDeposits = JSON.parse(pendingDeposits)
      const prevDeposit = pendingDeposits.filter(dep => dep.user === sender)
      if (prevDeposit[0]) {
        depositAddress = prevDeposit[0].address
        pendingDeposits = pendingDeposits.filter(dep => dep.user !== sender)
      } else {
        depositAddress = config.getWallet(pendingDeposits.length + 1).address
      }
    }
    await store.set('pendingDeposits', JSON.stringify([{
      address: depositAddress,
      oldBalance: formatEther(await config.provider.getBalance(depositAddress)),
      startTime: Date.now(),
      user: sender,
    }, ...pendingDeposits]))
    // TODO: mention max deposit
    await twitter.sendDM(sender, `Send max of ${maxDeposit} kovan ETH to the following address to deposit. This address will be available for deposits for 10 minutes. If you send a transaction with low gas, reply "wait" and the timeout will be extended.`)
    await twitter.sendDM(sender, depositAddress)
    return
  }


  if (message.match(/^wait/i)) {
    let pendingDeposits = await store.get('pendingDeposits')
    if (!pendingDeposits) { return } // No prevDeposit, ignore
    pendingDeposits = JSON.parse(pendingDeposits)
    const prevDeposit = pendingDeposits.filter(dep => dep.user === sender)
    if (!prevDeposit[0]) { return } // No prevDeposit, ignore
    pendingDeposits = pendingDeposits.filter(dep => dep.user !== sender)
    await store.set('pendingDeposits', JSON.stringify([{
      startTime: Date.now(),
      ...prevDeposit,
    }, ...pendingDeposits]))
    await twitter.sendDM(sender, `Timeout extended, you have 10 more minutes to deposit up to ${maxDeposit} kovan ETH to the below address. If you want to extend again, reply "wait" as many times as needed.`)
    await twitter.sendDM(sender, prevDeposit[0].address)
    return
  }
}


const handleTweet = async (tweet) => {
  console.log(`Got a tweet event: ${JSON.stringify(tweet, null, 2)}`)
  let tips = await store.get(`unprocessedTips`)
  console.log(`tips from store: ${tips}`)
  if (!tips) {
    tips = []
  } else {
    tips = JSON.parse(tips)
  }
  tips.append(tweet)
  console.log(`Processing tips: ${JSON.stringify(tips)}`)
  store.set('unprocessedTips', JSON.stringify(tips))
}

module.exports = { handleMessage, handleTweet }
