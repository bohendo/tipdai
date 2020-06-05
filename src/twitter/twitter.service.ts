import { Injectable } from "@nestjs/common";
import { OAuth } from "oauth";
import * as qs from "qs";

import { ConfigService } from "../config/config.service";
import { LoggerService } from "../logger/logger.service";
import { twitterTipRegex } from "../constants";
import { MessageService } from "../message/message.service";
import { UserRepository } from "../user/user.repository";
import { User } from "../user/user.entity";

import { Twitter } from "./twitter.client";

/*
const bohendo_id = '259539164'
const tipdai_id = '1154313992141099008'
const tipfakedai_id = '1167103783056367616'
*/

@Injectable()
export class TwitterService {
  private inactive: boolean = false;
  private twitterApp: any;
  private twitterBot: any;
  private twitterDev: any;
  private webhookId: string | undefined;
  private user: Promise<User> | undefined;

  public authUrl: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly log: LoggerService,
    private readonly userRepo: UserRepository,
    private readonly message: MessageService,
  ) {
    this.log.setContext("TwitterService");
    if (!this.config.twitterDev.consumerKey || !this.config.twitterDev.consumerSecret) {
      this.log.warn(`Missing consumer token and/or secret, twitter stuff won't work.`);
      this.inactive = true;
    } else {
      this.twitterDev = new Twitter(this.config.twitterDev);
      this.twitterApp = new Twitter(this.config.twitterApp);
      if (!config.twitterBot.accessToken) {
        this.log.info(`Bot credentials not found, requesting a new access token..`);
        this.botLogin();
      } else {
        this.twitterBot = new Twitter(this.config.twitterBot);
        this.subscribe(this.config.twitterBotUserId);
        this.getUser();
      }
    }
  }

  public parseTweet = async (tweet: any): Promise<any> => {
    this.log.debug(`Parsing tweet: ${JSON.stringify(tweet)}`);
    if (tweet.retweeted_status) {
      this.log.info(`Ignoring retweet`);
      return;
    }
    const sender = await this.userRepo.getTwitterUser(tweet.user.id_str, tweet.user.screen_name);
    const entities = tweet.extended_tweet ? tweet.extended_tweet.entities : tweet.entities;
    const tweetText = tweet.extended_tweet ? tweet.extended_tweet.full_text : tweet.text;
    const tipInfo = tweetText.match(twitterTipRegex((await this.getUser()).twitterName));
    this.log.debug(`Got tipInfo ${JSON.stringify(tipInfo)}`);
    if (tipInfo && tipInfo[3]) {
      try {
        this.log.debug(`Trying to tip..`);
        const recipientUser = entities.user_mentions.find(
          user => user.screen_name === tipInfo[1],
        );
        const recipient = await this.userRepo.getTwitterUser(recipientUser.id_str, tipInfo[1]);
        const response = await this.message.handlePublicMessage(
          sender,
          recipient,
          tipInfo[3],
          tweetText,
        );
        if (response) {
          await this.tweet(
           `@${tweet.user.screen_name} ${response}`,
            tweet.id_str,
          );
        }
      } catch (e) {
        this.log.error(e);
        await this.tweet(
         `@${tweet.user.screen_name} Oh no, something went wrong. @bohendo can you please fix me?`,
          tweet.id_str,
        );
      }
    } else {
      this.log.info(`Tweet isn't a well formatted tip, ignoring: ${tweetText}`);
    }
  }

  public parseDM = async (dm: any): Promise<any> => {
    this.log.debug(`Parsing dm: ${JSON.stringify(dm)}`);
    const senderId = dm.message_create.sender_id;
    let sender = await this.userRepo.getTwitterUser(senderId);
    if (!sender || !sender.twitterName) {
      const twitterUser = await this.getUserById(senderId);
      this.log.debug(`twitterUser: ${JSON.stringify(twitterUser)}`);
      sender = await this.userRepo.getTwitterUser(senderId, twitterUser.screen_name);
    }
    let message = dm.message_create.message_data.text;
    dm.message_create.message_data.entities.urls.forEach(url => {
      message = message.replace(url.url, url.expanded_url);
    });
    const responses = await this.message.handlePrivateMessage(sender, message);
    if (responses && responses.length) {
      responses.forEach(
        async response => await this.sendDM(dm.message_create.sender_id, response),
      );
    }
  }

  public getUser = async (): Promise<User> => {
    if (!this.user) {
      const screenName = (await this.getUserById(this.config.twitterBotUserId)).screen_name;
      this.user = this.userRepo.getTwitterUser(this.config.twitterBotUserId, screenName);
      this.log.info(`Got bot user: ${JSON.stringify(await this.user)}`);
    }
    return await this.user;
  }

  public triggerCRC = async (): Promise<boolean> => {
    if (this.inactive) { return; }
    try {
      await this.twitterApp.triggerCRC(this.webhookId);
      return true;
    } catch (e) {
      this.log.warn(e);
      return false;
    }
  }

  public tweet = async (status: string, replyTo?: string) => {
    if (this.inactive) { return; }
    return await this.twitterBot.tweet(status, replyTo);
  }

  public getUserById = async (user_id) => {
    if (this.inactive) { return; }
    return await this.twitterBot.getUserById(user_id);
  }

  public getUserByName = async (screen_name) => {
    if (this.inactive) { return; }
    return await this.twitterBot.getUserByName(screen_name);
  }

  public getMentions = async (options) => {
    if (this.inactive) { return; }
    const defaults = { count: "5", trim_user: true, include_entities: true };
    const res = await this.twitterBot.getMentions({ ...defaults, ...options });
    return res.map(tweet => tweet.text);
  }

  public sendDM = async (recipient_id, message) => {
    if (this.inactive) { return; }
    return await this.twitterBot.sendDM(recipient_id, message);
  }

  public botLogin = async () => {
    if (this.inactive) { return; }
    const res = await this.twitterApp.requestToken();
    const data = qs.parse(res);
    this.log.info(`Got token data: ${JSON.stringify(data)}`);
    const baseUrl = "https://api.twitter.com/oauth/authorize";
    this.authUrl = `${baseUrl}?oauth_token=${data.oauth_token}`;
    this.log.info(`Login at: ${this.authUrl}`);
    return this.authUrl;
  }

  // Third step of 3-leg oauth (2nd step is the user clicking the authUrl)
  public connectBot = async (consumer_key, token, verifier): Promise<void> => {
    if (this.inactive) { return; }
    this.authUrl = undefined; // this url has been used & can't be used again
    const res = await this.twitterApp.getAccessToken({
      oauth_consumer_key: consumer_key,
      oauth_token: token,
      oauth_verifier: verifier,
    });
    const data = qs.parse(res);
    this.log.info(`Authentication Success!`);
    this.log.info(`Got access tokens for ${data.screen_name}`);
    this.log.info(`Access tokens (You should save these for later):`);
    this.log.info(`TIPDAI_TWITTER_BOT_ACCESS_SECRET=${data.oauth_token_secret}`);
    this.log.info(`TIPDAI_TWITTER_BOT_ACCESS_TOKEN=${data.oauth_token}`);
    this.log.info(`TIPDAI_TWITTER_BOT_USER_ID=${data.user_id}`);
    this.twitterBot = new Twitter({
      ...this.config.twitterBot,
      accessToken: data.oauth_token as string,
      accessSecret: data.oauth_token_secret as string,
    });
    this.log.info(`Twitter bot successfully connected!`);
    await this.subscribe(data.user_id);
    this.log.info(`Account activity subscription successfully configured!`);
    await this.getUser();
    return;
  }

  public subscribe = async (botId) => {
    if (this.inactive) { return; }
    const webhooks = await this.twitterApp.getWebhooks();
    const subscriptions = await this.twitterDev.getSubscriptions();
    this.log.info(`Got subscriptions: ${JSON.stringify(subscriptions.subscriptions)}`);
    let crcRes;
    if (subscriptions.subscriptions.find(e => e.user_id === botId)) {
      this.webhookId = webhooks.environments[0].webhooks[0].id;
      crcRes = await this.triggerCRC();
      this.log.info(`CRC succeeded: ${crcRes}`);
      this.log.info(`Already subscribed to user ${botId}. We're good to go!`);
      return;
    }
    this.log.info(`Ok let's try to remove the old webhook subscriptions`);
    // 2. Remove all webhook subscriptions
    await Promise.all(webhooks.environments.map(async env =>
      Promise.all(env.webhooks.map(async webhook => {
        this.log.info(`Unsubscribing from ${env.environment_name} webhook: ${webhook.id}..`);
        return this.twitterBot.removeWebhook(webhook.id);
      })),
    ));
    this.log.info(`Done unsubscribing, time to do some subscribing`);
    const newWebhook = await this.twitterApp.createWebhook("/webhooks/twitter");
    this.log.info(`Created webhook: ${JSON.stringify(newWebhook, null, 2)}`);
    // 3. Create a new subscription
    const newSubscription = await this.twitterBot.createSubscription();
    this.log.info(`Activated subscription: ${JSON.stringify(newSubscription, null, 2)}`);
    this.webhookId = newWebhook.id;
    crcRes = await this.triggerCRC();
    this.log.info(`CRC succeeded: ${crcRes}`);
    return(newSubscription);
  }

}
