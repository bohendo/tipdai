import { Injectable } from '@nestjs/common';

import { ConfigService } from '../config/config.service';

import { Twitter } from './client';

@Injectable()
export class TwitterService {
  private twitter: Twitter;
  private twitterDev: Twitter;

  constructor(private readonly config: ConfigService) {
    this.twitter = new Twitter(this.config.twitterBot);
    this.twitterDev = new Twitter(this.config.twitterDev);
  }

  private handleError = reject => (error, response, body) => {
    console.error(`Failure!`);
    console.error(`body: ${body}`);
    return reject(error);
  }

  public getSubscriptions = () => {
    return new Promise((resolve, reject) => {
      twitterDev.getCustomApiCall(
        `/account_activity/all/${config.env}/subscriptions/list.json`,
        {},
        handleError(reject),
        res => {
          console.log(`Success!`);
          const data = JSON.parse(res);
          console.log(`Got subscriptions: ${JSON.stringify(data, null, 2)}`);
          resolve(data);
        },
      );
    });
  }

  public subscribe = () => {
    return new Promise((resolve, reject) => {
      twitter.postCustomApiCall(
        `/account_activity/all/${config.env}/subscriptions.json`,
        JSON.stringify({}),
        handleError(reject),
        res => {
          console.log(`Success!`);
          const data = JSON.parse(res);
          console.log(`Subscribed: ${JSON.stringify(data, null, 2)}`);
          resolve(data);
        },
      );
    });
  }

  public activateWebhook = () => {
    return new Promise((resolve, reject) => {
      twitter.activateWebhook(
        {
          env: config.env,
          url: config.webhookUrl,
        },
        handleError(reject),
        res => {
          console.log(`Success!`);
          const data = JSON.parse(res);
          console.log(`Triggered CRC: ${JSON.stringify(data, null, 2)}`);
          resolve(data);
        },
      );
    });
  }

  public triggerCRC = () => {
    return new Promise((resolve, reject) => {
      const { env, webhookId } = config;
      twitter.triggerCRC({ env, webhookId }, handleError(reject), res => {
        console.log(`Success fully triggered a CRC!`);
        resolve();
      });
    });
  }

  public tweet = status => {
    return new Promise((resolve, reject) => {
      twitter.postTweet({ status }, handleError(reject), res => {
        console.log(`Success!`);
        const data = JSON.parse(res);
        console.log(`Sent tweet: ${JSON.stringify(data, null, 2)}`);
        resolve(data);
      });
    });
  }

  public getMentions = options => {
    return new Promise((resolve, reject) => {
      const defaults = { count: '5', trim_user: true, include_entities: true };
      twitter.getMentionsTimeline(
        { ...defaults, ...options },
        handleError(reject),
        res => {
          console.log(`Success!`);
          const data = JSON.parse(res);
          const mentions = data.map(tweet => tweet.text);
          console.log(`Got mentions: ${JSON.stringify(mentions, null, 2)}`);
          resolve(data);
        },
      );
    });
  }

  public getUser = (screen_name) => {
    return new Promise((resolve, reject) => {
      twitter.getCustomApiCall(
        '/users/lookup.json',
        { screen_name },
        handleError(reject),
        res => {
          console.log(`Success!`);
          const data = JSON.parse(res);
          console.log(`Got user: ${JSON.stringify(data, null, 2)}`);
          resolve(data);
        },
      );
    });
  }

  public sendDM = (recipient_id, message) => {
    return new Promise((resolve, reject) => {
      twitter.postCustomApiCall(
        '/direct_messages/events/new.json',
        JSON.stringify({
          event: {
            type: 'message_create',
            message_create: {
              target: {
                recipient_id,
              },
              message_data: {
                text: message,
              },
            },
          },
        }),
        handleError(reject),
        data => {
          console.log(`Success!`);
          console.log(`Sent DM: ${data}`);
          resolve(data);
        },
      );
    });
  }

  public authorize = () => {
    return new Promise((resolve, reject) => {
      twitter.authorize(
        { oauthCallback: 'https://tipdai.bohendo.com' },
        handleError(reject),
        res => {
          console.log(`Success!`);
          const data = qs.parse(res);
          console.log(`Got auth data: ${JSON.stringify(data)}`);
          const baseUrl = 'https://api.twitter.com/oauth/authorize';
          console.log(`Login at: ${baseUrl}?oauth_token=${data.oauth_token}`);
          resolve(data);
        },
      );
    });
  }

  public getAccessToken = (consumer_key, token, verifier) => {
    return new Promise((resolve, reject) => {
      twitter.getAccessToken(
        {
          oauth_consumer_key: consumer_key,
          oauth_token: token,
          oauth_verifier: verifier,
        },
        handleError(reject),
        res => {
          console.log(`Success!`);
          const data = qs.parse(res);
          console.log(`Got access token: ${JSON.stringify(data)}`);
          resolve(data);
        },
      );
    });
  }

}
