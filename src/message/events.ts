import { ethers as eth } from 'ethers';
import { config } from './config';
import { getChannel } from './channel';
import { db } from './db';
import { twitter } from './twitter';

const botId = '1154313992141099008';
const { formatEther, parseEther } = eth.utils;

/*
Got a message event: {
  "type": "message_create",
  "id": "1157728808532709380",
  "created_timestamp": "1564859032172",
  "message_create": {
    "target": {
      "recipient_id": "1154313992141099008"
    },
    "sender_id": "259539164",
    "message_data": {
      "text": "deposit",
      "entities": {
        "hashtags": [],
        "symbols": [],
        "user_mentions": [],
        "urls": []
      }
    }
  }
}
*/

const handleMessage = async event => {
  const sender = event.message_create.sender_id;
  const message = event.message_create.message_data.text;
  if (sender === botId) return; // ignore messages sent by the bot
  console.log(`Processing message event: ${JSON.stringify(event, null, 2)}`);

  const tokenAddress = await db.get('tokenAddress');
  let swapRate = (await db.get(`swapRate`)) as any;
  console.log(`swap rate: ${swapRate}`);
  const maxDeposit = formatEther(
    parseEther(parseEther('10').toString()).div(parseEther(swapRate)),
  );
  console.log(`maxDeposit: ${maxDeposit}`);

  let user = ((await db.get(`user-${sender}`)) as any) as any;
  if (!user) {
    user = { hasBeenWelcomed: true };
    await db.set(`user-${sender}`, JSON.stringify(user));
  } else {
    user = JSON.parse(user);
  }

  if (message.match(/^balance/i) || message.match(/^refresh/i)) {
    if (user.balance) {
      if (!user.linkPayment) {
        const channel = await getChannel();
        console.log(`Attempting to create link payment`);
        const link = await channel.conditionalTransfer({
          amount: parseEther(user.balance),
          assetId: tokenAddress,
          conditionType: 'LINKED_TRANSFER',
        });
        console.log(`Link: ${JSON.stringify(link)}`);
        user.linkPayment = link;
        await db.set(`user-${sender}`, JSON.stringify(user));
      } else {
        console.log(`Link: ${JSON.stringify(user.linkPayment)}`);
      }
      return await twitter.sendDM(
        sender,
        `Your balance is $${user.balance} (kovan) DAI.\n\nLink payment id: ${user.linkPayment.paymentId}\n\nSecret: ${user.linkPayment.preImage}`,
      );
    }
    return await twitter.sendDM(sender, `Your balance is $0.00`);
  }

  if (message.match(/^deposit/i)) {
    let pendingDeposits = (await db.get('pendingDeposits')) as any;
    let depositAddress;
    if (!pendingDeposits) {
      pendingDeposits = [];
      depositAddress = config.getWallet(1).address;
    } else {
      pendingDeposits = JSON.parse(pendingDeposits);
      const prevDeposit = pendingDeposits.filter(dep => dep.user === sender);
      if (prevDeposit[0]) {
        depositAddress = prevDeposit[0].address;
        pendingDeposits = pendingDeposits.filter(dep => dep.user !== sender);
      } else {
        depositAddress = config.getWallet(pendingDeposits.length + 1).address;
      }
    }
    await db.set(
      'pendingDeposits',
      JSON.stringify([
        {
          address: depositAddress,
          oldBalance: formatEther(
            await config.provider.getBalance(depositAddress),
          ),
          startTime: Date.now(),
          user: sender,
        },
        ...pendingDeposits,
      ]),
    );
    // TODO: mention max deposit
    await twitter.sendDM(
      sender,
      `Send max of ${maxDeposit} kovan ETH to the following address to deposit. This address will be available for deposits for 10 minutes. If you send a transaction with low gas, reply "wait" and the timeout will be extended.`,
    );
    await twitter.sendDM(sender, depositAddress);
    return;
  }

  if (message.match(/^wait/i)) {
    let pendingDeposits = (await db.get('pendingDeposits')) as any;
    if (!pendingDeposits) {
      return;
    } // No prevDeposit, ignore
    pendingDeposits = JSON.parse(pendingDeposits);
    const prevDeposit = pendingDeposits.filter(dep => dep.user === sender);
    if (!prevDeposit[0]) {
      return;
    } // No prevDeposit, ignore
    pendingDeposits = pendingDeposits.filter(dep => dep.user !== sender);
    await db.set(
      'pendingDeposits',
      JSON.stringify([
        {
          startTime: Date.now(),
          ...prevDeposit,
        },
        ...pendingDeposits,
      ]),
    );
    await twitter.sendDM(
      sender,
      `Timeout extended, you have 10 more minutes to deposit up to ${maxDeposit} kovan ETH to the below address. If you want to extend again, reply "wait" as many times as needed.`,
    );
    await twitter.sendDM(sender, prevDeposit[0].address);
    return;
  }

  if (message.match(/^tip/i)) {
    let tips = (await db.get(`unprocessedTips`)) as any;
    if (!tips) {
      tips = [];
    } else {
      tips = JSON.parse(tips);
    }
    console.log(`Processing tips: ${JSON.stringify(tips)}`);
    await db.set('unprocessedTips', JSON.stringify(tips));
  }
};

