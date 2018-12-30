const debug = require("debug")("mailbots");
const _ = require("lodash");

/**
 * The 'bot' object passed into the handlers comes with a number
 * of helpers to handle the request. The methods in this class are
 * available under bot.webhook.
 *
 * @example bot.webhook.getExtensionData('memorize.settings');
 * @param {object} botRequest An instnace of BotRequest
 */
class WebhookHelpers {
  constructor({ botRequest }) {
    this.botRequest = botRequest;
    this.requestJson = this.botRequest.requestJson;
    this.responseJson = this.botRequest.responseJson;

    // see this.respond
    this.alreadyResponded = false;
  }

  // Are we able to Object.assign
  _isMergable(obj) {
    return typeof obj === "object" && !Array.isArray(obj) && !_.isNull(obj);
  }

  /**
   * Get the current value of a key.
   * If a value has already been been set
   * on the responseJson object, it return that value,
   * otherwise it returns the value in the request object.
   * @param {string} key JSON path to key
   * @param  {mixed} defaultValue Default if key is falsy
   * @example bot.webhook.get('source.from'); // sender's email address
   * @example bot.get('source.from'); // this method is also aliased directly on bot
   */
  get(key, defaultValue) {
    debug(`get: ${key}`);
    const newlySetValue = _.get(this.responseJson, key);
    const originalValue = _.get(this.requestJson, key, defaultValue);
    if (this._isMergable(originalValue) && this._isMergable(newlySetValue)) {
      return Object.assign({}, originalValue, newlySetValue);
    } else {
      return newlySetValue || originalValue;
    }
  }
  /**
   * Set attributes on the this.responseJson object. If existing value and
   * new value are both objects (not Arrays) they are shallow-merged.
   * If new or old data are not objects, the value of the key is replaced
   * entirely.
   * @param {string} key - JSON Path to object within responseJson object
   * @param {*} value - Value
   * @param {boolean} merge - Objets are shallow-merged by default. Set this to
   * false to force the replacement of an object.
   * @example bot.set('task.reference_email.subject', "New Subject!");
   * @example bot.set('task.reference_email', { subject: "New Subject!"}); // Same effect as above
   */
  set(key, value, merge) {
    merge = merge || true;
    debug(`set: ${key}`);
    const existingValue = this.get(key);
    // If we're setting an object field, shallow merge it
    // If either new or old value is array or other type, replace it.
    if (
      merge &&
      typeof existingValue === "object" &&
      !Array.isArray(existingValue) &&
      !_.isNull(existingValue) &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !_.isNull(value)
    ) {
      let mergedObject = {};
      Object.assign(mergedObject, existingValue, value);
      return _.set(this.responseJson, key, mergedObject);
    } else {
      _.set(this.responseJson, key, null); // lodash wants to merge..reset it first.
      return _.set(this.responseJson, key, value);
    }
  }
  /**
   * Get data for current task
   *  @param {string} key - JSON Path to key within task.private_data
   *  @param {*} defaultValue - If there is no key, return this
   *  @xample bot.webhook.getTaskData("my_bot.widget_setting", 42);
   */
  getTaskData(key, defaultValue) {
    const path = key ? `.${key}` : "";
    return this.get("task.stored_data" + path, defaultValue);
  }

  /**
   * Set data for current task
   * Takes either an object or a lodash _.set path as the first param,
   * optionally a value as the second parameter. Objects are shallow-merged
   * if new and old data are objects. (Arrays and other types are replaced).
   * @example setTaskData('my_bot.magic_number', 42);
   */
  setTaskData(...args) {
    this._initTaskData();
    if (typeof args[0] === "object") {
      return this.set("task.stored_data", args[0]);
    } else if (typeof args[0] === "string") {
      return this.set("task.stored_data." + args[0], args[1]);
    } else {
      throw new Error("setTaskData() unhandled type" + typeof args[0]);
    }
  }
  // Load stored data into responseJson – single source of truth
  _initTaskData() {
    const taskStoredData = _.get(this.responseJson, "task.stored_data");
    if (taskStoredData) return;
    _.set(
      this.responseJson,
      "task.stored_data",
      _.get(this.requestJson, "task.stored_data")
    );
  }

