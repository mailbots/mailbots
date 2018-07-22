const _ = require("lodash");
const express = require("express");
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
    this.app = (config && config.app) || express();

    // Config opts are ultimately available to user on gopher.config
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
    this.loadLastCoreSkills();
    return this.app;
  }

  /**
   * Loads base gopher skills
   * Skills are Express middleware and route handlers. Some must be called before
   * any other middleware / skill is added. For example, auth, loading Gopher Helper, etc.
   * Other skills must be called last, ex: a catch-all redirect for web request.
   * Users can specify their own order of skills by adding skills line-by-line,
   * or by loading skill directories (with gopherApp.loadSkills()) in order.
   */
  loadFirstCoreSkills() {
    require("./lib/core-skills-first")(this);
  }

  /**
   * Loads final skills
   */
  loadLastCoreSkills() {
    this.app.post("/webhooks", this.handleEvent.bind(this));
    require("./lib/core-skills-last")(this);
  }

  /**
   * Just a proxy for the native Express use function. Middleware added here is preceeded
   * by loadFirstCoreSkills middleware and succeeded by loadLastCoreSkills middleware.
   * @param {function} fn
   */
  use(...args) {
    this.app.use(...args);
  }

  /**
   * Load Gopher skills from a directory
   * This can be called more more than once if skills need to be loaded in order.
   * Loaded skills are preceeded by loadFirstCoreSkills and succeeded by loadLastCoreSkills
   * @param {string} skillsDir path to skills directory
   */
  loadSkills(skillsDir) {
    const fs = require("fs");
    const path = require("path");
    const skillFiles = fs.readdirSync(skillsDir);
    skillFiles.sort().forEach(file => {
      require(path.join(skillsDir, file))(this);
    });
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
    this.listeners.push({ triggerCondition, cb });
  }

  /**
   * Captures only 'task.created' events where the command string matches
   * @param {string} commandSearch
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
          _.get(webhook, "command.params[0]") === commandSearch,
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
        const action = String(_.get(webhook, "action.action"));
        return (
          webhook.event === "task.action_received" && actionSearch.exec(action)
        );
      }, cb);
    } else {
      this.on(
        webhook =>
          webhook.event === "task.action_received" &&
          _.get(webhook, "action.action") === actionSearch,
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
