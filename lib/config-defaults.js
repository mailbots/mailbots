/**
    Populate config options based on environment, inferring defaults.
 */

const urljoin = require("url-join");

module.exports = function(config = {}) {
  const botUrl =
    config.botUrl ||
    process.env.BOT_URL ||
    "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/";
  const webhookRoute = config.webhookRoute || "/webhooks";
  const mailDomain = config.mailDomain || process.env.MAIL_DOMAIN;
  const botSubdomain = config.botSubdomain || process.env.BOT_SUBDOMAIN;
  const apiHost =
    config.apiHost || process.env.API_HOST || "https://api.mailbots.com/";
  const clientId = config.clientId || process.env.CLIENT_ID;
  const clientSecret = config.clientSecret || process.env.CLIENT_SECRET;
  const redirectUri =
    config.redirectUri ||
    process.env.REDIRECT_URI ||
    urljoin(botUrl, "auth/callback") ||
    "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/auth/callback";
  const mailbotsAdmin =
    config.mailbotsAdmin ||
    process.env.MAILBOTS_ADMIN ||
    "https://app.mailbots.com/";
  const tokenHost = config.tokenHost || apiHost;
  const tokenPath =
    config.tokenPath || urljoin(apiHost, "api/v1/oauth2/access_token");
  const authorizePath =
    config.authorizePath || urljoin(mailbotsAdmin, "authorize-extension");
  const scope =
    config.scope ||
    process.env.SCOPE ||
    "get_user_info extension_manage_self manage_own_tasks read_own_tasks";
  const creationDate = config.creationDate || process.env.PJT_CREATED;
  const botId = config.botId || process.env.BOT_ID || "";
  const redirectOnLoginWithAuth =
    config.redirectOnLoginWithAuth ||
    urljoin(mailbotsAdmin, "extensions", botId, "settings", "welcome");
  const accessTokenName = config.accessTokenName || "access_token";

  const configDefaults = {
    botUrl,
    webhookRoute,
    mailDomain,
    botSubdomain,
    apiHost,
    clientId,
    clientSecret,
    redirectUri,
    tokenHost,
    tokenPath,
    authorizePath,
    scope,
    creationDate,
    botId,
    mailbotsAdmin,
    redirectOnLoginWithAuth,
    accessTokenName
  };

  // This allows for instance to override an auto-configured value, for example,
  // passing a custom mailbotsAdmin and with a different authorizePath.
  return Object.assign({}, configDefaults, config);
};
