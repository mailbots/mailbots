import * as cookieParser from "cookie-parser";
import * as bodyParser from "body-parser";
import * as debugAs from "debug";
import * as request from "request";
import { MailBotsClient } from "@mailbots/mailbots-sdk";
const urljoin = require("url-join");

import MailBots from "../mailbots";
import * as botUtils from "./bot-utils";
import BotRequest from "./bot-request";
import { IBotConfig } from "./config-defaults";

const debug = debugAs("mailbots");
const debugAutoInit = debugAs("mailbots:auto-init");

export default function(mailbot: MailBots) {
  const config = mailbot.config;
  const mbClient = new MailBotsClient(config);

  mailbot.app.use(cookieParser());
  mailbot.app.use(
    // Extract text-only body onto request.rawBody for webhook validation
    bodyParser.json({
      verify: function(req, res, buf, encoding) {
        (req as any).rawBody = buf.toString();
      },
      limit: "50Mb"
    })
  );

  /**
   * @private
   * Load a new instance of the base BotRequest object into response.locals.bot
   * Other middleware and event handlers add to this base object to create a skillful bot.
   */
  mailbot.app.use(function(req, res, next) {
    res.locals.bot = new BotRequest(req, res);
    res.locals.bot.config = mailbot.config;
    next();
  });

  if (process.env.NODE_ENV !== "testing") {
    // Validate webhooks
    mailbot.app.post("/webhooks", botUtils.validateWebhook);
  }

  mailbot.app.use(botUtils.initSdkApiClient);

  // Make bot.isWebhook available on BotRequest for use in handler logic
  mailbot.app.use((req, res, next) => {
    const bot: BotRequest = res.locals.bot;
    const webhookRoute = bot.config ? bot.config.webhookRoute : undefined;
    bot.isWebhook = req.path === webhookRoute;
    next();
  });

  // Default error handler. Overrideen with bot.onError()
  mailbot.setErrorHandler((err, bot) => {
    const errorMsg = `Your MailBot caught an unhandled error. Please contact the bot developer. If you are the bot developer, use mailbot.setErrorHandler() to fail gracefully. View application logs for details.`;
    bot.response.status(500);
    if (process.env.SILENCE_DEFAULT_ERROR_HANDLER !== "true")
      console.error(err);
    return bot.webhook.respond({
      webhook: { status: "failed", message: errorMsg }
    });
  });

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  //                   Web Requests Only
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  const LOGIN_ROUTE = "/auth/login";
  const OAUTH_CALLBACK_ROUTE = "/auth/callback";
  const AUTH_STATE_COOKIE_NAME = "state";

  // Redirect to login URL
  mailbot.app.get(LOGIN_ROUTE, (req, res) => {
    try {
      const { uri, state } = mbClient.getAuthorizationUri();
      res.cookie(AUTH_STATE_COOKIE_NAME, state);
      if (req.query.popUpAuth === "1") {
        debug("Refresh opener");
        res.cookie("popUpAuth", 1);
      }
      res.redirect(uri);
    } catch (e) {
      console.log(e);
      res.status(500).send(`There was an error retrieving the
        Authorization URI. This is usually caused by an invalid
        configuration. View server logs for details.`);
    }
  });

  // After user authenticates, parse the auth code and get the access token
  mailbot.app.get(OAUTH_CALLBACK_ROUTE, async (req, res) => {
    const code = req.query.code as string;
    const stateCookie: string = req.cookies[AUTH_STATE_COOKIE_NAME];
    const state = req.query.state;
    if (stateCookie !== state) {
      return res.send(`Error: You may have been redirected to a
      different place from where you started, or your cookies are
       not being saved. (State mis-match)`);
    }

    // @todo: DRY this section
    try {
      const mbClient = new MailBotsClient(config);
      const tokenDetails = await mbClient.getAccessToken(code);
      if (tokenDetails instanceof Error) throw tokenDetails;
      const accessToken = tokenDetails.token.access_token;
      mbClient.setAccessToken(accessToken);
      // Save access token for current domain
      res.cookie(config.accessTokenName, tokenDetails.token.access_token);

      // If we're authorizing in a popup, close it and refresh opener
      if (req.cookies.popUpAuth == 1) {
        debug("popUpAuth cookie detected");
        res.clearCookie("popUpAuth");
        res.send(
          `<script type="text/javascript">window.opener.location.reload(); window.close();</script>`
        );
      } else {
        // Redirect user with auth token to configured URL
        return res.redirect(config.redirectOnLoginWithAuth);
      }
    } catch (e) {
      console.log(e);
      return res.status(400).send(`There was an error fetching your
      access token. This is usually caused by an invalid configuration.
      View logs for details.`);
    }
  });

  // Currently, we only auto-init if on Glitch. We could, however, auto-init when
  function shouldAutoInit(config: IBotConfig) {
    const MAX_AGE = 60 * 10 * 1000; // 10 minutes from setup
    debugAutoInit("process.env.PROJECT_DOMAIN", process.env.PROJECT_DOMAIN);
    debugAutoInit("config.creationDate", config.creationDate);
    if (!process.env.PROJECT_DOMAIN) return false; // Only auto-update on Glitch
    if (!config.creationDate) return false;
    const shouldAutoInit = Date.now() - parseInt(config.creationDate) < MAX_AGE;
    return shouldAutoInit;
  }

  // Auto-init new bot with MailBots
  // Currenly works only with Glitch but useful for any FAAS platform
  function autoInit(config: IBotConfig) {
    const authToken = new Buffer(
      config.clientId + ":" + config.clientSecret
    ).toString("base64");

    const requestOptions = {
      method: "POST",
      url: config.apiHost + "api/v1/mailbots/" + config.mailbotId + "/init",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + authToken
      },
      json: {
        base_url: config.mailbotUrl,
        install_url: urljoin(config.mailbotUrl, "/auth/login"),
        webhook_url: urljoin(config.mailbotUrl, "/webhooks"),
        oauth2_redirect_uri: config.redirectUri
      }
    };
    debugAutoInit("auto-init request attempted", requestOptions);
    request(requestOptions, (err, res) => {
      if (res.statusCode !== 200) {
        debugAutoInit("error initializing mailbot" + res.body.message + err);
      } else {
        debugAutoInit("successfully auto-initialized!");
      }
    });
  }

  if (shouldAutoInit(config)) autoInit(config);
}
