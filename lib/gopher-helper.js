const _ = require("lodash");
const debug = require("debug")("gopher-app");
const crypto = require("crypto");

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
const WEBHOOK_API_VERSION = "1";

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
    this.requestJson = request.body;
    this.responseJson = { version: WEBHOOK_API_VERSION }; // Webhook response JSON stored here

    /**
     * Gopher skills are designed to be required aagin and again like so:
     * const { myFun } = require('my-skill')(gopherApp);
     * The problem is when 'my-skill' registers middleware functions. In this case,
     * each middleware function gets called multiple times. Eventually we will
     * create the `gopherApp.use` middleware wrapper to de-duplciate these. For now,
     * We are storing a FILO hash table of requestids | function. If that function
     * has been run for that requestid, we do not run it.
     */
    this.requestHistoryStack = {};
    this.alreadyRan = function(middleWareFunction) {
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
    };

    if (
      this.requestJson &&
      this.requestJson.version &&
      this.requestJson.version != WEBHOOK_API_VERSION
    ) {
      console.warn(
        `WARNING: This Gopher Webhook and your library do not have matching versions. This can cause unexpected behavior.`
      );
    }

    // Are we able to Object.assign
    this._isMergable = function(obj) {
      return typeof obj === "object" && !Array.isArray(obj) && !_.isNull(obj);
    };

    const helperInstance = this;

    this.webhook = {
      requestJson: helperInstance.requestJson,
      responseJson: helperInstance.responseJson,

      /**
       * Helper method to get the current value of a key.
       * If a new value has been already been set
       * on the responseJson object, it return that value,
       * not the value in the request object.
       */
      get: function(key, defaultValue) {
        debug(`get: ${key}`);
        const newlySetValue = _.get(this.responseJson, key);
        const originalValue = _.get(this.requestJson, key, defaultValue);
        if (
          this._isMergable(originalValue) &&
          this._isMergable(newlySetValue)
        ) {
          return Object.assign({}, originalValue, newlySetValue);
        } else {
          return newlySetValue || originalValue;
        }
      }.bind(helperInstance),

      /**
       * Helper method to set attributes on response object, taking into account
       *  - Merging key / value pairs into object fields
       *  - TODO: Failing or warning if an existing key / value pair is already there
       */
      set: function(key, value, merge = true) {
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
      }.bind(helperInstance),

      // Get data for current task
      getTaskData: function(key, defaultValue) {
        const path = key ? `.${key}` : "";
        return this.get("task.stored_data" + path, defaultValue);
      },

      // Takes either an object: Ex: setTaskData({key: "value"});
      // Or a lodash _.set path: Ex: setTaskData('foo.bar', "value");
      setTaskData: function(...args) {
        this._initTaskData();
        if (typeof args[0] === "object") {
          return this.set("task.stored_data", args[0]);
        } else if (typeof args[0] === "string") {
          return this.set("task.stored_data." + args[0], args[1]);
        } else {
          throw new Error("setTaskData() unhandled type" + typeof args[0]);
        }
      },

      // Load stored data into responseJson – single source of truth
      _initTaskData: function() {
        const taskStoredData = _.get(this.responseJson, "task.stored_data");
        if (taskStoredData) return;
        _.set(
          this.responseJson,
          "task.stored_data",
          _.get(this.requestJson, "task.stored_data")
        );
      },

      getExtensionData: function(key, defaultValue) {
        if (key) {
          return this.get("extension.stored_data." + key, defaultValue);
        } else {
          return this.get("extension.stored_data");
        }
      },

      // Takes either an object: Ex: setExtensionData({key: "value"});
      // Or a lodash _.set path: Ex: setExtensionData('foo.bar', "value");
      setExtensionData: function(...args) {
        this._initExtensionData();
        if (typeof args[0] === "object") {
          return this.set("extension.stored_data", args[0]);
        } else if (typeof args[0] === "string") {
          return this.set("extension.stored_data." + args[0], args[1]);
        } else {
          throw new Error(
            "setExtensionData() unhandled type: " + typeof args[0]
          );
        }
      },

      // Load stored data into responseJson – single source of truth
      _initExtensionData: function() {
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

      quickReply: function(text) {
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

      alreadyResponded: false,

      respond: function(json) {
        this.alreadyResponded = true;
        debug("Response JSON", this.responseJson);
        helperInstance.response.send({ ...this.responseJson, ...json });
      },

      // Response considered unhandled if json response is empty
      isUnhandled: () =>
        _.isEqual(this.responseJson, {
          version: WEBHOOK_API_VERSION
        }),

      /**
       * Form Helpers
       * Create a new settings form for a given namespace using
       * https://github.com/mozilla-services/react-jsonschema-form
       *
       * Note: Include `"ui:emptyValue": ""` in the uiSchema in new form elements
       */
      settingsPage: function({ namespace, title = "", menuTitle }) {
        if (!namespace) throw new Error("A namespace is required");
        const settingsFormJSON = {
          JSONSchema: {
            title,
            type: "object",
            properties: {
              // json schema properties populated by form helpers (as are the fields below)
            }
          },
          uiSchema: {
            // ui descriptions
          },
          formData: {
            // form values
          },
          formMeta: {
            // general / meta data about the form
            menuTitle: menuTitle || title || namespace
          }
        };

        // todo: validate schemas, throw nice errors
        const normalizeFormData = settings => settings || {};

        this.responseJson.settings = normalizeFormData(
          this.responseJson.settings
        );
        this.responseJson.settings[namespace] = settingsFormJSON;

        const formHelpers = {
          // Lower-level function to insert raw JSONSchema and uiSchema to create custom form elements.
          insert: function({ name, JSONSchema, uiSchema }) {
            settingsFormJSON.JSONSchema.properties[name] = JSONSchema;
            if (uiSchema) {
              settingsFormJSON.uiSchema[name] = uiSchema;
            }
          }.bind(settingsFormJSON),

          input: function({
            name,
            title,
            description,
            helpText,
            placeholder,
            defaultValue
          }) {
            this.JSONSchema.properties[name] = {
              type: "string",
              title,
              description
            };
            this.uiSchema[name] = {
              "ui:help": helpText,
              "ui:placeholder": placeholder,
              "ui:emptyValue": ""
            };
            if (defaultValue) {
              this.formData[name] = defaultValue;
            }
          }.bind(settingsFormJSON),

          textarea: function({
            name,
            title,
            description,
            helpText,
            placeholder,
            defaultValue
          }) {
            this.JSONSchema.properties[name] = {
              type: "string",
              title,
              description
            };
            this.uiSchema[name] = {
              "ui:help": helpText,
              "ui:widget": "textarea",
              "ui:placeholder": placeholder,
              "ui:emptyValue": ""
            };
            if (defaultValue) {
              this.formData[name] = defaultValue;
            }
          }.bind(settingsFormJSON),

          checkbox: function({
            name,
            title,
            description,
            helpText,
            defaultValue
          }) {
            this.JSONSchema.properties[name] = {
              type: "boolean",
              title,
              description
            };
            this.uiSchema[name] = {
              "ui:emptyValue": false,
              "ui:help": helpText
            };
            if (defaultValue) {
              this.formData[name] = defaultValue;
            }
          }.bind(settingsFormJSON),

          select: function({
            name,
            title,
            description,
            helpText,
            options,
            placeholder,
            defaultValue
          }) {
            if (!options instanceof Array)
              throw new Error("options must be an array");
            this.JSONSchema.properties[name] = {
              type: "string",
              description,
              title,
              enum: options
            };
            this.uiSchema[name] = {
              "ui:help": helpText,
              "ui:placeholder": placeholder,
              "ui:emptyValue": ""
            };
            if (!title) {
              Object.assign(this.uiSchema[name], {
                "ui:options": {
                  label: false
                }
              });
            }
            if (defaultValue) {
              this.formData[name] = defaultValue;
            }
          }.bind(settingsFormJSON),

          // Adds a custom dialog at the top of the display form that can be used
          // for interrupt-messaging. Settings forms with alert dialogs are prioritize above
          // other settings in the Gopher Admin UI.
          alert: function({ title, text, linkText, linkHref }) {
            if (this.JSONSchema.properties.alert) {
              console.warn(
                `A settings form can only have one alert. The "${title}" alert will not be shown. `
              );
              return;
            }
            this.JSONSchema.properties.alert = {
              type: "string"
            };
            this.uiSchema.alert = {
              "ui:widget": "customAlertWidget",
              "ui:options": {
                title,
                text,
                linkText,
                linkHref,
                label: false
              }
            };
            this.uiSchema.alert = {
              "ui:emptyValue": ""
            };
          }.bind(settingsFormJSON),

          // embed a youtube video
          video: function({ url = "", type = "youtube" }) {
            if (!url) throw new Error("A YouTube URL was not provided");
            if (type !== "youtube")
              throw new Error("Only type `youtube` is supported");
            const name = `_md_${Math.random()
              .toString()
              .substr(2, 10)}`;
            this.JSONSchema.properties[name] = {
              type: "string"
            };

            this.uiSchema[name] = {
              "ui:widget": "customYouTubeEmbedWidget",
              classNames:
                "embed-responsive embed-responsive-16by9 golden-ratio-16by9",
              "ui:options": {
                url,
                label: false
              },
              "ui:emptyValue": ""
            };
          }.bind(settingsFormJSON),

          // A custom, markdown-enabled way to add markdown to the form
          text: function(text) {
            const name = `_md_${Math.random()
              .toString()
              .substr(2, 10)}`;
            this.JSONSchema.properties[name] = {
              type: "string"
            };
            this.uiSchema[name] = {
              "ui:widget": "customTextWidget",
              "ui:emptyValue": "",
              "ui:options": {
                label: false,
                text
              }
            };
          }.bind(settingsFormJSON),

          // Hidden input
          hiddenInput: function({ name, value }) {
            this.JSONSchema.properties[name] = {
              type: "string"
            };
            this.uiSchema[name] = {
              "ui:widget": "hidden",
              "ui:emptyValue": ""
            };
            if (value) {
              this.formData[name] = defaultValue;
            }
          }.bind(settingsFormJSON),

          // Add custom submit button, allow URL params to be passed
          // Submit button is not rendered if not passed
          submitButton: function({ submitText, urlParams }) {
            this.formMeta.hasSubmitButton = true;
            this.formMeta.submitText = submitText || "Save Settings";
            this.formMeta.urlParams = urlParams || {};
          }.bind(settingsFormJSON),

          // Populate form data, overwriting default values with those newly passed
          populate: function(formData) {
            Object.assign(this.formData, formData);
          }.bind(settingsFormJSON)
        };

        return formHelpers;
      }
    };

    this.get = this.webhook.get;
    this.set = this.webhook.set;

    /**
     * General info about the task
     */
    this.command = _.get(this.webhook.requestJson, "task.command", "").split(
      "@"
    )[0];
    this.action = _.get(this.webhook.requestJson, "action.format");
    this.event = _.get(this.webhook.requestJson, "event");
  }
}
module.exports = GopherHelper;
