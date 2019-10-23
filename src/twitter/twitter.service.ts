import { Injectable } from '@nestjs/common';
import { OAuth } from 'oauth';
import * as qs from 'qs';

import { ConfigService } from '../config/config.service';
import { UserRepository } from '../user/user.repository';
import { User } from '../user/user.entity';

import { Twitter } from './twitter.client';

/*
const bohendo_id = '259539164'
const tipdai_id = '1154313992141099008'
const tipfakedai_id = '1167103783056367616'
*/

@Injectable()
export class TwitterService {
  private invalid: boolean = false;
  private twitterApp: any;
  private twitterBot: any;
  private twitterDev: any;
  private webhookId: string | undefined;
  private user: Promise<User> | undefined;

  public authUrl: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly userRepo: UserRepository,
  ) {
    if (!this.config.twitterDev.consumerKey || !this.config.twitterDev.consumerSecret) {
      console.warn(`[Twitter] Missing consumer token and/or secret, twitter stuff won't work.`);
      this.invalid = true;
    } else {
      this.twitterDev = new Twitter(this.config.twitterDev);
      this.twitterApp = new Twitter(this.config.twitterApp);
      if (!config.twitterBot.accessToken) {
        console.log(`Bot credentials not found, requesting a new access token..`);
        this.botLogin();
      } else {
        this.twitterBot = new Twitter(this.config.twitterBot);
        this.subscribe(this.config.twitterBotUserId);
        this.getUser();
      }
    }
  }

  public getUser = async (): Promise<User> => {
    if (!this.user) {
      const screenName = (await this.getUserById(this.config.twitterBotUserId)).screen_name;
      this.user = this.userRepo.getTwitterUser(this.config.twitterBotUserId, screenName);
      console.log(`Got bot user: ${JSON.stringify(await this.user)}`);
    }
    return await this.user;
  }

  public triggerCRC = async (): Promise<boolean> => {
    if (this.invalid) { return; }
    try {
      await this.twitterApp.triggerCRC(this.webhookId);
      return true;
    } catch (e) {
      console.warn(e);
      return false;
    }
  }

  public tweet = async (status: string, replyTo?: string) => {
    if (this.invalid) { return; }
    return await this.twitterBot.tweet(status, replyTo);
  }

  public getUserById = async (user_id) => {
    if (this.invalid) { return; }
    return await this.twitterBot.getUser(user_id);
  }

  public getUserByName = async (screen_name) => {
    if (this.invalid) { return; }
    return await this.twitterBot.getUser(screen_name);
  }

  public getMentions = async (options) => {
    if (this.invalid) { return; }
    const defaults = { count: '5', trim_user: true, include_entities: true };
    const res = await this.twitterBot.getMentions({ ...defaults, ...options });
    return res.map(tweet => tweet.text);
  }

  public sendDM = async (recipient_id, message) => {
    if (this.invalid) { return; }
    return await this.twitterBot.sendDM(recipient_id, message);
  }

  public botLogin = async () => {
    if (this.invalid) { return; }
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
    if (this.invalid) { return; }
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
    console.log(`TIPDAI_TWITTER_BOT_ACCESS_SECRET=${data.oauth_token_secret}`);
    console.log(`TIPDAI_TWITTER_BOT_ACCESS_TOKEN=${data.oauth_token}`);
    console.log(`TIPDAI_TWITTER_BOT_USER_ID=${data.user_id}`);
    this.twitterBot = new Twitter({
      ...this.config.twitterBot,
      accessToken: data.oauth_token,
      accessSecret: data.oauth_token_secret,
    });
    console.log(`Twitter bot successfully connected!`);
    await this.subscribe(data.user_id);
    console.log(`Account activity subscription successfully configured!`);
    await this.getUser();
    return;
  }

  public subscribe = async (botId) => {
    if (this.invalid) { return; }
    const webhooks = await this.twitterApp.getWebhooks();
    const subscriptions = await this.twitterDev.getSubscriptions();
    console.log(`Got subscriptions: ${JSON.stringify(subscriptions.subscriptions)}`);
    let crcRes;
    if (subscriptions.subscriptions.find(e => e.user_id === botId)) {
      this.webhookId = webhooks.environments[0].webhooks[0].id;
      crcRes = await this.triggerCRC();
      console.log(`CRC succeeded: ${crcRes}`);
      console.log(`Already subscribed to user ${botId}. We're good to go!`);
      return;
    }
    console.log(`Ok let's try to remove the old webhook subscriptions`);
    // 2. Remove all webhook subscriptions
    await Promise.all(webhooks.environments.map(async env =>
      Promise.all(env.webhooks.map(async webhook => {
        console.log(`Unsubscribing from ${env.environment_name} webhook: ${webhook.id}..`);
        return await this.twitterBot.removeWebhook(webhook.id);
      })),
    ));
    console.log(`Done unsubscribing, time to do some subscribing`);
    const newWebhook = await this.twitterApp.createWebhook();
    console.log(`Created webhook: ${JSON.stringify(newWebhook, null, 2)}`);
    // 3. Create a new subscription
    const newSubscription = await this.twitterBot.createSubscription();
    console.log(`Activated subscription: ${JSON.stringify(newSubscription, null, 2)}`);
    this.webhookId = newWebhook.id;
    crcRes = await this.triggerCRC();
    console.log(`CRC succeeded: ${crcRes}`);
    return(newSubscription);
  }

}
