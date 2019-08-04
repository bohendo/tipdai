const eth = require('ethers')
const config = require('./config')
const store = require('./store')

const timeout = 1000 * 60 * 25
const provider = config.provider
const { formatEther, parseEther } = eth.utils

/*
pendingDeposits = [{
  "address": "0x2960dB45c8a02F9b373DEFAFc6Ac42B1aE3847Fa",
  "amount": "0.00168"
  "startTime": 1564865493796,
  "user": "259539164"
  "oldBalance": "0.4567"
}]
*/

const watchPendingDeposits = () => {
  setInterval(async () => {
    var pendingDeposits = await store.get('pendingDeposits')
    if (!pendingDeposits || !pendingDeposits.length) {
      return // No pending deposits
    }
    console.log(`Found pending deposits: ${pendingDeposits}`)
    pendingDeposits = JSON.parse(pendingDeposits)

    // Check the balance of each pending deposit address
    pendingDeposits = pendingDeposits.map(async dep => {
      const balance = await provider.getBalance(dep.address)
      if (!dep.oldBalance) {
        dep.oldBalance = formatEther(balance.sub(parseEther(balance)))
      } else if (parseEther(dep.oldBalance).lt(balance)) {
        dep.amount = formatEther(balance.sub(parseEther(dep.oldBalance)))
      }
      return dep
    })
    pendingDeposits = await Promise.all(pendingDeposits)
    console.log(`Updated balances: ${JSON.stringify(pendingDeposits)}`)

    // Deal w completed deposits
    const completeDeposits = pendingDeposits.filter(dep => dep.amount)
    if (completeDeposits.length > 0) {
      console.log(`Completed deposits: ${JSON.stringify(completeDeposits)}`)
      completeDeposits.forEach(async dep => {
        pendingDeposits = pendingDeposits.filter(dep => !dep.amount)
        const user = await store.get(`user-${dep.user}`)
        if (!user) {
          await store.set(`user-${sender}`, JSON.stringify({ hasBeenWelcomed: true }))
        }
        user = JSON.parse(user)
        user.balance = dep.amount // TODO: swap this for dai
        await store.set(`user-${sender}`, JSON.stringify(user))
      })
    }
    console.log(`Deposits minus completed ones: ${JSON.stringify(pendingDeposits)}`)

    // Remove expired deposits
    const expiredDeposits = pendingDeposits.filter(dep => dep.startTime + timeout <= Date.now())
    if (expiredDeposits.length > 0) {
      console.log(`Found expired deposits: ${JSON.stringify(expiredDeposits)}`)
      expiredDeposits.forEach(dep => {
        pendingDeposits = pendingDeposits.filter(dep => dep.startTime + timeout > Date.now())
      })
    }
    console.log(`Deposits minus expired ones: ${JSON.stringify(pendingDeposits)}`)

    // TODO: Use real SQL tables here to avoid ugly race conditions -.-
    // For now, add any new deposits that were submitted while we were checking balances above
    const newDeposits = JSON.parse(await store.get('pendingDeposits'))
      .filter(dep => !pendingDeposits.map(dep => dep.user).includes(dep.user))
    console.log(`New deposits: ${JSON.stringify(newDeposits)}`)
    console.log(`Pending deposits: ${JSON.stringify(pendingDeposits)}`)
    /*
    await store.set('pendingDeposits', JSON.stringify({
      ...pendingDeposits,
      ...newDeposits,
    }))
    */

  }, 5 * 1000)  
}

module.exports = { watchPendingDeposits }
