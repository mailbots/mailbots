const debug = require("debug")("mailbots");
const _ = require("lodash");

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
  // Get data for current task
  getTaskData(key, defaultValue) {
    const path = key ? `.${key}` : "";
    return this.get("task.stored_data" + path, defaultValue);
  }
  // Takes either an object: Ex: setTaskData({key: "value"});
  // Or a lodash _.set path: Ex: setTaskData('foo.bar', "value");
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
  getExtensionData(key, defaultValue) {
    if (key) {
      return this.get("extension.stored_data." + key, defaultValue);
    } else {
      return this.get("extension.stored_data");
    }
  }
  // Takes either an object: Ex: setExtensionData({key: "value"});
  // Or a lodash _.set path: Ex: setExtensionData('foo.bar', "value");
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

  getReferenceEmail() {
    return this.get("task.reference_email");
  }
  setReferenceEmail(getReferenceEmail) {
    return this.set("task.reference_email", getReferenceEmail);
  }
  // Gets replyto email from a webhook, taking into account a user
  // changing it via the reference_email
  getReplyTo() {
    return this.get("task.reference_email.reply_to") || this.get("source.from");
  }
  addEmail(email) {
    Object.assign(email, { type: "email" });
    let allEmails = this.get("send_messages", []);
    allEmails = allEmails.concat(email);
    this.set("send_messages", allEmails, false);
    // Return a mutable references to the email object just added
    // so we can just do something like: email.subject = "x";
    return this.get("send_messages")[allEmails.length - 1];
  }
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
  setTriggerTime(time) {
    if (typeof time === Number)
      throw new Error(`setTriggerTime accepts a natural
        language string. To use a timestamp, use setTriggerTimestamp`);
    this.set("task.trigger_timeformat", time);
  }
  setTriggerTimestamp(timestamp) {
    this.set("task.trigger_time", timestamp);
  }
  invite(invitees) {
    if (!invitees instanceof Array)
      throw new Error("Invitees should accept an array of email addresses");
    this.set("extension.invite", invitees);
  }
  completeTask() {
    this.set("task.completed", 1);
  }
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

  // Multi-fire handlers (like onSettingsViewed) automatically respond.
  // In the case where an error-condition cuases an early return / response
  // this prevents the handler from returning a second time.
  respond(json) {
    this.alreadyResponded = true;
    debug("Response JSON", this.responseJson);
    this.botRequest.response.send({ ...this.responseJson, ...json });
  }
  // Response considered unhandled if json response is empty
  isUnhandled() {
    _.isEqual(this.responseJson, {
      version: WEBHOOK_API_VERSION
    });
  }

  /**
   * Form Helpers
   * Create a new settings form for a given namespace using
   * https://github.com/mozilla-services/react-jsonschema-form
   *
   * Note: Include `"ui:emptyValue": ""` in the uiSchema in new form elements
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
