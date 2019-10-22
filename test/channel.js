const connext = require('@connext/client');
const eth = require('ethers');

const { store } = require('./store');
const { ethProviderUrl, nodeUrl, provider, sugarDaddy } = require('./constants');

const { AddressZero } = eth.constants;
const { hexlify, parseEther, randomBytes } = eth.utils;

const setupChannel = async (wallet) => {
  console.log(`Creating a channel..`);
  const channel = await connext.connect({
    ethProviderUrl,
    logLevel: 2,
    mnemonic: wallet.mnemonic,
    nodeUrl,
    store,
  });
  const channelAvailable = async () => {
    const channelInfo = await channel.getChannel();
    return channelInfo && channelInfo.available;
  };
  while (!(await channelAvailable())) {
    await new Promise((res) => setTimeout(() => res(), 1 * 1000));
  }
  console.log(`Channel is ready & available!`);

  const assetId = channel.config.contractAddresses.Token
  await channel.addPaymentProfile({
    amountToCollateralize: parseEther("0.1").toString(),
    assetId: AddressZero,
    minimumMaintainedCollateral: parseEther("0.01").toString(),
  });
  await channel.requestCollateral(AddressZero);
  await channel.addPaymentProfile({
    amountToCollateralize: parseEther("10").toString(),
    assetId,
    minimumMaintainedCollateral: parseEther("5").toString(),
  });
  await channel.requestCollateral(assetId);

  console.log(`Depositing some money...`);
  let tx
  tx = await sugarDaddy.sendTransaction({ to: wallet.address, value: parseEther('0.12') });
  await provider.waitForTransaction(tx.hash);
  await channel.deposit({ amount: parseEther('0.1') });

  const swapRate = await channel.getLatestSwapRate(AddressZero, assetId);
  console.log(`Swapping eth for tokens at rate: ${swapRate}`);
  const swapRes = await channel.swap({
    amount: parseEther('0.05').toString(),
    fromAssetId: AddressZero,
    swapRate: swapRate.toString(),
    toAssetId: assetId,
  });
  console.log(`Generating 3 linked payments..`);
  const amount = parseEther('0.1').toString()
  const conditionType = "LINKED_TRANSFER";
  const randHash = () => hexlify(randomBytes(32));
  const paymentIds = [randHash(), randHash(), randHash()];
  const secrets = [randHash(), randHash(), randHash()];
  await channel.conditionalTransfer({
    amount,
    assetId,
    conditionType,
    paymentId: paymentIds[0],
    preImage: secrets[0],
  });
  await channel.conditionalTransfer({
    amount,
    assetId,
    conditionType,
    paymentId: paymentIds[1],
    preImage: secrets[1],
  });
  await channel.conditionalTransfer({
    amount,
    assetId,
    conditionType,
    paymentId: paymentIds[2],
    preImage: secrets[2],
  });

  return { channel, paymentIds, secrets }
}

module.exports = { setupChannel }
