const debug = require("debug")("mailbots:utils");
const MailBotsClient = require("@mailbots/mailbots-sdk");
const assert = require("assert");

module.exports = {
  validateWebhook: function(req, res, next) {
    // We do not yet have an authenticated API client, so instantiate from clientid / secret
    const config = res.locals.bot.config;
    const mbClient = new MailBotsClient(config);

    const validateTimestamp = true;
    debug(
      req.headers["x-mailbots-signature"],
      req.headers["x-mailbots-timestamp"],
      req.rawBody
    );
    assert(
      req.headers["x-mailbots-signature"],
      "Webhook validation requires a signature"
    );
    assert(
      req.headers["x-mailbots-timestamp"],
      "Webhook validation requires a timestamp"
    );
    assert(req.rawBody, "Webhook validation requires the full text body");

    if (
      mbClient.validateWebhook(
        req.headers["x-mailbots-signature"],
        req.headers["x-mailbots-timestamp"],
        req.rawBody,
        validateTimestamp
      )
    ) {
      debug("Webhook validated!");
      return next();
    } else {
      return res
        .status(403)
        .send({ status: "error", message: "Webhook validation failed" });
    }
  }
};
