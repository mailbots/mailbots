import * as _ from "lodash";
import * as debugAs from "debug";

import BotRequest from "./bot-request";
import SettingsPage from "./settings-page";

import {
  IWebhookSourceEmail,
  IWebhookTrigger,
  IWebhookUser,
  IWebhookTask,
  IWebHookMailBot,
  IUiBlock,
  IReferenceEmail
} from "../types";

const debug = debugAs("mailbots");
const WEBHOOK_API_VERSION = "1";

/**
 * The 'bot' object passed into the handlers comes with a number
 * of helpers to handle the request.
 *
 * NOTE: This class is automatically instantiated with an instance
 * of BotRequest and made available under bot.webhook.
 * @name bot.webhook
 * @example bot.webhook.getMailBotData('memorize.settings');
 * @param {object} botRequest An instnace of BotRequest
 */
export default class WebhookHelpers {
  public botRequest: BotRequest;
  public requestJson: any;
  public responseJson: any;
  public alreadyResponded: boolean;

  /**
   * Class constructor.
   */
  constructor({ botRequest }: { botRequest: BotRequest }) {
    this.botRequest = botRequest;
    this.requestJson = this.botRequest.requestJson;
    this.responseJson = this.botRequest.responseJson;

    // see this.respond
    this.alreadyResponded = false;
  }

  // Are we able to Object.assign
  _isMergable(obj: any) {
    return typeof obj === "object" && !Array.isArray(obj) && !_.isNull(obj);
  }

  /**
   * Get the current value of a key.
   * If a value has already been been set
   * on the responseJson object, it return that value,
   * otherwise it returns the value in the request object.
   * @param {string} key JSON path to key
   * @param  {mixed} defaultValue Default if key is falsy
   * @param  {boolean} responseJsonOnly Only get values that are set on the responseJson object
   * @example bot.webhook.get('source.from'); // sender's email address
   * @example bot.get('source.from'); // this method is also aliased directly on bot
   */
  get(key: string, defaultValue?: any, responseJsonOnly?: boolean) {
    debug(`get: ${key}`);
    const newlySetValue = _.get(this.responseJson, key);
    let originalValue = _.get(this.requestJson, key);
    if (responseJsonOnly) originalValue = undefined; // ignore originalValue
    if (this._isMergable(originalValue) && this._isMergable(newlySetValue)) {
      return Object.assign({}, originalValue, newlySetValue);
    } else {
      if (newlySetValue !== undefined) return newlySetValue;
      if (originalValue !== undefined) return originalValue;
      return defaultValue;
    }
  }

