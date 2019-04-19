const _ = require("lodash");
const express = require("express");
const getConfig = require("./lib/config-defaults");
const debug = require("debug")("mailbots");

/**
 * Create a new MailBot
 *
 * Optionally instantiate with config. Pass any key shown in config.js.
 * @param {object} config
 */
class MailBots {
  constructor(instanceConfig) {
    const config = getConfig(instanceConfig);
    debug("instantiating MailBots instance with config:", config);
    if (!config.clientId || !config.clientSecret) {
      throw new Error(
        "MailBots is not configured. Read more: https://github.com/mailbots/mailbots"
      );
    }

    this.app = (config && config.app) || express();

    // Config opts are also available to the user via bot.config
    this.config = config;

    // Listens for anything posted to /webhooks, firing appropriate listener.
    this.listeners = [];

    // Listener functions that build this.aggregateSettingsResponse
    this.settingsHandlers = [];

    // Listener functions that build this.aggregateSettingsResponse
    this.multiFireListeners = [];

    // As settings handlers are executed,
    this.aggregateSettingsResponse = {};

    // Developer-defined function to handle errors
    this.errorHandler = null;

    // Set up base skills
    this.loadFirstCoreSkills();
  }

  /**
   * Loads final skills and start http server.
   * Anything posted to /webhooks route is automatically handled.
   * Other routes must be created as usual with the Express App object.
   * For example: mailbots.app.get("my-route/", (req, res) => {});
   */
  listen() {
    this.loadLastCoreSkills();
    const listener = this.app.listen(process.env.PORT || 3011, function() {
      console.log(
        "Your MailBot is listening on port " + listener.address().port
      );
    });
  }

  /**
   * Export app for automated testing
   */
  exportApp() {
    debug("exporting MailBots App");
    this.loadLastCoreSkills();
    return this.app;
  }

  /**
   * @private
   * Loads base MailBot skills
   * Skills are Express middleware and route handlers. Some must be called before
   * any other middleware / skill is added. For example, auth, loading BotRequest, etc.
   * Other skills must be called last, ex: a catch-all redirect for web request.
   * Users can specify their own order of skills by adding skills line-by-line,
   * or by loading skill directories (with mailbot.loadSkill()) in order.
   */
  loadFirstCoreSkills() {
    require("./lib/core-skills-first")(this);
  }

  /**
   * @private
   * Loads final skills
   */
  loadLastCoreSkills() {
    this.app.post(this.config.webhookRoute, this.handleEvent.bind(this));
    require("./lib/core-skills-last")(this);
  }

  /**
   * @private
   * See commit 9afba5d6 for simplified bot middlware idea
   */
  use() {
    throw new Error("Call mailbots.app.use to add Express middleware");
  }

  /**
   * Load MailBots skills from a directory, non-recursively.
   * This can be called more than once to load skills in order. Skills loaded
   * this method are preceeded by loadFirstCoreSkills, succeeded by loadLastCoreSkills.
   * This can also receive a path to a file.
   * @param {string} skillPath path to skills directory
   * @param {object} config optional skill configuration object
   */
  loadSkill(skill, config) {
    debug("loading skill");
    const fs = require("fs");
    const path = require("path");

    // Loading npm modules and straight functions
    if (typeof skill === "function") {
      skill(this, config);

      // Load an individual skill file
    } else if (!this.isDirectory(skill)) {
      require(skill)(this, config);

      // Loading all skills in a directory
    } else if (this.isDirectory(skill)) {
      const skillFiles = fs.readdirSync(skill);
      skillFiles.sort().forEach(file => {
        const fullPath = path.join(skill, file);
        if (!this.isDirectory(fullPath)) {
          const skill = require(fullPath);
          if (typeof skill === "function") {
            skill(this, config);
          } else {
            console.warn(
              fullPath +
                " was was not loaded because it did not export a function that accepts `mailbot`."
            );
          }
        }
      });

      // Unexpected
    } else {
      throw new Error("Skill type unrecognized by mailbots.loadSkill()");
    }
  }

  /**
   * @private
   * Is directory?
   * @param {string} path full file path
   */
  isDirectory(path) {
    return require("fs")
      .statSync(path)
      .isDirectory();
  }

