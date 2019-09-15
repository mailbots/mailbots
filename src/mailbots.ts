import * as express from "express";
import * as debugAs from "debug";
import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";

import { IBotConfig, default as getConfig } from "./lib/config-defaults";
import coreSkillsFirstLoader from "./lib/core-skills-first";
import coreSkillsLastLoader from "./lib/core-skills-last";
import BotRequest from "./lib/bot-request";
import { ISkillReturnValue, IWebHook } from "./types";

const debug = debugAs("mailbots");

type BotCallback = (
  bot: BotRequest,
  request?: express.Request,
  response?: express.Response
) => void;

export type FutHookCallback = (
  bot: BotRequest,
  request?: express.Request,
  response?: express.Response
) => ISkillReturnValue | void | Promise<ISkillReturnValue | void>;

type TriggerConditionFunction = (webhook: IWebHook) => boolean;
interface IListener {
  triggerCondition: string | TriggerConditionFunction | RegExp;
  cb: BotCallback;
}

export default class MailBots {
  public app: express.Express;
  public config: IBotConfig;
  public listeners: IListener[];
  public settingsHandlers: Function[];
  public multiFireListeners: IListener[];
  public aggregateSettingsResponse: any;
  public errorHandler: Function | null;

  /**
   * Class constructor.
   */
  constructor(instanceConfig?: IBotConfig) {
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
      const address = listener.address();
      let port = undefined;
      if (address && typeof address !== "string") {
        port = address.port;
      }
      console.log("Your MailBot is listening on port " + port);
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
    coreSkillsFirstLoader(this);
  }