  /**
   * Get data stored in extension.private_data
   * @param {string} key JSON Path to data from extension
   * @param {*} defaultValue If value is undefined, use this value instead
   * @example bot.webhook.getExtensionData('my_bot.setting', 42);
   */
  getExtensionData(key, defaultValue) {
    if (key) {
      return this.get("extension.stored_data." + key, defaultValue);
    } else {
      return this.get("extension.stored_data");
    }
  }

  /**
   * Set data stored in extension.private_data. Objects are shallow merged if
   * existing data is present. All other values (including arrays) are replaced.
   *
   * This method has two signatures. It can take an object as its only param
   * which will be shallowly merged into extension.private_data.
   *
   * It can also take a lodash _.set path as its first parameter and a value
   * as the second.
   *
   * @example bot.webhook.setExtensionData({key: "value"});
   *
   * @example bot.webhook.setExtensionData('foo.bar', "value");
   *
   * @param  {string|object} param Either a lodash set param or an
   * object to be shallowly merged into extension.private_data
   * @param {*} [value] When passing lodash set path string as first
   * param, this is the value.
   */
  setExtensionData(...args) {
    this._initExtensionData();
    if (typeof args[0] === "object") {
      return this.set("extension.stored_data", args[0]);
    } else if (typeof args[0] === "string") {
      return this.set("extension.stored_data." + args[0], args[1]);
    } else {
      throw new Error("setExtensionData() unhandled type: " + typeof args[0]);
    }
  }
  // Load stored data into responseJson – single source of truth
  _initExtensionData() {
    const extensionStoredData = _.get(
      this.responseJson,
      "extension.stored_data"
    );
    if (extensionStoredData) return;
    _.set(
      this.responseJson,
      "extension.stored_data",
      _.get(this.requestJson, "extension.stored_data")
    );
  }

  /**
   * Get the reference email – the abstract, user-editable instance
   * of the email associated with this task. Note this is not the same
   * as the source email (which is the exact email received).
   * @example bot.webhook.getReferenceEmail();
   */
  getReferenceEmail() {
    return this.get("task.reference_email");
  }

  /**
   * Set reference email
   * Shallowly merges refernece email fields, allowing
   * for easy partial updates
   * @param {object} referenceEmail
   * @param {array} referenceEmail.to Array of email address strings
   * @param {array} referenceEmail.cc Array of email address strings
   * @param {array} referenceEmail.bcc Array of email address strings
   * @param {string} referenceEmail.subject Email subject
   * @param {string} referenceEmail.reply_to Email address or action-email
   * @param {string} referenceEmail.html html HTML content of email
   * @param {string} referenceEmail.text html text-only content of email
   * @example bot.webhook.setReferenceEmail({
   *   to: "test@gmail.com",
   *   subject: "A new subject",
   *   html: "This new content replaces the old"
   * });
   */
  setReferenceEmail(referenceEmail) {
    return this.set("task.reference_email", referenceEmail);
  }

  /**
   * Get replyto replyto email from a webhook, taking into account a user
   * or routine changing it before this method is called.
   * @example bot.webhook.getReplyTo();
   */
  getReplyTo() {
    return this.get("task.reference_email.reply_to") || this.get("source.from");
  }

  /**
   * Adds another email message to the "send_messages" array, causing
   * the core API to send an email. Multiple emails can be sent.
   * @param {object} email email object
   * @param {string} email.to comma separated emails
   * @param {string} email.cc comma separated emails
   * @param {string} email.bcc comma separated emails
   * @param {string} email.from from name only (message-envelope is always from mailbots)
   * @param {string} email.reply_to email address or action-email
   * @param {string} email.subject email subject
   * @param {array} email.body Array of ui objects https://docs.mailbots.com/docs/email-ui-reference
   * @returns {object} A reference to the email object for additional changes
   *
   * @example const email = bot.webhook.addEmail({
   *   to: bot.get('source.from'),
   *   subject: "A Subject",
   *   body: [
   *   {
   *    type: 'html',
   *    text: '<h1>An email</h1>'
   *   }]);
   * })
   *
   * email.from = "New Sender"; // still updatable
   */
  addEmail(email) {
    Object.assign(email, { type: "email" });
    let allEmails = this.get("send_messages", []);
    allEmails = allEmails.concat(email);
    this.set("send_messages", allEmails, false);
    // Return a mutable references to the email object just added
    // so we can just do something like: email.subject = "x";
    return this.get("send_messages")[allEmails.length - 1];
  }

