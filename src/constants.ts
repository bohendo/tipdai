

export const paymentIdRegex = /paymentId=0x[0-9a-fA-F]{64}/;
export const secretRegex = /secret=0x[0-9a-fA-F]{64}/;

// TODO: Don't hardcode screen name
export const tipRegex = /@TipFakeDai.*(@[a-zA-Z0-9]*).*[$]([0-9]+.?[0-9]*)?/i;

const exampleTwitterPrivateMessage = {
  type: 'message_create',
  id: '1182505754852347908',
  created_timestamp: '1570766316508',
  message_create: {
    target: {
      recipient_id: '1167103783056367616',
    },
    sender_id: '799775632678916096',
    message_data: {
      text: 'Balance',
      entities: {
        hashtags: [],
        symbols: [],
        user_mentions: [],
        urls: [],
      },
    },
  },
};

const exampleTwitterPublicMessage = {
  created_at: 'Thu Oct 10 15:26:13 +0000 2019',
  id: 1182316410199888000,
  id_str: '1182316410199887872',
  text: '@TipFakeDai Hi, send @lmcmz some money: $0.10',
  display_text_range: [ 9, 140 ],
  source: '<a href=\'https://tipdai.bohendo.com\' rel=\'nofollow\'>TipDai</a>',
  truncated: true,
  in_reply_to_status_id: 1182316328222220300,
  in_reply_to_status_id_str: '1182316328222220288',
  in_reply_to_user_id: 259539164,
  in_reply_to_user_id_str: '259539164',
  in_reply_to_screen_name: 'bohendo',
  user: {
    id: 1167103783056367600,
    id_str: '1167103783056367616',
    name: 'Tip Fake Dai',
    screen_name: 'TipFakeDai',
    location: 'Internet of money',
    url: 'https://github.com/bohendo/tipdai',
    description: 'example bio',
    translator_type: 'none',
    protected: false,
    verified: false,
    followers_count: 4,
    friends_count: 2,
    listed_count: 0,
    favourites_count: 0,
    statuses_count: 5,
    created_at: 'Thu Aug 29 15:57:08 +0000 2019',
    utc_offset: null,
    time_zone: null,
    geo_enabled: false,
    lang: null,
    contributors_enabled: false,
    is_translator: false,
    profile_background_color: 'F5F8FA',
    profile_background_image_url: '',
    profile_background_image_url_https: '',
    profile_background_tile: false,
    profile_link_color: '1DA1F2',
    profile_sidebar_border_color: 'C0DEED',
    profile_sidebar_fill_color: 'DDEEF6',
    profile_text_color: '333333',
    profile_use_background_image: true,
    profile_image_url: 'http://pbs.twimg.com/profile_images/1167104096836497408/GCUKihgL_normal.jpg',
    profile_image_url_https: 'https://pbs.twimg.com/profile_images/1167104096836497408/GCUKihgL_normal.jpg',
    default_profile: true,
    default_profile_image: false,
    following: null,
    follow_request_sent: null,
    notifications: null,
  },
  geo: null,
  coordinates: null,
  place: null,
  contributors: null,
  is_quote_status: false,
  extended_tweet: {
    full_text: '@bohendo Success! A tip of $0.10 has been transfered. @lmcmz, you can tip someone else (use the tweet pattern mentioned in my bio) or DM me \'balance\' to cashout.',
    display_text_range: [ 9, 161 ],
    entities: {
      hashtags: [],
      urls: [],
      user_mentions: [
        {
          screen_name: 'bohendo',
          name: 'Bo',
          id: 259539164,
          id_str: '259539164',
          indices: [ 0, 8 ],
        },
        {
          screen_name: 'lmcmz',
          name: 'lmcmz',
          id: 2882960978,
          id_str: '2882960978',
          indices: [ 54, 60 ],
        },
      ],
      symbols: [],
    },
  },
  quote_count: 0,
  reply_count: 0,
  retweet_count: 0,
  favorite_count: 0,
  entities: {
    hashtags: [],
    urls: [
      {
        url: 'https://t.co/vSm3nkusSF',
        expanded_url: 'https://twitter.com/i/web/status/1182316410199887872',
        display_url: 'twitter.com/i/web/status/1…',
        indices: [ 117, 140 ],
      },
    ],
    user_mentions: [
      {
        screen_name: 'bohendo',
        name: 'Bo',
        id: 259539164,
        id_str: '259539164',
        indices: [ 0, 8 ],
      },
      {
        screen_name: 'lmcmz',
        name: 'lmcmz',
        id: 2882960978,
        id_str: '2882960978',
        indices: [ 54, 60 ],
      },
    ],
    symbols: [],
  },
  favorited: false,
  retweeted: false,
  filter_level: 'low',
  lang: 'en',
  timestamp_ms: '1570721173225',
};
