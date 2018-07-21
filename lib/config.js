/**
    Update your .env file instead of editing this file.
 */

const request = require("request");
const urljoin = require("url-join");

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  console.log(
    "Register a new Gopher extension at https://app.gopher.email, then populate .env. Read more: docs.gopher.email"
  );
  process.exit();
}

const extensionUrl =
  process.env.EXTENSION_URL ||
  "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/";
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const apiHost = process.env.API_HOST || "https://api.gopher.email/";
const gopherAdmin = process.env.GOPHER_ADMIN || "https://app.gopher.email/";
const scope =
  process.env.SCOPE ||
  "get_user_info extension_manage_self manage_own_tasks read_own_tasks";
const redirectUri =
  process.env.REDIRECT_URI ||
  "https://" + process.env.PROJECT_DOMAIN + ".glitch.me/auth/callback";
const creationDate = process.env.PJT_CREATED;
const extensionId = process.env.EXT_ID || "";
const extensionDirectoryPage = urljoin(
  gopherAdmin,
  "/extensions",
  extensionId,
  "?installed=1"
);

const config = {
  extensionUrl: extensionUrl,
  apiHost: apiHost,
  clientId: clientId,
  clientSecret: clientSecret,
  redirectUri: redirectUri,
  tokenHost: apiHost,
  tokenPath: apiHost + "api/v1/oauth2/access_token",
  authorizePath: gopherAdmin + "authorize-extension",
  gopherAdmin: gopherAdmin,
  scope: scope,
  creationDate: creationDate,
  extensionId: extensionId,
  redirectOnLoginWithAuth: extensionDirectoryPage
};

// Is project eligible for auto-init?
function shouldAutoInit(config) {
  const MAX_AGE = 60 * 10 * 1000; // 30 minutes from setup
  if (!process.env.PROJECT_DOMAIN) return false; // Only auto-update on Glitch
  if (!config.creationDate) return false;
  return Date.now() - config.creationDate < MAX_AGE;
}

// Auto-init new extension with Gopher
function autoInit(config) {
  const authToken = new Buffer(
    config.clientId + ":" + config.clientSecret
  ).toString("base64");

  request(
    {
      method: "POST",
      url: apiHost + "api/v1/extensions/" + config.extensionId + "/init",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + authToken
      },
      json: {
        base_url: config.extensionUrl,
        install_url: config.extensionUrl,
        webhook_url: config.extensionUrl + "/webhooks",
        oauth2_redirect_uri: config.redirectUri
      }
    },
    (err, res) => {
      if (res.statusCode !== 200) {
        console.error("Error initializing extension: " + res.body.message);
      } else {
        console.log("Successfully initialized extension!");
      }
    }
  );
}

if (shouldAutoInit(config)) autoInit(config);

module.exports = config;
