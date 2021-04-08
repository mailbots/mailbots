import * as _ from "lodash";
import * as crypto from "crypto";
import * as uuid from "uuid/v1";
import * as moment from "moment-timezone";
import { Request, Response } from "express";
import { MailBotsClient } from "@mailbots/mailbots-sdk";
const urljoin = require("url-join");
import WebhookHelpers from "./webhook-helpers";
import { IBotConfig } from "./config-defaults";
import { IFriendlyDate, IFUTCommand } from "../types";

const WEBHOOK_API_VERSION = "1";

/**
 * @private
 * This is the base object for the 'bot' object passed into handler
 * functions. It stores a complete reference to the request and
 * response objects for each interaction. MailBot Skills add
 * tools and features to this base object.
 */
export default class BotRequest {
  private futCommand: IFUTCommand | undefined;

  public isWebhook = false;
  public requestJson: any;
  public responseJson: any;
  public error: any;
  public requestHistoryStack: any;
  public skills: any;
  public webhook: WebhookHelpers;
  public command: string;
  public action: string;
  public event: string;
  public config?: IBotConfig;
  public api!: MailBotsClient;

  /**
   * Class constructor.
   * @private
   * @param {Request} request
   * @param {Response} response
   */
  constructor(public request: Request, public response: Response) {
    // Is this request a webhook? This is set in core-skills-first.js.
    this.isWebhook = false;

    // Core middleware adds getters and setters on webhook requestJSON and responseJSON
    // https://docs.mailbots.com/reference#webhook-request-reference
    // https://docs.mailbots.com/reference#webhook-response
    this.requestJson = request.body;

    // Webhook response JSON is kept here
    this.responseJson = { version: WEBHOOK_API_VERSION };

    // Errors are stored here
    this.error;

    // Warn if lib and webhook versions don't match
    this._checkVersion();

    // See alreadyRan method below
    this.requestHistoryStack = {};
    this.response.locals.requestId = uuid(); // Unique id for only this request

    // 3rd party bot developers can (optionally) use middleware to add
    // skills here. bot.skills.memorize();
    this.skills = {};

    // Instantiate webhook helpers and webhook handling shortcuts for this request.
    const webhookHelperInstance = new WebhookHelpers({ botRequest: this });
    this.webhook = webhookHelperInstance;

    // Set up shortcuts
    this.get = this.webhook.get.bind(webhookHelperInstance);
    this.set = this.webhook.set.bind(webhookHelperInstance);
    // prettier-ignore
    this.command = _.get(this.webhook.requestJson, "task.command", "").split("@")[0];
    this.action = _.get(this.webhook.requestJson, "action.format");
    this.event = _.get(this.webhook.requestJson, "event");
  }

  get(key: string, defaultValue?: any, responseJsonOnly?: boolean): any {}
  set(key: string, value: any, merge?: boolean): void {}

  /**
   * @private
   * Internal method to ensure middleware is run once
   * MailBot skills can be be required aagin and again like so:
   * const { myFun } = require('my-skill')(mailbot);
   * The problem is when 'my-skill' registers middleware functions. In this case,
   * each middleware function gets called multiple times. Eventually we will
   * create the `mailbot.use` middleware wrapper to de-duplciate these. For now,
   * We are storing a FILO hash table of requestids | function. If that function
   * has been run for that requestid, we do not run it.
   */
  alreadyRan(middleWareFunction: Function): boolean {
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
  }

  /**
   * Transform a unix timestamp into user friendly output.
   *
   * @param  {number} unixTime
   * @param  {string} timezone Standard tz abbreviation (ex: America/Los_Angeles)
   * @param  {string} format Moment.js time formatting (default: "MMMM Do YYYY, h:mma z")
   * @return {object} An object of user-friendly versions of the date
   */
  getFriendlyDates({
    unixTime,
    userTimezone,
    format = "MMMM Do YYYY, h:mma z"
  }: {
    unixTime: number;
    userTimezone: string;
    format?: string;
  }): IFriendlyDate {
    const secondsFromNow = Math.round(unixTime - Date.now() / 1000);
    const daysInFuture = Math.round(secondsFromNow / 60 / 60 / 24);
    const hoursInFuture = Math.round(secondsFromNow / 60 / 60);
    const minutesInFuture = Math.round(secondsFromNow / 60);

    // build how far in future
    const howFarInDays = daysInFuture
      ? `${daysInFuture} ${daysInFuture === 1 ? "day" : "days"}`
      : null;
    const howFarInHours = hoursInFuture
      ? `${hoursInFuture} ${hoursInFuture === 1 ? "hour" : "hours"}`
      : null;
    const howFarInMinutes = minutesInFuture
      ? `${minutesInFuture} ${minutesInFuture === 1 ? "minute" : "minutes"}`
      : null;
    const howFarInFuture =
      howFarInDays || howFarInHours || howFarInMinutes || "Date error";

    userTimezone = userTimezone || "GMT";
    const friendlyDate = moment(unixTime * 1000)
      .tz(userTimezone)
      .format(format);
    return {
      friendlyDate,
      daysInFuture,
      hoursInFuture,
      minutesInFuture,
      howFarInFuture
    };
  }

  /**
   * Build url using MAILBOTS_ADMIN as base. Automatically appends
   * user email to ?gfr query param.
   */
  futAdminUrl(...parts: Array<string | number>): string {
    if (!this.config?.mailbotsAdmin)
      throw new Error("mailbots framework not configured");

    const fromEmail =
      this.get("task.reference_email.from") || this.get("user.email");
    return urljoin(
      this.config?.mailbotsAdmin,
      ...parts.map(part => String(part)),
      `?gfr=${encodeURIComponent(fromEmail)}`
    );
  }

  /**
   * Get this mailbot's settings URL.
   */
  settingsUrl(...parts: Array<string | number>) {
    if (!this.config?.mailbotId)
      throw new Error("mailbots framework not configured");

    return this.futAdminUrl(
      "skills",
      this.config?.mailbotId,
      "settings",
      ...parts
    );
  }

  /**
   * Get futCommand from the bot object or throw if it is undefined.
   */
   getFutCommand(): IFUTCommand {
    const futCommand = this.futCommand;
    if (!futCommand) throw new Error("futCommand not found");

    return futCommand;
  }

  /**
   * Set a new futCommand on the bot object.
   */
  setFutCommand(futCommand: IFUTCommand) {
    this.futCommand = futCommand;
  }

  /**
   * @private
   * Warn if lib and webhook versions don't match
   */
  private _checkVersion() {
    if (
      this.requestJson &&
      this.requestJson.version &&
      this.requestJson.version != WEBHOOK_API_VERSION
    ) {
      console.warn(
        `WARNING: This MailBots Webhook and your library do not have matching versions. This can cause unexpected behavior.`
      );
    }
  }
}
