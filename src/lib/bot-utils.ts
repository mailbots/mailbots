import * as express from "express";
import * as debugAs from "debug";
import * as assert from "assert";

const MailBotsClient = require("@mailbots/mailbots-sdk");

const debug = debugAs("mailbots:utils");

export function validateWebhook(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // We do not yet have an authenticated API client, so instantiate from clientid / secret
  const config = res.locals.bot.config;
  const mbClient = new MailBotsClient(config);

  const validateTimestamp = true;
  debug(
    req.headers["x-mailbots-signature"],
    req.headers["x-mailbots-timestamp"],
    (req as any).rawBody
  );
  assert(
    req.headers["x-mailbots-signature"],
    "Webhook validation requires a signature"
  );
  assert(
    req.headers["x-mailbots-timestamp"],
    "Webhook validation requires a timestamp"
  );
  assert(
    (req as any).rawBody,
    "Webhook validation requires the full text body"
  );

  if (
    mbClient.validateWebhook(
      req.headers["x-mailbots-signature"],
      req.headers["x-mailbots-timestamp"],
      (req as any).rawBody,
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
