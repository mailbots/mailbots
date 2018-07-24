/**
    Populate config options based on environment, inferring defaults.
 */

const urljoin = require("url-join");

const extensionUrl =
  process.env.EXTENSION_URL ||
  "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/";
const apiHost = process.env.API_HOST || "https://api.gopher.email/";
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri =
  process.env.REDIRECT_URI ||
  "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/auth/callback";
const gopherAdmin = process.env.GOPHER_ADMIN || "https://app.gopher.email/";
const tokenHost = apiHost;
const tokenPath = apiHost + "api/v1/oauth2/access_token";
const authorizePath = gopherAdmin + "authorize-extension";
const scope =
  process.env.SCOPE ||
  "get_user_info extension_manage_self manage_own_tasks read_own_tasks";
const creationDate = process.env.PJT_CREATED;
const extensionId = process.env.EXT_ID || "";
const redirectOnLoginWithAuth = urljoin(
  gopherAdmin,
  "/extensions",
  extensionId,
  "?installed=1"
);
const accessTokenName = "gopher_token";

const autoConfig = {
  extensionUrl,
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

module.exports = autoConfig;
