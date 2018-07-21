const _ = require("lodash");
const express = require("express");
/**
 * A light weight wrapper around the Express App object to provide an authenticated
 * Gopher API Client, enable Gopher Skills, middlware, and better isolate custom
 * code to create new Gopher Skills.
 */
class GopherApp {
  /**
   * Instantiate a new GopherApp with a config object. Pass any key shown in
   * config.js. Note that config.js reads from the .env
   * @param {object} config
   */
  constructor(config) {
    this.app = (config && config.app) || express();
    this.config = config;

    // Array of webhook event listener functions
    this.listeners = [];

    // Load core middleware
    require("./lib/core-skills")(this);
  }

  /**
   * listen() must be called after listeners, middleware, etc are added.
   * We are only automatically binding to webhook events. Other routes must
   * be bound as usual with the native Express App object.
   * For example: gopherApp.app.get("/", (req, res) => {});
   */
  listen() {
    this._lastSteps();
    const listener = this.app.listen(process.env.PORT || 3011, function() {
      console.log("Gopher is listening on port " + listener.address().port);
    });
  }

  /**
   * For testing, export app object instead of listening
   */
  exportApp() {
    this._lastSteps();
    return this.app;
  }

  /**
   *  Internal:
   *
   */
  _lastSteps() {
    this.app.post("/webhooks", this.handleEvent.bind(this));
    this.app.use(express.static("public"));
  }

  /**
   * This just proxies express middleware
   * QUESTION: Should we use gopherApp.app.use to save the gopherApp.use namespace for
   * more custom Gopher Middleware handler? For example, it would be nice to have this
   * signature for Gopher Middlware (gopher, req, res, next) => {}
   * @param {function} fn
   * TODO: Allow for a match-pattern (similar to "on" + listeners). Allow multiple
   * middleware functions to be applied as long as the match true.
   */
  use(...args) {
    this.app.use(...args);
  }

  /**
   * Load Gopher skills from a directory
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
   * @param {string|function} event A webhook event string (ex: task.created) or
   * function, that returns true / false. Passed the webhook as a param.
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
   * Fire the appropriate listener function for the webhook received
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
   *
   * @param {object} webhook Complete webhook request
   * @param {string|function} triggerCondition A string or function returning a boolean when passed webhook
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
