const connext = require("@connext/client");
const { getFileStore } = require("@connext/store");
const { ConditionalTransferTypes } = require("@connext/types");
const eth = require("ethers");
require("sqlite3");

const { store } = require('./store');
const { ethProviderUrl, nodeUrl, provider, sugarDaddy } = require('./constants');

const { AddressZero } = eth.constants;
const { hexlify, parseEther, randomBytes } = eth.utils;

const setupChannel = async (wallet) => {
  console.log(`Creating a channel..`);
  const channel = await connext.connect({
    ethProviderUrl,
    logLevel: 2,
    signer: wallet.privateKey,
    nodeUrl,
    store: getFileStore(".channel-store"),
  });
  console.log(`Channel is ready!`);

  const assetId = channel.config.contractAddresses.Token

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
  const amount = parseEther('0.1').toString()
  const conditionType = ConditionalTransferTypes.LinkedTransfer;
  const randHash = () => hexlify(randomBytes(32));
  const paymentIds = [randHash(), randHash(), randHash()];
  const secrets = [randHash(), randHash(), randHash()];
  console.log(`Generating 3 linked payments: ${JSON.stringify(paymentIds)}`);
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