  /**
   * Shorthand method to send a quick reply back to the "from" address
   * of the incoming email. The subject and body share the same text.
   * @param {string} text Content
   * @example bot.webhook.quickReply("Got it!");
   */
  quickReply(text) {
    this.addEmail({
      to: this.getReplyTo(),
      subject: text,
      body: [
        {
          type: "html",
          text: text
        }
      ]
    });
  }

  /**
   * Set trigger time for a task using natural language
   * @param {string} time FollowUpThen-style time description
   * @example bot.webhook.setTriggerTime("monday");
   * @example bot.webhook.setTriggerTime("every2ndWeds");
   * @example bot.webhook.setTriggerTime("everyTuesday2pm");
   */
  setTriggerTime(time) {
    if (typeof time === Number)
      throw new Error(`setTriggerTime accepts a natural
        language string. To use a timestamp, use setTriggerTimestamp`);
    this.set("task.trigger_timeformat", time);
  }

  /**
   * Set trigger time for a task using a unix timestamp
   * @param {int} timestamp Unix timestamp of trigger time
   * @example bot.webhook.setTriggerTimestamp(1546139899);
   */
  setTriggerTimestamp(timestamp) {
    this.set("task.trigger_time", timestamp);
  }

  /**
   * Trigger MailBots to invite the given email address(es) to use a bot
   * @param {array} invitees Array of email addresses
   * @example bot.webhook.invite(['user1@email.com','newUser2@gmail.com']);
   */
  invite(invitees) {
    if (!invitees instanceof Array)
      throw new Error("Invitees should accept an array of email addresses");
    this.set("extension.invite", invitees);
  }

  /**
   * Mark task a completed. The task will be archived until permenantly deleted.
   * @example bot.webhook.completeTask();
   */
  completeTask() {
    this.set("task.completed", 1);
  }

  /**
   * Fetch all contacts associated with the task's reference_email. User's
   * address and MailBots addresses are excluded.
   *
   * Note: This uses reference_email, allowing a user to add
   * or remove additional recipients from the task.
   * @returns {array} Email addresses
   * @example bot.webhook.getAllContacts();
   */
  getAllContacts() {
    const toRecipients = this.get("task.reference_email.cc", []);
    const ccRecipients = this.get("task.reference_email.to", []);
    const allRecipients = toRecipients.concat(ccRecipients);
    const externalContacts = allRecipients.filter(email => {
      return (
        !email.startsWith("invite") && !this.get("user.emails").includes(email)
        // && not anything@this-ext-email-domain.com
      );
    });
    return externalContacts;
  }

  /**
   * Respond to (and end) the webhook response with the JSON provided.
   * Multi-fire handlers (like onSettingsViewed) automatically respond.
   * In the case where an error-condition causes an early return / response
   * calling this method prevents the handler from trying to return a
   * second time. Provided JSON is shallowly merged into response object.
   * @param {object} json Response JSON
   * @example bot.webhook.respond();
   */
  respond(json) {
    this.alreadyResponded = true;
    debug("Response JSON", this.responseJson);
    this.botRequest.response.send({ ...this.responseJson, ...json });
  }

  /**
   * @private
   * Has this request been handled?
   * Response considered unhandled if json response is empty
   */
  isUnhandled() {
    _.isEqual(this.responseJson, {
      version: WEBHOOK_API_VERSION
    });
  }

  /**
   * Creates a new settings page, rendered in the Bot Settings section
   * of the Admin UI. See SettingsPage docs for details
   * @param {object} params
   * @param {string} params.namespace Namespace used on extension.private_data
   * @param {string} params.title Page title
   * @param {menuTitle} params.menuTitle Menu item title
   * @example const.settingsPage = bot.webhook.settingsPage({
   *   namespace: "mem",
   *   title: "Memorization Settings",
   *   menuTitle: "Memorization"
   * });
   */
  settingsPage({ namespace, title = "", menuTitle }) {
    const SettingsPage = require("./settings-page");
    return new SettingsPage({
      responseJson: this.responseJson,
      namespace,
      title,
      menuTitle
    });
  }
}

module.exports = WebhookHelpers;
