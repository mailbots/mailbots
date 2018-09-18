const _ = require("lodash");
const express = require("express");
const configDefaults = require("./lib/config-defaults");
const debug = require("debug")("gopher-app");

/**
 * A light weight wrapper around the Express App object to provide an authenticated
 * Gopher API Client, enable Gopher Skills, middlware, and provide better
 * isolation / componentization around custom and shared Gopher Skills.
 */
class GopherApp {
  /**
   * Optionally instantiate with config. Pass any key shown in config.js.
   * @param {object} config
   */
  constructor(config) {
    config = Object.assign({}, configDefaults, config);
    debug("instantiating GopherApp instance with config:", config);
    if (!config.clientId || !config.clientSecret) {
      throw new Error(
        "GopherApp is not configured. Read more: https://github.com/gopherhq/gopher-app"
      );
    }

    this.app = (config && config.app) || express();

    // Config opts are also available to the user via gopher.config
    this.config = config;

    // Listens for anything posted to /webhooks, firing appropriate listener.
    this.listeners = [];

    // Listener functions that build this.aggregateSettingsResponse
    this.settingsHandlers = [];

    // As settings handlers are executed,
    this.aggregateSettingsResponse = {};

    // Set up base skills
    this.loadFirstCoreSkills();
  }

  /**
   * Loads final skills and start http server
   * Must be called after other skills and routes are added.
   * Anything posted to /webhooks route is automatically handled.
   * Other routes must be created as usual with the Express App object.
   * For example: gopherApp.app.get("/", (req, res) => {});
   */
  listen() {
    this.loadLastCoreSkills();
    const listener = this.app.listen(process.env.PORT || 3011, function() {
      console.log("Gopher is listening on port " + listener.address().port);
    });
  }

  /**
   * For testing, export app object instead of starating server
   */
  exportApp() {
    debug("exporting gopherApp");
    this.loadLastCoreSkills();
    return this.app;
  }

  /**
   * Loads base gopher skills
   * Skills are Express middleware and route handlers. Some must be called before
   * any other middleware / skill is added. For example, auth, loading Gopher Helper, etc.
   * Other skills must be called last, ex: a catch-all redirect for web request.
   * Users can specify their own order of skills by adding skills line-by-line,
   * or by loading skill directories (with gopherApp.loadSkill()) in order.
   */
  loadFirstCoreSkills() {
    require("./lib/core-skills-first")(this);
  }

  /**
   * Loads final skills
   */
  loadLastCoreSkills() {
    this.app.post(this.config.webhookRoute, this.handleEvent.bind(this));
    require("./lib/core-skills-last")(this);
  }

  /**
   * See commit 9afba5d6 for simplified gopher middlware idea
   */
  use() {
    throw new Error("Call gopherApp.app.use to add Express middleware");
  }

  /**
   * Load Gopher skills from a directory, non-recursively
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
          require(fullPath)(this, config);
        }
      });

      // Unexpected
    } else {
      throw new Error("Skill type unrecognized by gopherApp.loadSkill()");
    }
  }

  /**
   * Is directory?
   * @param {string} path full file path
   */
  isDirectory(path) {
    return require("fs")
      .statSync(path)
      .isDirectory();
  }

  /**
   * Adds a listener function to listeners array
   * Example: controller.on('task.created', (gopher, req, res) => { });
   * Example: controller.on((webhook) => webhook.event === 'task.created', cb)
   * @param {string|function} event A webhook event string (ex: task.created). Or
   * a function receives the webhook as a param, which returns a boolean value.
   * @param {function} cb Callback function with signature cb(gopher, req, res)
   */
  on(triggerCondition, cb, opts) {
    if (opts && opts.listenerType === "settingsListener") {
      if (!opts.namespace)
        throw new Error("A namespace wasn't given to a settings listener");
      this.settingsHandlers.push({
        triggerCondition,
        cb,
        namespace: opts.namespace
      });
    } else {
      debug("adding listener function");
      this.listeners.push({ triggerCondition, cb });
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
   * Captures only 'extension.event_received' events
   * Note: This "Event" refers to the 3rd party webhooks
   * that are posted to the Gopher Extension.
   * @param {string|RexExp} eventSearch
   */
  onEvent(eventSearch, cb) {
    if (eventSearch instanceof RegExp) {
      this.on(webhook => {
        const eventType = String(_.get(webhook, "payload.type"));
        return (
          webhook.event === "extension.event_received" &&
          eventSearch.exec(eventType)
        );
      }, cb);
    } else {
      this.on(
        webhook =>
          webhook.event === "extension.event_received" &&
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
   * Handle webhook that fires when user is viewing extension.
   * This is the only handler that fires ALL handler functions.
   * @param {function} injectSettingsFn - A function that accepts
   *   - gopher - The Gopher helper object
   *   - namespaceSettings - The existing settings for that namespace
   * It return returns a JSON Form Schema definition.
   * TODO: Validate JSON Form Schema
   */
  addSettingsForm(namespace, getSettingsFn) {
    this.on("extension.settings_viewed", getSettingsFn, {
      namespace,
      listenerType: "settingsListener"
    });
  }

  /**
   * Handle webhook that fires before settings are saved.
   * This is the only handler that fires ALL handler functions.
   * @param {function} handleNewSettingsFn - A function that is passed
   *   - @param gopher - The Gopher helper object
   *   - @param namespaceSettings - The existing settings for that namespace
   *   - @param newNamespaceSettings - The new settings given by the user
   *   - @returns standard webhook JSON response
   * @todo Validate JSON Form Schema
   */
  beforeSettingsSaved(namespace, handleNewSettingsFn) {
    this.on("extension.settings_pre_save", handleNewSettingsFn, {
      namespace,
      listenerType: "settingsListener"
    });
  }

  /**
   * Fires the appropriate listener function for the webhook received
   * @param {object} request Express request object
   * @param {object} response Express response object
   */
  async handleEvent(request, response) {
    const gopher = response.locals.gopher;
    const webhook = request.body;

    // Trigger all multi-fire settings listeners first.
    // If these triggered, stop execution
    const settingsHandlerPromises = await this.settingsHandlers.map(
      async listener => {
        if (!this.cbShouldTrigger(webhook, listener.triggerCondition)) return;
        const namespaceSettings =
          webhook.extension.private_data[listener.namespace];
        const newNamespaceSettings = _.get(
          webhook,
          "settings." + listener.namespace
        );
        const settingsJson = await listener.cb(
          gopher,
          namespaceSettings,
          newNamespaceSettings
        );
        debug("SettingsJSON form", settingsJson);
        const namespace = listener.namespace;
        if (settingsJson) {
          this.aggregateSettingsResponse[namespace] = settingsJson;
        }
      }
    );
    try {
      await Promise.all(settingsHandlerPromises);
    } catch (e) {
      return response.send({
        webhook: { status: "failed", message: e.message }
      });
    }

    // Return if we have an aggregate settings response
    if (!_.isEmpty(this.aggregateSettingsResponse)) {
      return response.send({ settings: this.aggregateSettingsResponse });
    }

    // Trigger only the first matching listener for the event
    this.listeners.some(listener => {
      if (this.cbShouldTrigger(webhook, listener.triggerCondition)) {
        listener.cb(gopher, request, response);
        return true;
      }
    });
  }

  /**
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

module.exports = GopherApp;
