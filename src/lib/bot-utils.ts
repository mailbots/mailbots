import * as express from "express";
import * as debugAs from "debug";
import * as assert from "assert";
import { MailBotsClient } from "@mailbots/mailbots-sdk";
import BotRequest from "./bot-request";
import { IBotConfig } from "./config-defaults";

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
      req.headers["x-mailbots-signature"] as any,
      req.headers["x-mailbots-timestamp"] as any,
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

/**
 * Sets an authenticated insteance of MailBots SDK client
 * https://github.com/mailbots/mailbots-sdk-js for use in events
 * and middleware under bot.api. Works both with webhook + web request
 */
export function initSdkApiClient(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const bot: BotRequest = res.locals.bot;
  const config: IBotConfig = res.locals.bot.config;
  const api = new MailBotsClient(config);
  (bot as any).api = api;

  const accessToken = bot.webhook.getMailBotData(
    config.accessTokenName || req.cookies[config.accessTokenName]
  );

  if (accessToken) {
    api.setAccessToken(accessToken);
  }

  next();
}
