require('dotenv').config();
const eth = require('ethers');

const env = (key) => process.env[`TIPDAI_${key.toUpperCase()}`];

const baseUrl = 'https://localhost';
const cfPath = "m/44'/60'/0'/25446"
const ethProviderUrl = env('eth_provider') || 'http://localhost:8545';
const nodeUrl = env('payment_hub') || 'nats://localhost:4222';
const provider = new eth.providers.JsonRpcProvider(ethProviderUrl);
const screenName = 'TipDai';
const sugarDaddy = eth.Wallet.fromMnemonic('candy maple cake sugar pudding cream honey rich smooth crumble sweet treat').connect(provider);

module.exports = {
  baseUrl,
  cfPath,
  ethProviderUrl,
  nodeUrl,
  provider,
  screenName,
  sugarDaddy,
}