const handleTweet = async tweet => {
  console.log(`Got a tweet event: ${JSON.stringify(tweet, null, 2)}`);
  const message = tweet.text;
  const fromUser = tweet.user.id_str;
  const mentionedUsers = tweet.entities.user_mentions.filter(
    ment => ment.id_str !== botId,
  );
  let amountMatch = message.match(/\$[0-9]\.?[0-9]*/);
  if (!mentionedUsers.length || !amountMatch) {
    // Improper tweet, ignore
    return;
  }
  const amount = amountMatch[0].replace('$', '');
  const toUser = mentionedUsers[0].id_str;
  let tips = (await db.get(`tipsArchive`)) as any;
  if (!tips) {
    tips = [];
  } else {
    tips = JSON.parse(tips);
  }
  tips.push({
    amount,
    fromUser,
    message,
    toUser,
    tweetId: tweet.id_str,
  });
  console.log(`Archived tips: ${JSON.stringify(tips, null, 2)}`);
  db.set('tipsArchive', JSON.stringify(tips));

  let sender = (await db.get(`user-${fromUser}`)) as any;
  if (!sender) {
    sender = { id: sender };
  } else {
    sender = JSON.parse(sender);
  }

  if (!sender.balance || parseEther(sender.balance).lt(parseEther(amount))) {
    console.log(`sender balance ${sender.balance} is lower than ${amount}`);
    return; // TODO: twitter.tweet('hey sender you need more money')
  }

  let recipient = (await db.get(`user-${toUser}`)) as any;
  if (!recipient) {
    recipient = { id: toUser };
  } else {
    recipient = JSON.parse(recipient);
  }
  if (!recipient.balance) {
    recipient.balance = amount;
  } else {
    recipient.balance = formatEther(
      parseEther(recipient.balance).add(parseEther(amount)),
    );
  }
  console.log(`Recipient: ${JSON.stringify(recipient, null, 2)}`);
  await db.set(`user-${toUser}`, JSON.stringify(recipient));
};

/*
tweet event = {
  "created_at": "Sun Aug 04 04:04:39 +0000 2019",
  "id": 1157864903912255500,
  "id_str": "1157864903912255488",
  "text": "@shivhendo Here, have some fake $DAI :)\n\n@TipDai $1",
  "truncated": false,
  "in_reply_to_status_id": null,
  "in_reply_to_status_id_str": null,
  "in_reply_to_user_id": 799775632678916100,
  "in_reply_to_user_id_str": "799775632678916096",
  "in_reply_to_screen_name": "shivhendo",
  "user": {
    "id": 259539164,
    "id_str": "259539164",
    "name": "Bo",
    "screen_name": "bohendo",
    "location": "Earth",
    "url": "http://bohendo.com",
    "description": "Devops-focused engineer helping @ConnextNetwork bring p2p micropayments to Ethereum",
    "translator_type": "none",
    "protected": false,
    "verified": false,
    "followers_count": 196,
    "friends_count": 99,
    "listed_count": 2,
    "favourites_count": 3863,
    "statuses_count": 581,
    "created_at": "Wed Mar 02 03:08:08 +0000 2011",
    "utc_offset": null,
    "time_zone": null,
    "geo_enabled": false,
    "lang": null,
    "contributors_enabled": false,
    "is_translator": false,
    "profile_background_color": "000000",
    "profile_background_image_url_https": "https://abs.twimg.com/images/themes/theme5/bg.gif",
    "profile_background_tile": false,
    "profile_link_color": "0B75C0",
    "profile_sidebar_border_color": "000000",
    "profile_sidebar_fill_color": "000000",
    "profile_text_color": "000000",
    "profile_use_background_image": false,
    "profile_banner_url": "https://pbs.twimg.com/profile_banners/259539164/1485059643",
    "default_profile": false,
    "default_profile_image": false,
    "following": null,
    "follow_request_sent": null,
    "notifications": null
  },
  "geo": null,
  "coordinates": null,
  "place": null,
  "contributors": null,
  "is_quote_status": false,
  "quote_count": 0,
  "reply_count": 0,
  "retweet_count": 0,
  "favorite_count": 0,
  "entities": {
    "hashtags": [],
    "urls": [],
    "user_mentions": [
      {
        "screen_name": "shivhendo",
        "name": "Shivani",
        "id": 799775632678916100,
        "id_str": "799775632678916096",
        "indices": [
          0,
          10
        ]
      },
      {
        "screen_name": "TipDai",
        "name": "Dai Tip Bot",
        "id": 1154313992141099000,
        "id_str": "1154313992141099008",
        "indices": [
          41,
          48
        ]
      }
    ],
    "symbols": [
      {
        "text": "DAI",
        "indices": [
          32,
          36
        ]
      }
    ]
  },
  "favorited": false,
  "retweeted": false,
  "filter_level": "low",
  "lang": "en",
  "timestamp_ms": "1564891479839"
}
*/

export { handleMessage, handleTweet };