  /**
   * @private
   * Loads final skills
   */
  loadLastCoreSkills() {
    this.app.post(this.config.webhookRoute, this.handleEvent.bind(this));
    coreSkillsLastLoader(this);
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
   * @deprecated
   */
  loadSkill(skill: string | Function, config: any) {
    //prettier-ignore
    console.warn("mailbot.loadSkill method has been deprecated in favor of directly requiring and invoking skills.");
    debug("loading skill");

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
        // ignore directories and source map files
        if (!this.isDirectory(fullPath) && fullPath.search(/.*map$/) === -1) {
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
  isDirectory(path: string) {
    return fs.statSync(path).isDirectory();
  }

  /**
   * Add handler for a given webhook event. Executes only the first handler
   * for a matching event. The first parameter can be either a string
   * (the named webhook event) or a function that is passed the webhook and
   * returns true or false to indicate if the handler should be run.
   * Example: controller.on('task.created', (bot, req, res) => { });
   * Example: controller.on((webhook) => webhook.event === 'task.created', cb)
   * @param {string|function|RegExp} event A webhook event string (ex: task.created). Or
   * a function receives the webhook as a param, which returns a boolean value.
   * @param {function} cb Handler function
   */
  on(
    triggerCondition: string | TriggerConditionFunction | RegExp,
    cb: BotCallback,
    opts?: {
      multiFire: boolean;
    }
  ) {
    debug("adding listener");
    if (opts && opts.multiFire) {
      this.multiFireListeners.push({ triggerCondition, cb });
    } else {
      this.listeners.push({ triggerCondition, cb });
    }
  }

  /**
   * Captures only 'task.created' events where the command string matches
   * @param {string|RegExp} commandSearch
   */
  onCommand(commandSearch: string | RegExp, cb: BotCallback) {
    if (commandSearch instanceof RegExp) {
      this.on(webhook => {
        return (
          webhook.event === "task.created" &&
          !!commandSearch.exec(this.getTaskCommand(webhook))
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
   * @param {string|RegExp} commandSearch
   */
  onTrigger(commandSearch: string | RegExp, cb: BotCallback) {
    if (commandSearch instanceof RegExp) {
      this.on(webhook => {
        return (
          webhook.event === "task.triggered" &&
          !!commandSearch.exec(this.getTaskCommand(webhook))
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
   * @param {string|RegExp} eventSearch
   */
  onEvent(eventSearch: string | RegExp, cb: BotCallback) {
    if (eventSearch instanceof RegExp) {
      this.on(webhook => {
        const eventType = String(_.get(webhook, "payload.type"));
        return (
          webhook.event === "mailbot.event_received" &&
          !!eventSearch.exec(eventType)
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
  onAction(actionSearch: string | RegExp, cb: BotCallback) {
    if (actionSearch instanceof RegExp) {
      this.on(webhook => {
        const action = String(_.get(webhook, "action.format"));
        return (
          webhook.event === "task.action_received" &&
          !!actionSearch.exec(action)
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
  onTaskViewed(commandSearch: string | RegExp, cb: BotCallback) {
    if (commandSearch instanceof RegExp) {
      this.on(webhook => {
        return (
          webhook.event === "task.viewed" &&
          !!commandSearch.exec(this.getTaskCommand(webhook))
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
  onSettingsViewed(cb: BotCallback) {
    this.on("mailbot.settings_viewed", cb, { multiFire: true });
  }

  setErrorHandler(cb: (err: any, bot: BotRequest) => void) {
    this.errorHandler = cb;
  }

  /**
   * Handle webhook that fires after a user hits "save" on their MailBot settings.
   * Newly saved settings arrive at the top-level settings object.
   * Existing settings are still in mailbot.stored_data.
   * Return mailbot and user data to save data (as with other webhooks).
   * ALL onSettingsSubmit handlers fire.
   * @param {function} cb Callback function that receives the bot object
   */
  onSettingsSubmit(cb: BotCallback) {
    this.on("mailbot.settings_onsubmit", cb, { multiFire: true });
  }

  /******************************
   * FollowUpThen Event Handlers
   * MailBots version 4+ is tighly coupled with FollowUpThen. FollowUpThen lifecycle hooks allow
   * a developer to add value to FollowUpThen by modifying behavior or adding additional value
   * during different lifecycle events. These hooks use a different callback compared with the primary
   * MailBots callbacks
   * @todo separate these into their own file and, eventually, their own repository.
   *****************************/
  _buildFutHookSetter(futHook: string) {
    return (cb: FutHookCallback) => {
      const matchFunction = (webhook: any) =>
        webhook.event === "mailbot.interbot_event" &&
        webhook.payload.fut_hook === futHook;
      this.on(matchFunction, cb, { multiFire: true });
    };
  }

  onFutCreateUser = this._buildFutHookSetter("onFutCreateUser");
  onFutCreateNonUser = this._buildFutHookSetter("onFutCreateNonUser");
  onFutPreviewUser = this._buildFutHookSetter("onFutPreviewUser");
  onFutPreviewNonUser = this._buildFutHookSetter("onFutPreviewNonUser");
  onFutViewUser = this._buildFutHookSetter("onFutViewUser");
  onFutViewNonUser = this._buildFutHookSetter("onFutViewNonUser");
  onFutTriggerUser = this._buildFutHookSetter("onFutTriggerUser");
  onFutTriggerNonUser = this._buildFutHookSetter("onFutTriggerNonUser");
  onFutTaskUpdate = this._buildFutHookSetter("onFutTaskUpdate");
  onFutAction = this._buildFutHookSetter("onFutAction");

  /******************************
   * Utility methods
   *****************************/

  /**
   * @private
   * Fires the appropriate listener function for the webhook received
   * @param {object} request Express request object
   * @param {object} response Express response object
   */
  private async handleEvent(
    request: express.Request,
    response: express.Response
  ) {
    const bot: BotRequest = response.locals.bot;
    const webhook: IWebHook = request.body;
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
      response.send(bot.responseJson);
      return;
    }

    // A handler already replied, for example an error handler
    if (bot.webhook.alreadyResponded) {
      return;
    }

    // Trigger single-fire listeners. Stop after first matching listener.
    for (const listener of this.listeners) {
      if (this.cbShouldTrigger(webhook, listener.triggerCondition)) {
        try {
          await listener.cb(bot); // awaits for possible error
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
   * @param {string|function|RegExp} triggerCondition A string or function returning a boolean when passed webhook
   * @return {boolean}
   */
  private cbShouldTrigger(
    webhook: any,
    triggerCondition: string | Function | RegExp
  ) {
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
  private getTaskCommand(webhook: any) {
    return (
      _.get(webhook, "task.command") &&
      _.get(webhook, "task.command").split("@")[0]
    );
  }
}
