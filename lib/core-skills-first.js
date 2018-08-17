const Gopher = require("gopherhq");
const request = require("request");

module.exports = function(gopherApp) {
  const config = gopherApp.config;
  const gopherClient = new Gopher(config);
  const gopherUtils = require("../lib/gopher-utils");
  const bodyParser = require("body-parser");
  gopherApp.app.use(bodyParser.json());
  const cookieParser = require("cookie-parser");
  gopherApp.app.use(cookieParser());
  const GopherHelper = require("./gopher-helper");

  /**
   * Load a new instance of the base GopherHelper object into response.locals.gopher
   * Other middleware and event handlers add to this base object to create a skillful gopher.
   * Pass config to gopher object, deleting Express app first.
   */
  gopherApp.app.use(function(request, response, next) {
    response.locals.gopher = new GopherHelper(request, response);
    response.locals.gopher.config = config;
    next();
  });

  /**
   *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   *                     Webhooks Only
   *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   */

  /**
   * Middleware: Validate inbound webhooks and provide an
   * authenticated Gopher API client on res.locals.gopherClient
   */
  if (process.env.NODE_ENV === "testing") {
    gopherApp.app.use(gopherUtils.isWebhook, gopherUtils.initGopherApiClient);
  } else {
    gopherApp.app.post(gopherUtils.isWebhook, gopherUtils.rawBody);
    gopherApp.app.post(gopherUtils.isWebhook, gopherUtils.validateWebhook);
    gopherApp.app.use(gopherUtils.initGopherApiClient);
  }

  /**
   * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   *                   Web Requests Only
   *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   */

  const LOGIN_ROUTE = "/auth/login";
  const OAUTH_CALLBACK_ROUTE = "/auth/callback";
  const AUTH_STATE_COOKIE_NAME = "state";

  // Redirect to login URL
  gopherApp.app.get(LOGIN_ROUTE, (req, res) => {
    try {
      const { uri, state } = gopherClient.getAuthorizationUri();
      res.cookie(AUTH_STATE_COOKIE_NAME, state).redirect(uri);
    } catch (e) {
      console.log(e);
      res.status(500).send(`There was an error retrieving the 
        Authorization URI. This is usually caused by an invalid 
        configuration. View server logs for details.`);
    }
  });

  // After user authenticates, parse the auth code and get the access token
  gopherApp.app.get(OAUTH_CALLBACK_ROUTE, async (req, res) => {
    const code = req.query.code;
    const stateCookie = req.cookies[AUTH_STATE_COOKIE_NAME];
    const state = req.query.state;
    if (stateCookie !== state) {
      return res.send(`Error: You may have been redirected to a 
      different place from where you started, or your cookies are
       not being saved. (State mis-match)`);
    }

    try {
      const gopherClient = new Gopher(config);
      const tokenDetails = await gopherClient.getAccessToken(code);
      if (tokenDetails instanceof Error) throw tokenDetails;
      const accessToken = tokenDetails.token.access_token;
      gopherClient.setAccessToken(accessToken);
      gopherClient.saveExtensionData({ gopher_token: accessToken });
      return res
        .cookie(config.accessTokenName, tokenDetails.token.access_token)
        .redirect(config.redirectOnLoginWithAuth);
    } catch (e) {
      console.log(e);
      return res.status(400).send(`There was an error fetching your 
      access token. This is usually caused by an invalid configuration. 
      View logs for details.`);
    }
  });

  /**
   * Expose gopher.login()
   * Login flow with this and the above method looks like this:
   * if(!gopher.isLoggedIn) gopher.login();
   * This can be omitted for publicly accessible pages
   */
  gopherApp.app.use(gopherUtils.notWebhook, (req, res, next) => {
    res.locals.gopher.login = function() {
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

  // Auto-init new extension with Gopher
  function autoInit(config) {
    const authToken = new Buffer(
      config.clientId + ":" + config.clientSecret
    ).toString("base64");

    request(
      {
        method: "POST",
        url:
          config.apiHost + "api/v1/extensions/" + config.extensionId + "/init",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + authToken
        },
        json: {
          base_url: config.extensionUrl,
          install_url: config.extensionUrl + "/auth/login",
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
};
