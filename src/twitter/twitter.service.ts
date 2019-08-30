import { Injectable } from '@nestjs/common';
import * as qs from 'qs';

import { ConfigService } from '../config/config.service';

import { Twitter } from './client';

/*
const bohendo_id = '259539164'
const tipdai_id = '1154313992141099008'
const tipdai_reborn_id = '1167103783056367616'
*/

@Injectable()
export class TwitterService {
  private twitter: any;
  private twitterApp: any;
  private webookId: string | undefined;
  public authUrl: string | undefined;
  public botId: string;

  constructor(private readonly config: ConfigService) {
    this.twitterApp = new Twitter(this.config.twitterApp);
    if (!config.twitterBot.accessToken) {
      console.log(`Bot credentials not found, requesting a new access token..`);
      this.requestToken();
    } else {
      console.log(`Creating twitter bot from config: ${JSON.stringify(this.config.twitterBot)}`);
      this.twitter = new Twitter(this.config.twitterBot);
      this.botId = this.config.twitterBotUserId;
      this.reSubscribe(this.botId);
    }
  }

  // First step of 3-leg oauth process
  public requestToken = () => {
    return new Promise((resolve, reject) => {
      this.twitterApp.requestToken(
        { oauthCallback: this.config.callbacks.twitter },
        this.handleError(reject),
        (res) => {
          const data = qs.parse(res);
          const baseUrl = 'https://api.twitter.com/oauth/authorize';
          this.authUrl = `${baseUrl}?oauth_token=${data.oauth_token}`;
          console.log(`Login at: ${this.authUrl}`);
          resolve(this.authUrl);
        },
      );
    });
  }

  // Third step of 3-leg oauth (2nd step is the user clicking the authUrl)
  public connectBot = (consumer_key, token, verifier): Promise<void> => {
    this.authUrl = undefined; // this url has been used & can't be used again
    return new Promise((resolve, reject) => {
      this.twitterApp.getAccessToken(
        {
          oauth_consumer_key: consumer_key,
          oauth_token: token,
          oauth_verifier: verifier,
        },
        this.handleError(reject),
        async (res) => {
          const data = qs.parse(res);
          console.log(`Authentication Success!`);
          console.log(`Got access tokens for ${data.screen_name}`);
          console.log(`Access tokens (You should save these for later):`);
          console.log(`TWITTER_BOT_ACCESS_SECRET=${data.oauth_token}`);
          console.log(`TWITTER_BOT_ACCESS_TOKEN=${data.oauth_token_secret}`);
          console.log(`TWITTER_BOT_USER_ID=${data.user_id}`);
          this.botId = data.user_id;
          this.twitter = new Twitter({
            ...this.config.twitterBot,
            accessToken: data.oauth_token,
            accessSecret: data.oauth_token_secret,
          });
          console.log(`Twitter bot successfully connected!`);
          await this.reSubscribe(this.botId);
          console.log(`Account activity subscription successfully configured!`);
          resolve();
        },
      );
    });
  }

  public reSubscribe = (botId) => {
    return new Promise((resolve, reject) => {
      // 1. Get all subscriptions
      this.twitterApp.getCustomApiCall(
        `/account_activity/all/webhooks.json`,
        {},
        this.handleError(reject),
        async (rawWebhooks) => {
          const webhooks = JSON.parse(rawWebhooks);
          console.log(`Got webhooks: ${JSON.stringify(webhooks, null, 2)}`);

          /* TODO: getting 404s and idk why
          // 2. Remove all webhook subscriptions
          await Promise.all(webhooks.environments.map(async env => {
            return Promise.all(env.webhooks.map(async wh => {
              return new Promise((res, rej) => {
                console.log(`Unsubscribing from ${env.environment_name} webhook: ${wh.id}..`);
                this.twitterApp.deleteCustomApiCall(
                  `/account_activity/all/${env.environment_name}/webhooks/${wh.id}.json`,
                  {},
                  this.handleError(rej),
                  (delRes) => {
                    console.log(`Unsubscribed successfully! ${JSON.stringify(delRes)}`);
                    res();
                  },
                );
              });
            }));
          }));
          console.log(`Done unsubscribing, time to do some subscribing`);
          */

          await this.getUser('tip_dai');

          // 3. Create a new webhook
          this.twitter.activateWebhook(
            {
              env: this.config.webhooks.twitter.env,
              url: this.config.webhooks.twitter.url,
            },
            this.handleError(reject),
            newWebhookRes => {
              console.log(`Successfully activated a new webhook!`);
              const data = JSON.parse(newWebhookRes);
              console.log(`Activated webhook: ${JSON.stringify(data, null, 2)}`);
              // 3. Create a new subscription
              this.twitter.postCustomApiCall(
                `/account_activity/all/${this.config.webhooks.twitter.env}/subscriptions.json`,
                this.handleError(reject),
                newSubscriptionRes => {
                  console.log(`Success!`);
                  const innerData = JSON.parse(newWebhookRes);
                  console.log(`Activated subscription: ${JSON.stringify(innerData, null, 2)}`);
                  resolve(data);
                },
              );
            },
          );
        },
      );
    });
  }

  public triggerCRC = () => {
    return new Promise((resolve, reject) => {
      const { env, id } = this.config.webhooks.twitter;
      this.twitter.triggerCRC({ env, webhookId: id }, this.handleError(reject), res => {
        console.log(`Success fully triggered a CRC!`);
        resolve();
      });
    });
  }

  public getSubscriptions = () => {
    return new Promise((resolve, reject) => {
      this.twitterApp.getCustomApiCall(
        `/account_activity/all/${this.config.webhooks.twitter.env}/subscriptions/list.json`,
        {},
        this.handleError(reject),
        res => {
          console.log(`Success!`);
          const data = JSON.parse(res);
          console.log(`Got subscriptions: ${JSON.stringify(data, null, 2)}`);
          resolve(data);
        },
      );
    });
  }

  public tweet = status => {
    return new Promise((resolve, reject) => {
      this.twitter.postTweet({ status }, this.handleError(reject), res => {
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
      this.twitter.getMentionsTimeline(
        { ...defaults, ...options },
        this.handleError(reject),
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
      this.twitter.getCustomApiCall(
        '/users/lookup.json',
        { screen_name },
        this.handleError(reject),
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
      this.twitter.postCustomApiCall(
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
        this.handleError(reject),
        data => {
          console.log(`Success!`);
          console.log(`Sent DM: ${data}`);
          resolve(data);
        },
      );
    });
  }

  private handleError = reject => (error, response, body) => {
    console.error(`Error ${error.statusCode}: ${error.data}!`);
    return reject(error);
  }

}
