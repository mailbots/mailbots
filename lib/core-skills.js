const envConfig = require("./config");
const Gopher = require("gopherhq");

module.exports = function(gopherApp) {
  const config = Object.assign({}, envConfig, gopherApp.config);
  delete config.app;
  const gopherClient = new Gopher(config);
  const gopherUtils = require("../lib/gopher-utils");
  const bodyParser = require("body-parser");
  gopherApp.app.use(bodyParser.json());
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
   *                        Webhooks
   *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   */

  /**
   * Middleware: Validate inbound webhooks and provide an
   * authenticated Gopher API client on res.locals.gopherClient
   */
  if (process.env.TESTING) {
    gopherApp.app.use(
      gopherUtils.isWebhook,
      gopherUtils.setApiClientFromWebhook
    );
  } else {
    gopherApp.app.post(gopherUtils.isWebhook, gopherUtils.rawBody);
    gopherApp.app.post(gopherUtils.isWebhook, gopherUtils.validateWebhook);
    gopherApp.app.post(
      gopherUtils.isWebhook,
      gopherUtils.setApiClientFromWebhook
    );
  }

  /**
   * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   *                        Web Requests
   *  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   */

  const cookieParser = require("cookie-parser");
  gopherApp.app.use(cookieParser());

  // Redirect to login URL
  gopherApp.app.get("/auth/login", (req, res) => {
    const { uri, state } = gopherClient.getAuthorizationUri();
    res.cookie("gopherState", state).redirect(uri);
  });

  // After user authenticates, parse the auth code and get the access token
  gopherApp.app.get("/auth/callback", async (req, res) => {
    const code = req.query.code;
    const stateCookie = req.cookies.gopherState;
    const state = req.query.state;
    if (stateCookie !== state) {
      return res.send(
        "Error: You may have been redirected to a different place from where you started, or your cookies are not being saved. (State mis-match)"
      );
    }

    try {
      const gopherClient = new Gopher(config);
      const tokenDetails = await gopherClient.getAccessToken(code);
      if (tokenDetails instanceof Error) throw tokenDetails;
      const accessToken = tokenDetails.token.access_token;
      gopherClient.setAccessToken(accessToken);
      gopherClient.saveExtensionData({ gopher_token: accessToken });
      return res
        .cookie("gopherToken", tokenDetails.token.access_token)
        .redirect(config.redirectOnLoginWithAuth);
    } catch (e) {
      console.log(e);
      return res.send(
        400,
        "There was an error fetching your authentication token (view logs for details)"
      );
    }
  });
};
