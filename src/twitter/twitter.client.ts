/*
 Twitter client app
 */

import { OAuth } from "oauth";
import * as qs from "qs";

import { TwitterConfig } from "../types";

type OAuthError = {
  statusCode: number;
  data: {
    errors: Array<{
      code: number;
      message: string;
    }>;
  }
};

type OAuthResponse = {
  aborted: any;
  headers: any;
  method: any;
  statusCode: any;
  statusMessage: any;
  trailers: any;
  upgrade: any;
  url: any;
};

export class Twitter {
  accessSecret: string;
  accessToken: string;
  baseUrl: string = "https://api.twitter.com/1.1";
  callbackUrl: string;
  consumerKey: string;
  consumerSecret: string;
  log?: any;
  oauth: OAuth;
  webhook: any;

  constructor(config: TwitterConfig) {
    this.accessSecret = config.accessSecret || undefined;
    this.accessToken = config.accessToken || undefined;
    this.baseUrl = "https://api.twitter.com/1.1";
    this.callbackUrl = config.callbackUrl;
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.log = config.log || console;
    this.webhook = config.webhook;
    this.oauth = new OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      this.consumerKey,
      this.consumerSecret,
      "1.0",
      this.callbackUrl,
      "HMAC-SHA1",
    );
  }

  createWebhook = async (callbackPath): Promise<any> => {
    const path = `/account_activity/all/${this.webhook.env}/webhooks.json`;
    const url = this._encodeUrl(this.baseUrl + path + this._buildQS({
      url: `${this.callbackUrl}${callbackPath}`,
    }));
    return this._post(url);
  }

  createSubscription = async (): Promise<any> => {
    const path = `/account_activity/all/${this.webhook.env}/subscriptions.json`;
    return this._post(this._encodeUrl(this.baseUrl + path));
  }

  removeWebhook = async (webhookId: string|number): Promise<any> => {
    const path = `/account_activity/all/${this.webhook.env}/webhooks/${webhookId}.json`;
    return this._delete(this._encodeUrl(this.baseUrl + path));
  }

  getAccessToken = async (params: any): Promise<any> => {
    const url = `https://api.twitter.com/oauth/access_token`;
    return this._post(url + this._buildQS(params));
  }

  getWebhooks = async (): Promise<any> => {
    const path = `/account_activity/all/webhooks.json`;
    return this._get(this._encodeUrl(this.baseUrl + path));
  }

  getSubscriptions = async (): Promise<any> => {
    const path = `/account_activity/all/${this.webhook.env}/subscriptions/list.json`;
    return this._get(this._encodeUrl(this.baseUrl + path));
  }

  requestToken = async (): Promise<any> => {
    const url = `https://api.twitter.com/oauth/request_token`;
    return this._post(url + this._buildQS({ oauthCallback: this.callbackUrl }));
  }

  triggerCRC = async (webhookId): Promise<any> => {
    const path = `/account_activity/all/${this.webhook.env}/webhooks/${webhookId}.json`;
    return this._put(this._encodeUrl(this.baseUrl + path));
  }

  tweet = async (status, in_reply_to_status_id): Promise<any> => {
    const path = "/statuses/update.json";
    return this._post(this._encodeUrl(this.baseUrl + path), { status, in_reply_to_status_id });
  }

  getUserById = async (user_id: string): Promise<any> => {
    const path = "/users/show.json";
    return this._get(this._encodeUrl(this.baseUrl + path + this._buildQS({ user_id })));
  }

  getUserByName = async (screen_name: string): Promise<any> => {
    const path = "/users/show.json";
    return this._get(this._encodeUrl(this.baseUrl + path + this._buildQS({ screen_name })));
  }

  getMentions = async (options): Promise<any> => {
    const path = "/statuses/mentions_timeline.json";
    return this._get(this._encodeUrl(this.baseUrl + path + this._buildQS(options)));
  }

  sendDM = async (recipient_id, text): Promise<any> => {
    const path = "/direct_messages/events/new.json";
    const data = JSON.stringify({
      event: {
        type: "message_create",
        message_create: {
          target: { recipient_id },
          message_data: { text },
        },
      },
    });
    return this._post(this._encodeUrl(this.baseUrl + path + this._buildQS(data)), data);
  }

  ////////////////////////////////////////
  // Private Methods

  _get = (url: string): Promise<any> => {
    this.log.debug(`GET URL: ${url}`);
    return new Promise((resolve, reject) => {
      this.oauth.get(url, this.accessToken, this.accessSecret, (
        err: OAuthError,
        body: any,
        res: OAuthResponse,
      ) => {
        if (err) {
          this.log.error(`GET failed: ${err.data}`);
          reject(err);
        }
        if (res.statusCode === 204) { return resolve(); }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          this.log.warn(`GET ${url} yielded body not parsable as JSON: [${typeof body}] ${body}`);
          resolve(body);
        }
      });
    });
  }

  _post = (url: string, data: any = {}): Promise<any> => {
    this.log.debug(`POST URL: ${url}`);
    return new Promise((resolve, reject) => {
      this.oauth.post(url, this.accessToken, this.accessSecret, data, "application/json", (
        err: OAuthError,
        body: any,
        res: OAuthResponse,
      ) => {
        if (err) {
          this.log.error(`POST failed: ${err.data}`);
          reject(err);
        }
        if (res.statusCode === 204) { return resolve(); }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          this.log.warn(`POST ${url} yielded body not parsable as JSON: [${typeof body}] ${body}`);
          resolve(body);
        }
      });
    });
  }

  _put = (url: string, data: any = {}): Promise<any> => {
    this.log.debug(`PUT URL: ${url}`);
    return new Promise((resolve, reject) => {
      this.oauth.put(url, this.accessToken, this.accessSecret, data, "application/json", (
        err: OAuthError,
        body: any,
        res: OAuthResponse,
      ) => {
        if (err) {
          this.log.error(`PUT failed: ${err.data}`);
          reject(err);
        }
        if (res.statusCode === 204) { return resolve(); }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          this.log.warn(`PUT ${url} yielded body not parsable as JSON: [${typeof body}] ${body}`);
          resolve(body);
        }
      });
    });
  }

  _delete = (url: string): Promise<any> => {
    this.log.debug(`DEL URL: ${url}`);
    return new Promise((resolve, reject) => {
      this.oauth.delete(url, this.accessToken, this.accessSecret, (
        err: OAuthError,
        body: any,
        res: OAuthResponse,
      ) => {
        if (err) {
          this.log.error(`DEL failed: ${err.data}`);
          reject(err);
        }
        if (res.statusCode === 204) { return resolve(); }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          this.log.warn(`DEL ${url} yielded body not parsable as JSON: [${typeof body}] ${body}`);
          resolve(body);
        }
      });
    });
  }

  // Fix the mismatch between OAuth"s RFC3986"s and Javascript"s encoding
  // More info: https://github.com/ttezel/twit/blob/master/lib/oarequest.js
  _encodeUrl = (url: string): string => {
    return url
      .replace(/\!/g, "%21")
      .replace(/\"/g, "%27")
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29")
      .replace(/\*/g, "%2A");
  }

  _buildQS = (params: any): string => {
    if (params && Object.keys(params).length > 0) {
      return "?" + qs.stringify(params);
    }
    return "";
  }
}
