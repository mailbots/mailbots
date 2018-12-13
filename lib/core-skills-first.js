const MailBotsClient = require("@mailbots/mailbots-sdk");
const request = require("request");
const debug = require("debug")("mailbots");
const uuid = require("uuid/v1");

module.exports = function(mailbot) {
  const config = mailbot.config;
  const mbClient = new MailBotsClient(config);
  const botUtils = require("./bot-utils");
  const BotRequest = require("./bot-request");
  const cookieParser = require("cookie-parser");
  const bodyParser = require("body-parser");
  mailbot.app.use(cookieParser());
  mailbot.app.use(
    // Extract text-only body onto request.rawBody for webhook validation
    bodyParser.json({
      verify: function(req, res, buf, encoding) {
        req.rawBody = buf.toString();
      },
      limit: "50Mb"
    })
  );

  // Create a unique idea for this request, used for making middleware run once
  mailbot.app.use(function(req, res, next) {
    res.locals.requestId = uuid();
    next();
  });

  /**
   * Load a new instance of the base BotRequest object into response.locals.bot
   * Other middleware and event handlers add to this base object to create a skillful bot.
   * Pass config to bot object, deleting Express app first.
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

  // Make bot.isWebhook available on BotRequest for use in handler logic
  mailbot.app.use((req, res, next) => {
    const bot = res.locals.bot;
    bot.isWebhook = req.path === bot.config.webhookRoute;
    next();
  });

  // Default error handler. Overrideen with bot.onError()
  mailbot.setErrorHandler((err, bot) => {
    const errorMsg = `Your MailBot caught an unhandled error. Please contact the bot developer. If you are the bot developer, use mailbot.setErrorHandler() to fail gracefully. View application logs for details.`;
    debug(err);
    bot.response.status(500);
    return bot.webhook.respond({
      webhook: { status: "failed", message: errorMsg }
    });
  });

  /**
   * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   *                   Web Requests Only
   *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   */

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
    const code = req.query.code;
    const stateCookie = req.cookies[AUTH_STATE_COOKIE_NAME];
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

  /**
   * Expose bot.login()
   * Login flow with this and the above method looks like this:
   * if(!bot.isLoggedIn) mailbot.login();
   * This can be omitted for publicly accessible pages
   */
  mailbot.app.use((req, res, next) => {
    res.locals.bot.login = function() {
      res.redirect(LOGIN_ROUTE);
    };
    next();
  });

  /**
   * If on Glitch, auto-init project
   * TODO: Move to auto-init middleware
   */
  function shouldAutoInit(config) {
    const MAX_AGE = 60 * 10 * 1000; // 30 minutes from setup
    if (!process.env.PROJECT_DOMAIN) return false; // Only auto-update on Glitch
    if (!config.creationDate) return false;
    return Date.now() - config.creationDate < MAX_AGE;
  }

  // Auto-init new bot with MailBots
  function autoInit(config) {
    const authToken = new Buffer(
      config.clientId + ":" + config.clientSecret
    ).toString("base64");

    request(
      {
        method: "POST",
        url: config.apiHost + "api/v1/extensions/" + config.botId + "/init",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + authToken
        },
        json: {
          base_url: config.botUrl,
          install_url: config.botUrl + "/auth/login",
          webhook_url: config.botUrl + "/webhooks",
          oauth2_redirect_uri: config.redirectUri
        }
      },
      (err, res) => {
        if (res.statusCode !== 200) {
          console.error("Error initializing bot: " + res.body.message);
        } else {
          debug("Bot successfully initialized!");
        }
      }
    );
  }

  if (shouldAutoInit(config)) autoInit(config);
};
