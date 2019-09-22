/*
 Twitter client app
 */

import { OAuth } from 'oauth';
import * as qs from 'qs';

import { TwitterConfig } from '../types';

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

export class TwitterClient {
  accessSecret: string;
  accessToken: string;
  baseUrl: string = 'https://api.twitter.com/1.1';
  callbackUrl: string;
  consumerKey: string;
  consumerSecret: string;
  oauth: OAuth;
  webhook: any;

  constructor(config: TwitterConfig) {
    console.log(`Creating twitter CLIENT with config: ${JSON.stringify(config)}`);
    this.accessSecret = config.accessSecret || undefined;
    this.accessToken = config.accessToken || undefined;
    this.baseUrl = 'https://api.twitter.com/1.1';
    this.callbackUrl = config.callbackUrl;
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.webhook = config.webhook;

    this.oauth = new OAuth(
      'https://api.twitter.com/oauth/request_token',
      'https://api.twitter.com/oauth/access_token',
      this.consumerKey,
      this.consumerSecret,
      '1.0',
      this.callbackUrl,
      'HMAC-SHA1',
    );
  }

  /*
  return new Promise((resolve, reject) => {
    this.twitterDev.getCustomApiCall(
      `/account_activity/all/${this.config.webhooks.twitter.env}/subscriptions/list.json`,
      {},
      this.handleError(reject),
      res => {
        const data = JSON.parse(res);
        resolve(callback ? callback(data) : data);
      },
    );
  });
  */

  getSubscriptions = async (): Promise<void> => {
    console.log(`Auth stuff getSubscriptions: ${this.accessToken} and ${this.accessSecret}`);
    return this._get(`/account_activity/all/${this.webhook.env}/subscriptions/list.json`);
  }

  ////////////////////////////////////////
  // Private Methods

  _get = (path: string, params: any = {}): Promise<any> => {
    const url = this._encodeUrl(this.baseUrl + path + this._buildQS(params));
    console.log(`GET URL: ${url}`);
    return new Promise((resolve, reject) => {
      this.oauth.get(url, this.accessToken, this.accessSecret, (
        err: OAuthError,
        body: any,
        res: OAuthResponse,
      ) => {
        console.log(`GET response: [${res.statusCode}] ${res.statusMessage}`);
        if (err) {
          console.error(`GET failed: ${err.data}`);
          reject(err);
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          console.warn(`Body is not parsable JSON`);
          resolve(body);
        }
      });
    });
  }

  // Fix the mismatch between OAuth's RFC3986's and Javascript's encoding
  // More info: https://github.com/ttezel/twit/blob/master/lib/oarequest.js
  _encodeUrl = (url: string): string => {
    return url
      .replace(/\!/g, '%21')
      .replace(/\'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  _buildQS = (params: any): string => {
    if (params && Object.keys(params).length > 0) {
      return '?' + qs.stringify(params);
    }
    return '';
  }
}
