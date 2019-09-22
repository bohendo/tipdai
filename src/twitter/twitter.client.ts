/*
 Twitter client app
 */

import { OAuth } from 'oauth';
import * as qs from 'qs';

export class TwitterClient {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  callbackUrl: string;
  baseUrl: string = 'https://api.twitter.com/1.1';
  oauth: OAuth;

  constructor(config: any) {
    console.log(`Creating twitter thing with config: ${JSON.stringify(config)}`);
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.accessToken = config.accessToken;
    this.accessTokenSecret = config.accessSecret;
    this.callbackUrl = config.callbackUrl;
    this.baseUrl = 'https://api.twitter.com/1.1';
    // console.log(`Consumer auth: ${this.consumerKey}, ${this.consumerSecret}`);
    // console.log(`Access auth: ${this.accessToken}, ${this.accessTokenSecret}`);
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

  getCustomApiCall = async (path, params, error, success): Promise<void> => {
    try {
      success(await this.doGet(this.baseUrl + path + this._buildQS(params)));
    } catch (e) {
      error(e);
    }
  }

  ////////////////////////////////////////
  // Private Methods

  doGet = (url) => {
    return new Promise((resolve, reject) => {
      this.oauth.get(this._encodeUrl(url), this.accessToken, this.accessTokenSecret, (
        err,
        body,
        response,
      ) => {
        console.log(`GET URL [${this._encodeUrl(url)}]`);
        if (err) { reject(err); }
        resolve(body);
      });
    });
  }

  // Fix the mismatch between OAuth's RFC3986's and Javascript's encoding
  // More info: https://github.com/ttezel/twit/blob/master/lib/oarequest.js
  _encodeUrl = (url) => {
    return url
      .replace(/\!/g, '%21')
      .replace(/\'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  _buildQS = (params) => {
    if (params && Object.keys(params).length > 0) {
      return '?' + qs.stringify(params);
    }
    return '';
  }
}
