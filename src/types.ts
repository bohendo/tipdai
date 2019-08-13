export type TwitterAppConfig = {
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
};

export type TwitterUserConfig = TwitterAppConfig & {
  accessToken: string;
  accessSecret: string;
};

export type PostgresConfig = {
  database: string;
  host: string;
  password: string;
  port: number;
  username: string;
};