  /**
   * Add handler for a given webhook event. Executes only the first handler
   * for a matching event. The first parameter can be either a string
   * (the named webhook event) or a function that is passed the webhook and
   * returns true or false to indicate if the handler should be run.
   * Example: controller.on('task.created', (bot, req, res) => { });
   * Example: controller.on((webhook) => webhook.event === 'task.created', cb)
   * @param {string|function} event A webhook event string (ex: task.created). Or
   * a function receives the webhook as a param, which returns a boolean value.
   * @param {function} cb Handler function
   */
  on(triggerCondition, cb, opts) {
    if (this._listenerAlreadyAdded({ triggerCondition, cb, opts })) {
      debug("ignoring duplicate listener");
      return;
    }
    debug("adding listener");
    if (opts && opts.multiFire) {
      this.multiFireListeners.push({ triggerCondition, cb });
    } else {
      this.listeners.push({ triggerCondition, cb });
    }
  }

  /**
   * @private
   * Prevent adding duplicate listener functions
   * @param {function} params.triggerCondition - see "on" function.
   * @param {function} params.db - same as "on" function
   * @param {opts} params.opts - same as "on" function
   */
  _listenerAlreadyAdded({ triggerCondition, cb, opts }) {
    function duplicateExists(listnersArray) {
      return listnersArray.some(listener => {
        const dupTriggerCondition = _.isEqual(
          listener.triggerCondition.toString(),
          triggerCondition.toString()
        );

        const dupCb = _.isEqual(listener.cb.toString(), cb.toString());
        return dupTriggerCondition && dupCb;
      });
    }

    if (opts && opts.multiFire) {
      return duplicateExists(this.multiFireListeners);
    } else {
      return duplicateExists(this.listeners);
    }
  }

  /**
   * Captures only 'task.created' events where the command string matches
   * @param {string|RexExp} commandSearch
   */
  onCommand(commandSearch, cb) {
    if (commandSearch instanceof RegExp) {
      this.on(webhook => {
        return (
          webhook.event === "task.created" &&
          commandSearch.exec(this.getTaskCommand(webhook))
        );
      }, cb);
    } else {
      this.on(
        webhook =>
          webhook.event === "task.created" &&
          this.getTaskCommand(webhook) === commandSearch,
        cb
      );
    }
  }

  /**
   * Captures only 'task.triggered' events where the command string matches
   * @param {string|RexExp} commandSearch
   */
  onTrigger(commandSearch, cb) {
    if (commandSearch instanceof RegExp) {
      this.on(webhook => {
        return (
          webhook.event === "task.triggered" &&
          commandSearch.exec(this.getTaskCommand(webhook))
        );
      }, cb);
    } else {
      this.on(
        webhook =>
          webhook.event === "task.triggered" &&
          this.getTaskCommand(webhook) === commandSearch,
        cb
      );
    }
  }

  /**
   * Captures only 'mailbot.event_received' events
   * Note: This "Event" refers to the 3rd party webhooks
   * that are posted to the MailBot.
   * @param {string|RexExp} eventSearch
   */
  onEvent(eventSearch, cb) {
    if (eventSearch instanceof RegExp) {
      this.on(webhook => {
        const eventType = String(_.get(webhook, "payload.type"));
        return (
          webhook.event === "mailbot.event_received" &&
          eventSearch.exec(eventType)
        );
      }, cb);
    } else {
      this.on(
        webhook =>
          webhook.event === "mailbot.event_received" &&
          _.get(webhook, "payload.type") === eventSearch,
        cb
      );
    }
  }

  /**
   * Captures only 'task.action_received' events where the action string matches
   * @param {string|RegExp} actionSearch
   */
  onAction(actionSearch, cb) {
    if (actionSearch instanceof RegExp) {
      this.on(webhook => {
        const action = String(_.get(webhook, "action.format"));
        return (
          webhook.event === "task.action_received" && actionSearch.exec(action)
        );
      }, cb);
    } else {
      this.on(
        webhook =>
          webhook.event === "task.action_received" &&
          _.get(webhook, "action.format") === actionSearch,
        cb
      );
    }
  }

