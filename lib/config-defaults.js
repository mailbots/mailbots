/**
    Populate config options based on environment, inferring defaults.
 */

const urljoin = require("url-join");

module.exports = function(config = {}) {
  const extensionUrl =
    config.extensionUrl ||
    process.env.EXTENSION_URL ||
    "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/";
  const webhookRoute = config.webhookRoute || "/webhooks";
  const mailDomain = config.mailDomain || process.env.MAIL_DOMAIN;
  const extSubdomain = config.extSubdomain || process.env.EXT_SUBDOMAIN;
  const apiHost =
    config.apiHost || process.env.API_HOST || "https://api.gopher.email/";
  const clientId = config.clientId || process.env.CLIENT_ID;
  const clientSecret = config.clientSecret || process.env.CLIENT_SECRET;
  const redirectUri =
    config.redirectUri ||
    process.env.REDIRECT_URI ||
    urljoin(config.extensionUrl, "auth/callback") ||
    "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/auth/callback";
  const gopherAdmin =
    config.gopherAdmin ||
    process.env.GOPHER_ADMIN ||
    "https://app.gopher.email/";
  const tokenHost = config.tokenHost || apiHost;
  const tokenPath =
    config.tokenPath || urljoin(apiHost, "api/v1/oauth2/access_token");
  const authorizePath =
    config.authorizePath || urljoin(gopherAdmin, "authorize-extension");
  const scope =
    config.scope ||
    process.env.SCOPE ||
    "get_user_info extension_manage_self manage_own_tasks read_own_tasks";
  const creationDate = config.creationDate || process.env.PJT_CREATED;
  const extensionId = config.extensionId || process.env.EXT_ID || "";
  const redirectOnLoginWithAuth =
    config.redirectOnLoginWithAuth ||
    urljoin(gopherAdmin, "extensions", extensionId, "settings", "welcome");
  const accessTokenName = config.accessTokenName || "access_token";

  const configDefaults = {
    extensionUrl,
    webhookRoute,
    mailDomain,
    extSubdomain,
    apiHost,
    clientId,
    clientSecret,
    redirectUri,
    tokenHost,
    tokenPath,
    authorizePath,
    scope,
    creationDate,
    extensionId,
    gopherAdmin,
    redirectOnLoginWithAuth,
    accessTokenName
  };

  // This allows for instance to override an auto-configured value, for example,
  // passing a custom gopherAdmin and with a different authorizePath.
  return Object.assign({}, configDefaults, config);
};
