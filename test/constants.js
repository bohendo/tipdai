const eth = require('ethers');

const baseUrl = 'https://localhost';
const cfPath = "m/44'/60'/0'/25446"
const ethProviderUrl = 'http://localhost:8545';
const nodeUrl = 'nats://localhost:4222';
const provider = new eth.providers.JsonRpcProvider(ethProviderUrl);
const sugarDaddy = eth.Wallet.fromMnemonic(
  'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat',
).connect(provider);

module.exports = { baseUrl, cfPath, ethProviderUrl, nodeUrl, provider, sugarDaddy }