  /**
   * Set attributes on the this.responseJson object.
   * If existing value and new value are both objects (not Arrays) they are shallow-merged.
   * If new or old data are not objects, the value of the key is replaced entirely.
   * @param {string} key - JSON Path to object within responseJson object
   * @param {*} value - Value
   * @param {boolean} merge - Objets are shallow-merged by default. Set this to
   * false to force the replacement of an object.
   * @example bot.set('task.reference_email.subject', "New Subject!");
   * @example bot.set('task.reference_email', { subject: "New Subject!"}); // Same effect as above
   */
  set(key: string, value: any, merge?: boolean) {
    if (merge === undefined) merge = true;
    debug(`set: ${key}`);
    this._allowedToSet(key, this.requestJson);

    // only merge with data set on responseJson, not requestJson
    const existingValue = this.get(key, undefined, true);

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

  _allowedToSet(key: string, requestJson: any) {
    // interbot_event handlers that start with futHook JSON response must comply with ISkillReturnValue
    const isFutHook =
      requestJson.event === "mailbot.interbot_event" &&
      typeof requestJson.payload === "object" &&
      requestJson.payload.hasOwnProperty("fut_hook");
    if (!isFutHook) return true; // only check this for now
    if (
      key.startsWith("futUiAddition") ||
      key.startsWith("futUiAdditionBehavior") ||
      key.startsWith("task") ||
      key.startsWith("skillStatus") ||
      key.startsWith("endRequest")
    ) {
      return true;
    }
    throw new Error(
      `Setting ${key} is not allowed in this handler. Did you mean to set 'taskUpdates'? futHook response must match ISkillReturnValue (see types.ts in MailBots)`
    );
  }

  /**
   * Get data for current task
   *  @param {string} key - JSON Path to key within task.stored_data
   *  @param {*} defaultValue - If there is no key, return this
   *  @xample bot.webhook.getTaskData("my_bot.widget_setting", 42);
   */
  getTaskData(key: string, defaultValue?: any) {
    const path = key ? `.${key}` : "";
    return this.get("task.stored_data" + path, defaultValue);
  }

  /**
   * Set data for current task
   * Takes either an object or a lodash _.set path as the first param,
   * optionally a value as the second parameter. Objects are shallow-merged
   * if new and old data are objects. (Arrays and other types are replaced).
   * @example setTaskData('my_bot.magic_number', 42);
   */
  setTaskData(...args: any[]) {
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

  /**
   * Get data stored in mailbot.private_data
   * @param {string} key JSON Path to data from mailbot
   * @param {*} defaultValue If value is undefined, use this value instead
   * @example bot.webhook.getMailBotData('my_bot.setting', 42);
   */
  getMailBotData(key?: string, defaultValue?: any) {
    if (key) {
      return this.get("mailbot.stored_data." + key, defaultValue);
    } else {
      return this.get("mailbot.stored_data");
    }
  }

  /**
   * Set data stored in mailbot.private_data. Objects are shallow merged if
   * existing data is present. All other values (including arrays) are replaced.
   *
   * This method has two signatures. It can take an object as its only param
   * which will be shallowly merged into mailbot.private_data.
   *
   * It can also take a lodash _.set path as its first parameter and a value
   * as the second.
   *
   * @example bot.webhook.setMailBotData({key: "value"});
   *
   * @example bot.webhook.setMailBotData('foo.bar', "value");
   *
   * @param  {string|object} param Either a lodash set param or an
   * object to be shallowly merged into mailbot.private_data
   * @param {*} [value] When passing lodash set path string as first
   * @param {*} [merge] When passing lodash set path string as first
   * param, this specifies if the data should be shallowly merged or replaced (defaults to true).
   */
  setMailBotData(...args: any[]) {
    this._initMailBotData();
    if (typeof args[0] === "object") {
      return this.set("mailbot.stored_data", args[0]);
    } else if (typeof args[0] === "string") {
      return this.set("mailbot.stored_data." + args[0], args[1], args[2]);
    } else {
      throw new Error("setMailBotData() unhandled type: " + typeof args[0]);
    }
  }

  // Load stored data into responseJson – single source of truth
  _initMailBotData() {
    const mailbotStoredData = _.get(this.responseJson, "mailbot.stored_data");
    if (mailbotStoredData) return;
    _.set(
      this.responseJson,
      "mailbot.stored_data",
      _.get(this.requestJson, "mailbot.stored_data")
    );
  }

  /**
   * Get the reference email – the abstract, user-editable instance
   * of the email associated with this task. Note this is not the same
   * as the source email (which is the exact email received).
   * @example bot.webhook.getReferenceEmail();
   */
  getReferenceEmail(): IReferenceEmail {
    return this.get("task.reference_email");
  }

  /**
   * Set reference email
   * Shallowly merges refernece email fields, allowing
   * for easy partial updates
   * @param {object} referenceEmail
   * @param {array} referenceEmail.to Array of email address strings
   * @param {array} referenceEmail.cc Array of email address strings
   * @param {array} referenceEmail.bcc Array of email address strings
   * @param {string} referenceEmail.subject Email subject
   * @param {string} referenceEmail.reply_to Email address or action-email
   * @param {string} referenceEmail.html html HTML content of email
   * @param {string} referenceEmail.text html text-only content of email
   * @example bot.webhook.setReferenceEmail({
   *   to: "test@gmail.com",
   *   subject: "A new subject",
   *   html: "This new content replaces the old"
   * });
   */
  setReferenceEmail(referenceEmail: Partial<IReferenceEmail>) {
    return this.set("task.reference_email", referenceEmail);
  }

  /**
   * Get replyto email, taking into this value being edited
   * after the original email was sent.
   * @example bot.webhook.getReplyTo();
   * @returns {string}
   */
  getReplyTo(): string {
    return this.get("task.reference_email.reply_to") || this.get("source.from");
  }

  /**
   * Determine if the email command for the current task was placed in the 'to', 'cc' or 'bcc'
   * fields. This is done by comparing the email command with the email address in the  and 'to', 'cc'
   * fields. The 'bcc' is hidden from the message envelope but still present in the command.
   *
   * Note that if the identical email command is in both 'to', 'cc' and 'bcc' it will
   * only show up as the 'to' method.
   */
  getEmailMethod(): "to" | "cc" | "bcc" {
    const thisCommand = this.get("task.command", "").toLowerCase();

    // edge case that applies only to FollowUpThen, where there are two domains that point to the same mailbot
    const thisAltCommand = thisCommand.replace("followupthen.com", "fut.io");

    // defensive
    function addressFieldToArray(field: any): Array<string> {
      if (field instanceof Array) return field;
      if (typeof field === "string") return field.split(",");
      else return [];
    }

    let to = this.get("task.reference_email.to", []);
    to = addressFieldToArray(to);
    to = to.map((to: string) => to.toLowerCase());

    let cc = this.get("task.reference_email.cc", []);
    cc = addressFieldToArray(cc);
    cc = cc.map((cc: string) => cc.toLowerCase());

    if (to.includes(thisCommand) || to.includes(thisAltCommand)) {
      return "to";
    } else if (cc.includes(thisCommand) || to.includes(thisAltCommand)) {
      return "cc";
    } else {
      return "bcc";
    }
  }
  /**
   * Sends an email by adding an email message object to the "send_messages" array.
   * Multiple emails can be sent.
   * @param {object} email email object
   * @param {string} email.to comma separated emails
   * @param {string} email.cc comma separated emails
   * @param {string} email.bcc comma separated emails
   * @param {string} email.from from name only (message-envelope is always from mailbots)
   * @param {string} email.reply_to email address or action-email
   * @param {string} email.subject email subject
   * @param {array} email.body Array of ui objects https://docs.mailbots.com/docs/email-ui-reference
   * @returns {object} A reference to the email object for additional changes
   *
   * @example const email = bot.webhook.sendEmail({
   *   to: bot.get('source.from'),
   *   subject: "A Subject",
   *   body: [
   *   {
   *    type: 'html',
   *    text: '<h1>An email</h1>'
   *   }];
   * })
   *
   * email.from = "New Sender"; // still updatable
   */
  sendEmail(email: {
    to: string;
    cc?: string;
    bcc?: string;
    from?: string;
    reply_to?: string;
    subject: string;
    body?: IUiBlock[];
    headers?: { [key: string]: string };
  }): any {
    Object.assign(email, { type: "email" });
    let allEmails = this.get("send_messages", []);
    allEmails = allEmails.concat(email);
    this.set("send_messages", allEmails, false);
    // Return a mutable references to the email object just added
    // so we can just do something like: email.subject = "x";
    return this.get("send_messages")[allEmails.length - 1];
  }

  /**
   * Shorthand method to send a quick reply back to the "from" address
   * of the incoming email. This accepts either a string or object.
   * If passing a strong only, the subject and body share the same
   * text. Pass and object iwth `{subject, body}` to explicitly set
   * the subject and body
   * @param {string | object} message Content
   * @param {string} [message.subject] passing an object
   * @param {string} [message.body] If passing an object
   * @example bot.webhook.quickReply("Got it!");
   * @example
   * botRequest.webhook.quickReply({
   *    subject: "Quick reply subject",
   *    body: [{
   *      type: "title",
   *      text: "Welcome",
   *    },
   *    {
   *      type: "button",
   *      behavior: "url",
   *      text: "Press Me",
   *      url: "google.com"
   *    }]
   *  });
   */
  quickReply(message: string | any) {
    let messageBody;
    let messageSubject;

    if (typeof message === "string") {
      messageBody = [
        {
          type: "text",
          text: message
        }
      ];
      messageSubject = message;
    } else if (typeof message === "object") {
      if (!message.subject || !message.body || !Array.isArray(message.body))
        throw Error("Email subject and body are missing or misformed");
      messageSubject = message.subject;
      messageBody = message.body;
    } else {
      throw Error(`Unknown type given to quickReply: ${typeof message}`);
    }

    return this.sendEmail({
      to: this.getReplyTo(),
      subject: messageSubject,
      body: messageBody
    });
  }

  /**
   * Set trigger time for a task using natural language
   * @param {string} time FollowUpThen-style time description
   * @example bot.webhook.setTriggerTime("monday");
   * @example bot.webhook.setTriggerTime("every2ndWeds");
   * @example bot.webhook.setTriggerTime("everyTuesday2pm");
   */
  setTriggerTime(time: string) {
    // if (typeof time === Number)
    //   throw new Error(`setTriggerTime accepts a natural
    //     language string. To use a timestamp, use setTriggerTimestamp`);
    this.set("task.trigger_timeformat", time);
  }

  /**
   * Set trigger time for a task using a unix timestamp
   * @param {int} timestamp Unix timestamp of trigger time
   * @example bot.webhook.setTriggerTimestamp(1546139899);
   */
  setTriggerTimestamp(timestamp: number) {
    this.set("task.trigger_time", timestamp);
  }

  /**
   * Trigger MailBots to invite the given email address(es) to use a bot
   * @param {array} invitees Array of email addresses
   * @example bot.webhook.invite(['user1@email.com','newUser2@gmail.com']);
   */
  invite(invitees: string[]) {
    if (!Array.isArray(invitees))
      throw new Error("Invitees should accept an array of email addresses");
    this.set("mailbot.invite", invitees);
  }

  /**
   * Mark task a completed. The task will be archived until permenantly deleted.
   * @example bot.webhook.completeTask();
   */
  completeTask() {
    this.set("task.completed", 1);
  }

  /**
   * By default, MailBots creates a task for every command that is visible to the user in their Tasks
   * list. When this is not desireable (for example, a simple one-time email command) you can use this
   * method to immediately discard the task.
   * @example bot.webhook.discardTask();
   */
  discardTask() {
    this.set("task.discard", 1);
  }

  /**
   * Fetch all contacts associated with the task's reference_email. User's
   * address and MailBots addresses are excluded.
   *
   * Note: This uses reference_email, allowing a user to add
   * or remove additional recipients from the task.
   * @returns {array} Email addresses
   * @example bot.webhook.getAllContacts();
   */
  getAllContacts(): string[] {
    const toRecipients: string[] = this.get("task.reference_email.to", []);
    const ccRecipients: string[] = this.get("task.reference_email.cc", []);
    const allRecipients = toRecipients.concat(ccRecipients);
    const externalContacts = allRecipients.filter(email => {
      return (
        !email.startsWith("invite") && !this.get("user.emails").includes(email)
        // && not anything@this-ext-email-domain.com
      );
    });
    return externalContacts;
  }

  /**
   * Respond to (and end) the webhook response with the JSON provided.
   * Multi-fire handlers (like onSettingsViewed) automatically respond.
   * In the case where an error-condition causes an early return / response
   * calling this method prevents the handler from trying to return a
   * second time. Provided JSON is shallowly merged into response object.
   * @param {object} json Response JSON
   * @example bot.webhook.respond();
   */
  respond(json?: object) {
    this.alreadyResponded = true;
    debug("Response JSON", this.responseJson);
    this.botRequest.response.send({ ...this.responseJson, ...json });
  }

  /**
   * @private
   * Has this request been handled?
   * Response considered unhandled if json response is empty
   */
  isUnhandled() {
    return _.isEqual(this.responseJson, {
      version: WEBHOOK_API_VERSION
    });
  }

  /**
   * Creates a new settings page, rendered in the WebhookHelpers Settings section
   * of the Admin UI. See SettingsPage docs for details
   * @param {object} params
   * @param {string} params.namespace Namespace used on mailbot.private_data
   * @param {string} params.title Page title
   * @param {menuTitle} params.menuTitle Menu item title
   * @example const.settingsPage = bot.webhook.settingsPage({
   *   namespace: "mem",
   *   title: "Memorization Settings",
   *   menuTitle: "Memorization"
   * });
   */
  settingsPage({
    namespace,
    title = "",
    menuTitle
  }: {
    namespace: string;
    title?: string;
    menuTitle?: string;
  }) {
    return new SettingsPage({
      responseJson: this.responseJson,
      namespace,
      title,
      menuTitle
    });
  }

  /**
   * Get bot request source request object. Usually this is an email. It can also be an API request.
   * @example const source = bot.webhook.getSource()
   * @returns {IWebhookSourceEmail}
   */
  getSource(): IWebhookSourceEmail | any | undefined {
    return this.get("source");
  }

  /**
   * Get information about the event that
   * triggered this webhook.
   * @example const trigger = bot.webhook.getTrigger()
   * @returns {IWebhookTrigger}
   */
  getTrigger(): IWebhookTrigger | undefined {
    return this.get("trigger");
  }

  /**
   * Get data about the user for which the webhook
   * was posted.
   * @example const user = bot.webhook.getUser()
   * @returns {IWebhookUser}
   */
  getUser(): IWebhookUser | undefined {
    return this.get("user");
  }

  /**
   * Get task data associated with the webhook.
   * @example const task = bot.webhook.getTask()
   * @returns {IWebhookTask}
   */
  getTask(): IWebhookTask | undefined {
    return this.get("task");
  }

  /**
   * Get mailbot data sent over with each webhook.
   * @example const mailbot = bot.webhook.getMailBot()
   * @returns {IWebHookMailBot}
   */
  getMailBot(): IWebHookMailBot {
    return this.get("mailbot");
  }

  /**
   * Set webhook status message. If the user is on the web ui, this message flashes
   * ont eh screen. It also appears in the extension logs.
   * @example setWebhookStatus({message: "Something worked!"});
   * @returns {void}
   */
  setWebhookStatus({
    level = "info",
    message
  }: {
    level?: "info" | "warn" | "error";
    message: string;
  }): void {
    this.set("webhook.status", level);
    this.set("webhook.message", message);
  }

  /**
   * Add FUT Email UI Block
   * Respond with a partial UI element to be injected into an email response. the response schema of
   * responseJson is different than the other webhooks. It is sent via the Core API directly back
   * to the fut mailbot, which merges it into its own response webhook response
   */
  addFutUiBlocks(uiBlocks: Array<IUiBlock>): void {
    const existingFutUiAdditions = this.get("futUiAddition", []);
    const newFutUiAddition = [...existingFutUiAdditions, ...uiBlocks];
    this.set("futUiAddition", newFutUiAddition);
  }

  /**
   * In the taskUpdated method, this method is used to check if this skill has been marked for add
   * so setup procedure can be optionally performed
   * @param bot
   * @param data_namespace  data_namespace of this mailbot
   */
  skillMarkedForSetup(data_namespace: string) {
    return this.get(
      `payload.task.stored_data.runtime.add_skill.${data_namespace}`
    );
  }

  /**
   * In the taskUpdated method, this method is used to check if this skill has been marked for removal
   * so cleanup options can be optionally performed. It must reply
   * @param bot
   * @param data_namespace  data_namespace of this mailbot
   */
  skillMarkedForRemoval(data_namespace: string) {
    return this.get(
      `payload.task.stored_data.runtime.remove_skill.${data_namespace}`
    );
  }

  /**
   * Helper for a FUT skill to add a new search key. Idempotent.
   */
  addSearchKeys(keys: string[]) {
    const existingKeys: string[] = this.get(`taskUpdates.search_keys`, []);
    let newKeys: string[] = [...existingKeys];
    function addKeyIfNotAlreadyThere(key: string) {
      if (newKeys.includes(key)) return;
      newKeys = newKeys.concat(key);
    }

    keys.forEach(key => addKeyIfNotAlreadyThere(key));
    this.set("taskUpdates.search_keys", newKeys);
  }

  /**
   * Helper for FUT Skill to Remove search keys from a task.
   * Merging is taken care of at next level.
   */
  removeSearchKeys(keysToRemove: string[]) {
    this.set("taskUpdates.remove_search_keys", keysToRemove);
  }

  /**
   * Check if current task has a search key
   */
  hasSearchKey(key: string) {
    const searchKeys = this.get("task.search_keys", []);
    return searchKeys.includes(key);
  }
}
