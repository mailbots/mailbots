const _ = require("lodash");
const debug = require("debug")("mailbots");
const crypto = require("crypto");
const uuid = require("uuid/v1");

const WEBHOOK_API_VERSION = "1";

/**
 * This is passed as simply 'bot' into event handler callback
 * functions. It stores a complete reference to the request and
 * response objects for each interaction. MailBot Skills can
 * add tools and features to this base object.
 */
class BotRequest {
  constructor(request, response) {
    this.request = request;
    this.response = response;

    /**
     * Is this request a webhook? This is set in core-skills-first.js.
     */
    this.isWebhook;

    /**
     * Core middleware adds getters and setters on webhook requestJSON and responseJSON
     * Reference
     * https://docs.mailbots.com/reference#webhook-request-reference
     * https://docs.mailbots.com/reference#webhook-response
     */
    this.requestJson = request.body;

    // Webhook response JSON is kept here
    this.responseJson = { version: WEBHOOK_API_VERSION };

    /**
     * Errors are stored here
     */
    this.error;

    /**
     * Warn if lib and webhook versions don't match
     */
    this.checkVersion();

    /**
     * See alreadyRan method below
     */
    this.requestHistoryStack = {};
    this.response.locals.requestId = uuid(); // Unique id for only this request

    /**
     * 3rd party bot developers can (optionally) use middleware to add
     * skills here. bot.skills.memorize();
     */
    this.skills = {};

    /**
     * Instantiate webhook helpers and webhook handling shortcuts
     * for this request.
     */
    const WebhookHelpers = require("./webhook-helpers");
    const webhookHelperInstance = new WebhookHelpers({ botRequest: this });
    this.webhook = webhookHelperInstance;

    // Set up shortcuts
    this.get = this.webhook.get.bind(webhookHelperInstance);
    this.set = this.webhook.set.bind(webhookHelperInstance);
    // prettier-ignore
    this.command = _.get(this.webhook.requestJson, "task.command", "").split("@")[0];
    this.action = _.get(this.webhook.requestJson, "action.format");
    this.event = _.get(this.webhook.requestJson, "event");
  }

  /*
   * Warn if lib and webhook versions don't match
   */
  checkVersion() {
    if (
      this.requestJson &&
      this.requestJson.version &&
      this.requestJson.version != WEBHOOK_API_VERSION
    ) {
      console.warn(
        `WARNING: This MailBots Webhook and your library do not have matching versions. This can cause unexpected behavior.`
      );
    }
  }

  /**
   * Internal method to ensure middleware is run once
   * MailBot skills can be be required aagin and again like so:
   * const { myFun } = require('my-skill')(mailbot);
   * The problem is when 'my-skill' registers middleware functions. In this case,
   * each middleware function gets called multiple times. Eventually we will
   * create the `mailbot.use` middleware wrapper to de-duplciate these. For now,
   * We are storing a FILO hash table of requestids | function. If that function
   * has been run for that requestid, we do not run it.
   */
  alreadyRan(middleWareFunction) {
    const fn = crypto
      .createHash("md5")
      .update(middleWareFunction.toString())
      .digest("hex");
    const requestId = this.response.locals && this.response.locals.requestId;
    if (this.requestHistoryStack[requestId] === fn) {
      return true; // already run
    } else {
      this.requestHistoryStack[requestId] = fn;
      if (this.requestHistoryStack.length > 1000) {
        this.requestHistoryStack.shifrt(); // remove oldest item
      }
      return false;
    }
  }
}
module.exports = BotRequest;
