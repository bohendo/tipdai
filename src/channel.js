const connext = require('@connext/client')
const eth = require('ethers')
const tokenArtifacts = require('openzeppelin-solidity/build/contracts/ERC20Mintable.json')

const config = require('./config')
const store = require('./store')

const { formatEther } = eth.utils
const { AddressZero } = eth.constants

var channel
const getChannel = async () => {
  if (channel) { return channel }
  await store.firstConnection

  await config.connext.storeFactory.connectDb()

  channel = await connext.connect({
    ...config.connext,
    store: config.connext.storeFactory.createStoreService('TipDaiBot'),
  });
  console.log(`Client created successfully!`);
  console.log(` - Public Identifier: ${channel.publicIdentifier}`);
  console.log(` - Account multisig address: ${channel.opts.multisigAddress}`);

  // Save tokenAddress
  const tokenAddress = (await channel.config()).contractAddresses.Token;
  await store.set('tokenAddress', tokenAddress)
  console.log(` - Token address: ${tokenAddress}`);

  // Save & subscribe to swapRate
  const swapRate = formatEther(await channel.getLatestSwapRate(AddressZero, tokenAddress));
  await store.set('swapRate', formatEther(swapRate))
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

  console.log(`Requesting collateral for token ${tokenAddress}`)
  await channel.requestCollateral(tokenAddress);

  return channel;
}

module.exports = { getChannel }
