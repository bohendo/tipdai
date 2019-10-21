const connext = require('@connext/client');
const https = require('https');
const eth = require('ethers');
const axios = require('axios');

const { setupChannel } = require('./channel');
const { baseUrl, cfPath, provider } = require('./constants');

const wallet = eth.Wallet.fromMnemonic(eth.Wallet.createRandom().mnemonic, cfPath).connect(provider);

const axio = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  })
});

(async () => {

  const nonce = (await axio.get(`${baseUrl}/user/auth?address=${wallet.address}`)).data;
  console.log(`Got nonce: ${nonce}`);
  const token = `${nonce}:${await wallet.signMessage(eth.utils.arrayify(nonce))}`;
  console.log(`Got token: ${token}`);
  const user = (await axio.post(`${baseUrl}/user/auth`, {
    address: wallet.address,
    token,
  })).data;
  console.log(`User: ${JSON.stringify(user)}`);
  if (!user) { throw new Error('Sig auth failed'); }

  const { channel, paymentIds, preImages } = await setupChannel(wallet);

  console.log(`Channel all set up`);


  process.exit(0);


})()

