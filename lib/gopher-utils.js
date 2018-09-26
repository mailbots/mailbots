const debug = require("debug")("gopher-app:utils");
const Gopher = require("gopherhq");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const _ = require("lodash");
const assert = require("assert");

const WEBHOOK_PATH = "/webhooks";

module.exports = {
  validateWebhook: function(req, res, next) {
    // We do not yet have an authenticated API client, so instantiate from clientid / secret
    const config = res.locals.gopher.config;
    const gopherClient = new Gopher(config);

    const validateTimestamp = true;
    debug(
      req.headers["x-gopher-signature"],
      req.headers["x-gopher-timestamp"],
      req.rawBody
    );
    assert(
      req.headers["x-gopher-signature"],
      "Webhook validation requires a signature"
    );
    assert(
      req.headers["x-gopher-timestamp"],
      "Webhook validation requires a timestamp"
    );
    assert(req.rawBody, "Webhook validation requires the full text body");

    if (
      gopherClient.validateWebhook(
        req.headers["x-gopher-signature"],
        req.headers["x-gopher-timestamp"],
        req.rawBody,
        validateTimestamp
      )
    ) {
      debug("Webhook validated!");
      return next();
    } else {
      console.log("Webhook validation failed");
      return res
        .status(403)
        .send({ status: "error", message: "Webhook validation failed" });
    }
  },

  /**
   * Sets an authenticated insteance of Gopher API client
   * https://github.com/gopherhq/gopherhq-js for use in events
   * and middleware under gopher.api Works both with webhook + web request
   */
  initGopherApiClient(req, res, next) {
    const gopher = res.locals.gopher;
    const config = res.locals.gopher.config;
    gopher.api = new Gopher(config);

    const accessToken =
      gopher.webhook.getExtensionData(config.accessTokenName) ||
      req.cookies[config.accessTokenName];

    if (accessToken) {
      gopher.api.setAccessToken(accessToken);
      gopher.isLoggedIn = true;
    } else {
      gopher.isLoggedIn = false;
    }
    next();
  }
};