  /**
   * Captures only 'task.viewed' events where the command string matches
   * @param {string|RexExp} commandSearch
   */
  onTaskViewed(commandSearch, cb) {
    if (commandSearch instanceof RegExp) {
      this.on(webhook => {
        return (
          webhook.event === "task.viewed" &&
          commandSearch.exec(this.getTaskCommand(webhook))
        );
      }, cb);
    } else {
      this.on(webhook => {
        return (
          webhook.event === "task.viewed" &&
          commandSearch === this.getTaskCommand(webhook)
        );
      }, cb);
    }
  }

  /**
   * Handle webhook that fires when user is viewing MailBot.
   * ALL onSettingsViewed handlers fire when this webhook arrives. Each
   * handler can add and read data to and from its own namespace.
   * @param {function} cb Callback function that receives the bot object
   */
  onSettingsViewed(cb) {
    this.on("mailbot.settings_viewed", cb, { multiFire: true });
  }

  setErrorHandler(cb) {
    this.errorHandler = cb;
  }

  /**
   * Handle webhook that fires after a user hits "save" on their MailBot settings.
   * Newly saved settings arrive at the top-level settings object.
   * Existing settings are still in mailbot.stored_data.
   * Return webhook { status: "fail", message: "" } to abort the saving process.
   * Return extenesion and user data to update to save data as with other webhooks.
   * ALL beforeSettingsSaved handlers fire.
   * @param {function} cb Callback function that receives the bot object
   */
  beforeSettingsSaved(cb) {
    this.on("mailbot.settings_pre_save", cb, { multiFire: true });
  }

  /**
   * @private
   * Fires the appropriate listener function for the webhook received
   * @param {object} request Express request object
   * @param {object} response Express response object
   */
  async handleEvent(request, response) {
    const bot = response.locals.bot;
    const webhook = request.body;
    debug("Request JSON", webhook);

    // Trigger all multi-fire settings listeners first.
    // If at least one of these triggers, automatically return responseJSON after they process
    let autoReturn = false;

    const multiFireListenerPromises = this.multiFireListeners.map(
      async listener => {
        if (this.cbShouldTrigger(webhook, listener.triggerCondition)) {
          autoReturn = true;
          try {
            const ret = await listener.cb(bot, request, response);
            return ret;
          } catch (e) {
            if (typeof this.errorHandler === "function") {
              this.errorHandler(e, bot);
            } else {
              throw e;
            }
          }
        }
      }
    );

    // Each listener modifies bot.responseJson
    await Promise.all(multiFireListenerPromises);

    // Return if we have an aggregate settings response
    if (autoReturn && !bot.webhook.alreadyResponded) {
      return response.send(bot.responseJson);
    }

    // A handler already replied, for example an error handler
    if (bot.webhook.alreadyResponded) {
      return;
    }

    // Trigger single-fire listeners. Stop after first matching listener.
    for (const listener of this.listeners) {
      if (this.cbShouldTrigger(webhook, listener.triggerCondition)) {
        try {
          const res = await listener.cb(bot); // awaits for possible error
        } catch (e) {
          if (typeof this.errorHandler === "function") {
            this.errorHandler(e, bot);
          } else {
            throw e;
          }
        }
        break;
      }
    }
  }

  /**
   * @private
   * Evaluates a trigger condition against a given webhook
   * @param {object} webhook Complete webhook request
   * @param {string|function} triggerCondition A string or function returning a boolean when passed webhook
   * @return {boolean}
   */
  cbShouldTrigger(webhook, triggerCondition) {
    if (typeof triggerCondition === "function") {
      return Boolean(triggerCondition(webhook));
    } else if (triggerCondition instanceof RegExp) {
      return triggerCondition.exec(webhook.event);
    } else if (typeof triggerCondition === "string") {
      return webhook.event === String(triggerCondition);
    } else {
      throw new Error(
        "Unrecognized trigger condition: " + typeof triggerCondition
      );
    }
  }

  /**
   * @private
   * Extract command string from webhook, if present.
   * @param {object} webhook
   */
  getTaskCommand(webhook) {
    return (
      _.get(webhook, "task.command") &&
      _.get(webhook, "task.command").split("@")[0]
    );
  }
}

module.exports = MailBots;
