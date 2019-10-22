const connext = require('@connext/client');
const https = require('https');
const eth = require('ethers');
const axios = require('axios');

const { setupChannel } = require('./channel');
const { baseUrl, cfPath, provider } = require('./constants');

const wallet = eth.Wallet.fromMnemonic(eth.Wallet.createRandom().mnemonic, cfPath).connect(provider);

process.on('unhandledRejection', (e) => {
  console.error(`\n${e}`);
  process.exit(1);
})

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

  const { channel, paymentIds, secrets } = await setupChannel(wallet);
  let res

  console.log(`Channel all set up`);

  res = (await axio.post(`${baseUrl}/message/private`, {
    address: wallet.address ,
    message: `balance`,
    token,
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/\$0.00/i)) { throw new Error(`Balance should start at zero`); }

  res = (await axio.post(`${baseUrl}/message/private`, {
    address: wallet.address ,
    message: ``,
    token,
    urls: [`${baseUrl}/redeem?paymentId=${paymentIds[0]}&secret=${secrets[0]}`],
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/has been redeemed/i)) { throw new Error(`Deposit should be accepted`); }

  res = (await axio.post(`${baseUrl}/message/private`, {
    address: wallet.address ,
    message: `balance`,
    token,
  })).data;
  console.log(`\n==========\n${res}`);
  if (res.match(/\$0.00/i)) { throw new Error(`Balance wasn't updated after deposit`); }

  res = (await axio.post(`${baseUrl}/message/public`, {
    address: wallet.address ,
    message: `@TipFakeDai send @user $0.11`,
    recipientId: 3,
    token,
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/enough balance/i)) { throw new Error(`Tip should have been rejected`); }

  res = (await axio.post(`${baseUrl}/message/public`, {
    address: wallet.address ,
    message: `@TipFakeDai send @user $0.05`,
    recipientId: 3,
    token,
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/success!/i)) { throw new Error(`Tip should succeed`); }

  res = (await axio.post(`${baseUrl}/message/private`, {
    address: wallet.address ,
    message: `balance`,
    token,
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/\$0.05/i)) { throw new Error(`Balance should have tip amount subtracted`); }

  process.exit(0);

})()

