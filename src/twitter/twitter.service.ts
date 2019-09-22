import { Injectable } from '@nestjs/common';
import { OAuth } from 'oauth';
import * as qs from 'qs';

import { ConfigService } from '../config/config.service';

import { TwitterClient } from './twitter.client';
import { Twitter } from './client';

/*
const bohendo_id = '259539164'
const tipdai_id = '1154313992141099008'
const tipdai_reborn_id = '1167103783056367616'
*/

@Injectable()
export class TwitterService {
  private twitterApp: any;
  private twitterBot: any;
  private twitterDev: any;
  private webookId: string | undefined;

  public authUrl: string | undefined;
  public botId: string;

  constructor(private readonly config: ConfigService) {
    this.twitterDev = new TwitterClient(this.config.twitterDev);
    this.twitterApp = new TwitterClient(this.config.twitterApp);
    if (!config.twitterBot.accessToken) {
      console.log(`Bot credentials not found, requesting a new access token..`);
      this.botLogin();
    } else {
      this.twitterBot = new TwitterClient(this.config.twitterBot);
      this.botId = this.config.twitterBotUserId;
      this.subscribe(this.botId);
    }
  }

  public botLogin = async () => {
    const res = await this.twitterApp.requestToken();
    const data = qs.parse(res);
    console.log(`Got token data: ${JSON.stringify(data)}`);
    const baseUrl = 'https://api.twitter.com/oauth/authorize';
    this.authUrl = `${baseUrl}?oauth_token=${data.oauth_token}`;
    console.log(`Login at: ${this.authUrl}`);
    return this.authUrl;
  }

  // Third step of 3-leg oauth (2nd step is the user clicking the authUrl)
  public connectBot = async (consumer_key, token, verifier): Promise<void> => {
    this.authUrl = undefined; // this url has been used & can't be used again
    const res = await this.twitterApp.getAccessToken({
      oauth_consumer_key: consumer_key,
      oauth_token: token,
      oauth_verifier: verifier,
    });
    const data = qs.parse(res);
    console.log(`Authentication Success!`);
    console.log(`Got access tokens for ${data.screen_name}`);
    console.log(`Access tokens (You should save these for later):`);
    console.log(`TWITTER_BOT_ACCESS_SECRET=${data.oauth_token_secret}`);
    console.log(`TWITTER_BOT_ACCESS_TOKEN=${data.oauth_token}`);
    console.log(`TWITTER_BOT_USER_ID=${data.user_id}`);
    this.botId = data.user_id;
    this.twitterBot = new TwitterClient({
      ...this.config.twitterBot,
      accessToken: data.oauth_token,
      accessSecret: data.oauth_token_secret,
    });
    console.log(`Twitter bot successfully connected!`);
    await this.subscribe(this.botId);
    console.log(`Account activity subscription successfully configured!`);
    return;
  }

  public subscribe = async (botId) => {
    const webhooks = await this.twitterApp.getWebhooks();
    console.log(`Got webhooks: ${JSON.stringify(webhooks, null, 2)}`);
    const subscriptions = await this.twitterDev.getSubscriptions();
    console.log(`Got subscriptions: ${JSON.stringify(subscriptions, null, 2)}`);
    if (subscriptions.subscriptions.find(e => e.user_id === botId)) {
      console.log(`Already subscribed to user ${botId}. We're good to go!`);
      return;
    }
    console.log(`Ok let's try to remove the old webhook subscriptions`);
    // 2. Remove all webhook subscriptions
    await webhooks.environments.forEach(async env => env.webhooks.forEach(async webhook => {
      console.log(`Unsubscribing from ${env.environment_name} webhook: ${webhook.id}..`);
      const delRes = await this.twitterBot.removeWebhook(webhook.id);
      console.log(`Unsubscribed successfully! ${JSON.stringify(delRes)}`);
    }));
    console.log(`Done unsubscribing, time to do some subscribing`);
    const newWebhook = await this.twitterApp.createWebhook();
    console.log(`Created webhook: ${JSON.stringify(newWebhook, null, 2)}`);
    // 3. Create a new subscription
    const newSubscription = await this.twitterBot.createSubscription();
    console.log(`Activated subscription: ${JSON.stringify(newSubscription, null, 2)}`);
    const crcRes = await this.triggerCRC();
    console.log(`CRC Result: ${crcRes}`);
    return(newSubscription);
  }

  public triggerCRC = async () => {
    await this.twitterApp.triggerCRC(this.webookId);
  }

  public tweet = async (status) => {
    const res = this.twitterBot.tweet(status);
    console.log(`Sent tweet: ${JSON.stringify(res, null, 2)}`);
    return res;
  }

  public getUser = async (screen_name) => {
    const res = await this.twitterBot.getUser(screen_name);
    console.log(`Got user: ${JSON.stringify(res, null, 2)}`);
    return res;
  }

  public getMentions = async (options) => {
    const defaults = { count: '5', trim_user: true, include_entities: true };
    const res = await this.twitterBot.getMentions({ ...defaults, ...options });
    const mentions = res.map(tweet => tweet.text);
    console.log(`Got mentions: ${JSON.stringify(mentions, null, 2)}`);
    return mentions;
  }

  public sendDM = async (recipient_id, message) => {
    const res = await this.twitterBot.sendDM(recipient_id, message);
    console.log(`Sent DM: ${res}`);
    return res;
  }

}
