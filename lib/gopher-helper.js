const _ = require("lodash");

/**
 * This is passed as simply 'gopher' into event handler callback
 * functions. It stores a complete reference to the request and
 * response objects for each interaction. Gopher Skills (middleware)
 * add tools and features to this base object. Core Skills add
 * a Gopher API client and webhook helpers. Extension developers
 * can append their skill to the gopher.skills object to expose their
 * own middleware. By the time it is passed into an event handler
 * it's pretty talented little rodent.
 */

class GopherHelper {
  constructor(request, response) {
    this.request = request;
    this.response = response;
    /**
     * Developers use middleware to add / use Gopher's mad skillz. Ex: gopher.skills.memorize();
     */
    this.skills = {};

    /**
     * Core middlware adds an instance of the gopher API after the webhook has been validated;
     */
    this.api = {};

    /**
     * Is this is a webhook? Established in core-skills.
     */
    this.isWebhook;

    /**
     * Core middleware adds getters and setters on webhook requestJSON and responseJSON
     * TODO: Improve design pattern for extending / mounting object
     * Reference
     * https://docs.gopher.email/reference#webhook-request-reference
     * https://docs.gopher.email/reference#webhook-response
     */
    this.WEBHOOK_API_VERSION = "1";
    this.requestJson = request.body;
    this.responseJson = { version: this.WEBHOOK_API_VERSION }; // Webhook response JSON stored here

    if (
      this.isWebhook &&
      this.requestJson.version != this.WEBHOOK_API_VERSION
    ) {
      console.warn(
        `WARNING: This Gopher Webhook and your library do not have matching versions. This can cause unexpected behavior.`
      );
    }

    const helperInstance = this;

    this.webhook = {
      requestJson: helperInstance.requestJson,
      responseJson: helperInstance.responseJson,

      /**
       * Helper method to get the current value of a key.
       * If a new value has been already been set
       * on the responseJson object, it return that value
       * or, in some cases, a merged copy of the object
       */
      get: function(key, defaultValue) {
        const newlySetValue = _.get(this.responseJson, key);
        const originalValue = _.get(this.requestJson, key, defaultValue);
        const mergableKeys = ["task", "extension"];
        if (mergableKeys.includes(key)) {
          let mergedValue = {};
          const objectAssignDeep = require("object-assign-deep");
          objectAssignDeep(mergedValue, originalValue, newlySetValue);
          return mergedValue;
        } else {
          return newlySetValue || originalValue;
        }
      }.bind(helperInstance),

      /**
       * Helper method to set attributes on response object, taking into account
       *  - Merging key / value pais into object fields
       *  - TODO: Failing or warning if an existing key / value pair is already there
       */
      set: function(key, value, merge = true) {
        const existingValue =
          _.get(this.responseJson, key) || _.get(this.requestJson, key);

        // TODO: Throw error / warning if responseJson already has the key (deeply) set.
        // If we're setting an object field.
        if (
          merge &&
          typeof existingValue === "object" &&
          typeof value === "object"
        ) {
          let mergedObject = {};
          _.merge(mergedObject, existingValue, value);
          return _.set(this.responseJson, key, mergedObject);
        } else {
          return _.set(this.responseJson, key, value);
        }
      }.bind(helperInstance),

      getTaskData: function(key, defaultValue) {
        return this.get("task.private_data." + key, defaultValue);
      },

      // Takes either an object: Ex: setTaskData({key: "value"});
      // Or a lodash _.set path: Ex: setTaskData('foo.bar', "value");
      setTaskData: function(...args) {
        if (typeof args[0] === "object") {
          return this.set("task.private_data", args[0]);
        } else if (typeof args[0] === "string") {
          return this.set("task.private_data." + args[0], args[1]);
        } else {
          throw new Error("setTaskData() unhandled type" + typeof args[0]);
        }
      },

      getExtensionData: function(key, defaultValue) {
        return this.get("extension.private_data." + key, defaultValue);
      },

      // Takes either an object: Ex: setExtensionData({key: "value"});
      // Or a lodash _.set path: Ex: setExtensionData('foo.bar', "value");
      setExtensionData: function(...args) {
        if (typeof args[0] === "object") {
          return this.set("extension.private_data", args[0]);
        } else if (typeof args[0] === "string") {
          return this.set("extension.private_data." + args[0], args[1]);
        } else {
          throw new Error(
            "setExtensionData() unhandled type: " + typeof args[0]
          );
        }
      },

      getReferenceEmail: function() {
        return this.get("task.reference_email");
      },

      setReferenceEmail: function(getReferenceEmail) {
        return this.set("task.reference_email", getReferenceEmail);
      },

      // Gets replyto email from a webhook, taking into account a user
      // changing it via the reference_email
      getReplyTo: function() {
        return (
          this.get("task.reference_email.reply_to") || this.get("source.from")
        );
      },

      addEmail: function(email) {
        Object.assign(email, { type: "email" });
        let allEmails = this.get("send_messages", []);
        allEmails = allEmails.concat(email);
        this.set("send_messages", allEmails, false);

        // Return a mutable references to the email object just added
        // so we can just do something like: email.subject = "x";
        return this.get("send_messages")[allEmails.length - 1];
      },

      addQuickReply: function(text) {
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
      },

      setTriggerTime: function(time) {
        if (typeof time === Number)
          throw new Error(`setTriggerTime accepts a natural 
          language string. To use a timestamp, use setTriggerTimestamp`);
        this.set("task.trigger_timeformat", time);
      },

      setTriggerTimestamp: function(timestamp) {
        this.set("task.trigger_time", timestamp);
      },

      invite: function(invitees) {
        if (!invitees instanceof Array)
          throw new Error("Invitees should accept an array of email addresses");
        this.set("extension.invite", invitees);
      },

      completeTask: function() {
        this.set("task.completed", 1);
      },

      getAllContacts: function() {
        const toRecipients = this.get("task.reference_email.cc", []);
        const ccRecipients = this.get("task.reference_email.to", []);
        const allRecipients = toRecipients.concat(ccRecipients);
        const externalContacts = allRecipients.filter(email => {
          return (
            !email.startsWith("invite") &&
            !this.get("user.emails").includes(email)
            // && not anything@this-ext-email-domain.com
          );
        });
        return externalContacts;
      },

      respond: function() {
        helperInstance.response.send(this.responseJson);
      }
    };

    this.get = this.webhook.get;
    this.set = this.webhook.set;

    /**
     * General info about the task
     */
    this.command = _.get(this.webhook.requestJson, "command.format");
    this.action = _.get(this.webhook.requestJson, "action.format");
  }
}
module.exports = GopherHelper;
