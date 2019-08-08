const connext = require('@connext/client')
const eth = require('ethers')
const tokenArtifacts = require('openzeppelin-solidity/build/contracts/ERC20Mintable.json')

const config = require('./config')
const store = require('./store')

const { formatEther, parseEther } = eth.utils
const { AddressZero, Zero } = eth.constants

var channel
const getChannel = async () => {
  if (channel) { return channel }
  await store.firstConnection

  await config.connext.storeFactory.connectDb()

  channel = await connext.connect({
    ...config.connext,
    store: config.connext.storeFactory.createStoreService('CF_NODE'),
  });
  console.log(`Client created successfully!`);
  console.log(` - Public Identifier: ${channel.publicIdentifier}`);
  console.log(` - Account multisig address: ${channel.opts.multisigAddress}`);
  console.log(` - Free balance address: ${channel.freeBalanceAddress}`);

  // Save tokenAddress
  const tokenAddress = (await channel.config()).contractAddresses.Token;
  await store.set('tokenAddress', tokenAddress)
  console.log(` - Token address: ${tokenAddress}`);

  // Save & subscribe to swapRate
  const swapRate = formatEther(await channel.getLatestSwapRate(AddressZero, tokenAddress));
  await store.set('swapRate', swapRate)
  channel.subscribeToSwapRates(AddressZero, tokenAddress, async (res) => {
    if (!res || !res.swapRate) return;
    const oldRate = await store.get('swapRate')
    console.log(`Got swap rate upate: ${oldRate} -> ${formatEther(res.swapRate)}`);
    store.set('swapRate', formatEther(swapRate))
  })
  console.log(` - Swap rate: ${swapRate}`)

  console.log(`Creating a payment profile..`)
  await channel.addPaymentProfile({
    amountToCollateralize: parseEther("10").toString(),
    minimumMaintainedCollateral: parseEther("5").toString(),
    tokenAddress: tokenAddress,
  });

  const freeTokenBalance = await channel.getFreeBalance(tokenAddress);

  const hubFreeBalanceAddress = Object.keys(freeTokenBalance).filter(addr => addr.toLowerCase() !== channel.freeBalanceAddress)[0]
  if (freeTokenBalance[hubFreeBalanceAddress].eq(Zero)) {
    console.log(`Requesting collateral for token ${tokenAddress}`)
    await channel.requestCollateral(tokenAddress);
  } else {
    console.log(`Hub has collateralized us with ${formatEther(freeTokenBalance[hubFreeBalanceAddress])} tokens`)
  }

  const botFreeBalance = freeTokenBalance[channel.freeBalanceAddress]
  // TODO: check bot's token & eth balance first
  if (botFreeBalance.eq(Zero)) {
    console.log(`Bot no tokens in its channel, depositing 10 now`)
    await channel.deposit({ amount: parseEther('10'), assetId: tokenAddress })
  } else {
    console.log(`Bot has a free balance of ${formatEther(botFreeBalance)} tokens`)
  }

  return channel;
}

module.exports = { getChannel }
