import { Express } from "express";
const urljoin = require("url-join");

export interface IBotConfig {
  app?: Express;
  mailbotUrl: string;
  webhookRoute: string;
  mailDomain?: string;
  mailbotSubdomain?: string;
  apiHost: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
  mailbotsAdmin: string;
  tokenHost: string;
  tokenPath: string;
  authorizePath: string;
  scope: string;
  creationDate?: string;
  mailbotId: string;
  mailbotSettingsUrl: string;
  redirectOnLoginWithAuth: string;
  accessTokenName: string;
}

export default function(config: Partial<IBotConfig> = {}): IBotConfig {
  const mailbotUrl =
    config.mailbotUrl ||
    process.env.MAILBOT_URL ||
    "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/";
  const webhookRoute = config.webhookRoute || "/webhooks";
  const mailDomain = config.mailDomain || process.env.MAIL_DOMAIN;
  const mailbotSubdomain =
    config.mailbotSubdomain || process.env.MAILBOT_SUBDOMAIN;
  const apiHost =
    config.apiHost || process.env.API_HOST || "https://api.mailbots.com/";
  const clientId = config.clientId || process.env.CLIENT_ID;
  const clientSecret = config.clientSecret || process.env.CLIENT_SECRET;
  const redirectUri =
    config.redirectUri ||
    process.env.REDIRECT_URI ||
    urljoin(mailbotUrl, "auth/callback") ||
    "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/auth/callback";
  const mailbotsAdmin =
    config.mailbotsAdmin ||
    process.env.MAILBOTS_ADMIN ||
    "https://app.followupthen.com/";
  const tokenHost = config.tokenHost || apiHost;
  const tokenPath =
    config.tokenPath || urljoin(apiHost, "api/v1/oauth2/access_token");
  const authorizePath =
    config.authorizePath || urljoin(mailbotsAdmin, "authorize-mailbot");
  const scope =
    config.scope ||
    process.env.SCOPE ||
    "get_user_info mailbot_manage_self manage_own_tasks read_own_tasks";
  const creationDate = config.creationDate || process.env.PJT_CREATED;
  const mailbotId = config.mailbotId || process.env.MAILBOT_ID || "";
  const mailbotSettingsUrl =
    config.mailbotSettingsUrl ||
    urljoin(mailbotsAdmin, "mailbots", mailbotId, "settings");
  const redirectOnLoginWithAuth =
    config.redirectOnLoginWithAuth ||
    urljoin(mailbotsAdmin, "mailbots", mailbotId, "settings", "welcome");
  const accessTokenName = config.accessTokenName || "access_token";

  const configDefaults: IBotConfig = {
    mailbotUrl,
    webhookRoute,
    mailDomain,
    mailbotSubdomain,
    apiHost,
    clientId,
    clientSecret,
    redirectUri,
    tokenHost,
    tokenPath,
    authorizePath,
    scope,
    creationDate,
    mailbotId,
    mailbotSettingsUrl,
    mailbotsAdmin,
    redirectOnLoginWithAuth,
    accessTokenName
  };

  // This allows for instance to override an auto-configured value, for example,
  // passing a custom mailbotsAdmin and with a different authorizePath.
  return Object.assign({}, configDefaults, config);
}
