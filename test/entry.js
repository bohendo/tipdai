const connext = require('@connext/client');
const https = require('https');
const eth = require('ethers');
const axios = require('axios');

const paymentIdRegex = /paymentId=(0x[0-9a-fA-F]{64})/;
const secretRegex = /secret=(0x[0-9a-fA-F]{64})/;
const { setupChannel } = require('./channel');
const { baseUrl, cfPath, provider, screenName } = require('./constants');

const sender = eth.Wallet.fromMnemonic(eth.Wallet.createRandom().mnemonic, cfPath).connect(provider);
const recipient = eth.Wallet.fromMnemonic(eth.Wallet.createRandom().mnemonic, cfPath).connect(provider);

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
  let nonce

  nonce = (await axio.get(`${baseUrl}/user/auth?address=${sender.address}`)).data;
  const senderToken = `${nonce}:${await sender.signMessage(eth.utils.arrayify(nonce))}`;
  console.log(`Got sender token: ${senderToken}`);
  nonce = (await axio.get(`${baseUrl}/user/auth?address=${recipient.address}`)).data;
  const recipientToken = `${nonce}:${await recipient.signMessage(eth.utils.arrayify(nonce))}`;
  console.log(`Got recipient token: ${recipientToken}`);
  const senderUser = (await axio.post(`${baseUrl}/user/auth`, {
    address: sender.address,
    token: senderToken,
  })).data;
  console.log(`Sender: ${JSON.stringify(senderUser)}`);
  if (!senderUser) { throw new Error('Sig auth failed'); }
  const recipientUser = (await axio.post(`${baseUrl}/user/auth`, {
    address: recipient.address,
    token: recipientToken,
  })).data;
  console.log(`Recipient: ${JSON.stringify(recipientUser)}`);

  const { channel, paymentIds, secrets } = await setupChannel(sender);
  let res

  console.log(`Channel all set up`);

  res = (await axio.post(`${baseUrl}/message/private`, {
    address: sender.address ,
    message: `balance`,
    token: senderToken,
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/\$0.00/i)) { throw new Error(`Balance should start at zero`); }

  res = (await axio.post(`${baseUrl}/message/private`, {
    address: sender.address ,
    message: ``,
    token: senderToken,
    urls: [`${baseUrl}/redeem?paymentId=${paymentIds[0]}&secret=${secrets[0]}`],
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/has been redeemed/i)) { throw new Error(`Deposit should be accepted`); }

  res = (await axio.post(`${baseUrl}/message/private`, {
    address: sender.address ,
    message: `balance`,
    token: senderToken,
  })).data;
  console.log(`\n==========\n${res}`);
  if (res.match(/\$0.00/i)) { throw new Error(`Balance wasn't updated after deposit`); }

  res = (await axio.post(`${baseUrl}/message/public`, {
    address: sender.address ,
    message: `@${screenName} send @user $0.11`,
    recipientId: recipientUser.id,
    token: senderToken,
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/enough balance/i)) { throw new Error(`Tip should have been rejected`); }

  res = (await axio.post(`${baseUrl}/message/public`, {
    address: sender.address ,
    message: `@${screenName} send @user $0.05`,
    recipientId: recipientUser.id,
    token: senderToken,
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/success!/i)) { throw new Error(`Tip should succeed`); }

  res = (await axio.post(`${baseUrl}/message/private`, {
    address: recipient.address ,
    message: `balance`,
    token: recipientToken,
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/\$0.05/i)) { throw new Error(`Recipient balance should have tip amount added`); }

  res = (await axio.post(`${baseUrl}/message/private`, {
    address: sender.address ,
    message: `balance`,
    token: senderToken,
  })).data;
  console.log(`\n==========\n${res}`);
  if (!res.match(/\$0.05/i)) { throw new Error(`Sender balance should have tip amount subtracted`); }

  res = await channel.resolveCondition({
    conditionType: 'LINKED_TRANSFER',
    paymentId: res.match(paymentIdRegex)[1],
    preImage: res.match(secretRegex)[1],
  });
  console.log(`\n==========\n${JSON.stringify(res)}`);

  res = (await axio.post(`${baseUrl}/message/public`, {
    address: sender.address ,
    message: `@${screenName} send @user $0.05`,
    recipientId: 3,
    token: senderToken,
  })).data;
  console.log(`\n==========\n${res}`);

  console.log(`\nTests completed successfully :)`);

  process.exit(0);

})()

