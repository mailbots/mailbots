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
   * See commit 9afba5d6 for simplified gopher middlware (possibly)
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
  on(triggerCondition, cb) {
    debug("adding listener function");
    this.listeners.push({ triggerCondition, cb });
  }

  /**
   * Captures only 'task.created' events where the command string matches
   * @param {string|RexExp} commandSearch
   */
  onCommand(commandSearch, cb) {
    if (commandSearch instanceof RegExp) {
      this.on(webhook => {
        const command = String(_.get(webhook, "command.format"));
        return webhook.event === "task.created" && commandSearch.exec(command);
      }, cb);
    } else {
      this.on(
        webhook =>
          webhook.event === "task.created" &&
          _.get(webhook, "command.format") === commandSearch,
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
        const command = String(_.get(webhook, "task.command"));
        return (
          webhook.event === "task.triggered" && commandSearch.exec(command)
        );
      }, cb);
    } else {
      this.on(
        webhook =>
          webhook.event === "task.triggered" &&
          _.get(webhook, "task.command") === commandSearch,
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
   * Fires the appropriate listener function for the webhook received
   * @param {object} request Express request object
   * @param {object} response Express response object
   */
  handleEvent(request, response) {
    const gopher = response.locals.gopher;

    // Trigger only the first matching listener for the event
    this.listeners.some(listener => {
      const webhook = request.body;
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
        `Unrecognized trigger condition: ` + typeof triggerCondition
      );
    }
  }
}

module.exports = GopherApp;
