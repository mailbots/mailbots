/**
 * Abstract, user editable instance of the email
 * associated with a task.
 */
export interface IReferenceEmail {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  reply_to?: string;
  from?: string; // Supports full name and email (Name<email@email.com>) Only override email in preview scenarios
  html?: string;
  text?: string;
  attachments?: any[];
  headers?: { [key: string]: string };
}
/**
 * @todo Core API should merge IEmail and IReferenceEmail types. IEmail (more flexible) is used while
 * sending new messages with IUiBlocks to render the body. IReferenceEmail is static text / html based emails
 */
export interface IEmail {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html?: string; // has either html or array of body elements
  body?: IUiBlock[];
  from?: string;
  reply_to?: string;
  headers?: any;
  attachments?: any[];
}

/**
 * Core element of MailBots platform
 */
export interface IWebhookTask {
  command?: string;
  created?: number;
  completed?: boolean;
  completed_on?: string;
  hash?: string;
  id?: number;
  trigger_time?: number;
  trigger_timeformat?: string;
  reference_email?: IReferenceEmail;
  stored_data?: {
    [key: string]: any;
  };
  search_keys?: string[];
  remove_search_keys?: string[]; // only used within skill handlers dispatched from fut-mailbot via interbot_events
  invisible?: boolean; // hidden from user by default (good for background tasks)
  discard?: number; // immediately delete
}

/**
 * The 'source' key within the webhook contains data about the original request that created
 * the task. It is usually an email. It can aso be an API request.
 */
export interface IWebhookSourceEmail {
  type: string;
  recipient: string;
  from: string;
  method: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  text: string;
  headers: {
    [key: string]: any;
  };
  forward_headers: {
    [key: string]: any;
  };
}

export interface IWebhookTrigger {
  triggered_by: string;
  uri: string;
  headers: {
    [key: string]: string;
  };
  method: string;
  body_text: string;
  body_json: any[];
}

export interface IWebhookUser {
  id: number;
  name: string;
  primary_email: string;
  emails: string[];
  is_validated: boolean;
  timezone: string;
  preferred_date_format: string;
  preferred_date_format_js: string;
  postpone_times: string;
  flagged: number;
  sender_validation: number;
  send_dev_errors: boolean;
  accepted_terms: boolean;
}

export interface IWebHookMailBot {
  name: string;
  subdomain: string;
  stored_data: {
    [key: string]: any;
  };
  installed: boolean;
  event_url: string;
  id: number;
  owner: {
    email: string;
  };
  description: string;
  icon: string;
  autocomplete_examples: string;
  tags: string;
  published: boolean;
  devmode: boolean;
  enabled: boolean;
  install_url: string;
  settings_url: string;
  base_url: string;
  developer_name: string;
  help_url: string;
  learn_more_url: string;
  privacy_policy_url: string;
  oauth2_client_id: string;
  oauth2_scope: string;
  oauth2_redirect_uri: string;
}

/**
 * Data sent over by the mailbots core API
 * as payload to web hook events.
 */
export interface IWebHook {
  version: string;
  source?: IWebhookSourceEmail | any;
  trigger?: IWebhookTrigger;
  event: string;
  task: IWebhookTask;
  command: {
    format: string;
    full_address: string;
  };
  user: IWebhookUser;
  mailbot: IWebHookMailBot;
}

/**
 * Interface used to describe a UI element
 * used inside FUT emails.
 */
export interface IUiBlock {
  type: string;
  text?: string;
  html?: string;
  behavior?: string;
  action?: string;
  subject?: string;
  body?: string;
  url?: string;
  style?: string;
  className?: string;
  open?: boolean;
  taskid?: number; // force an action-button to apply to another task
}

// Change behavior of a given template, enabling UI elements, etc. Not all apts apply to all templates
export interface ITemplateOptions {
  postponeButtons?: boolean; // row of postpone buttons
  emailThread?: boolean; // original html email below fut text
  followupActions?: boolean; // "view edit cancel" UI block
  forceConfirmation?: boolean; // forces initial confirmation email to be sent, regarldess of user settings
  confirmationTitleBlock?: IUiBlock[]; // replace title block in confirmation email
  suppressFutUser?: boolean; // suppress fut email for user – for skills that remind user via another channels
  suppressFutNonUser?: boolean; // suppress fut for nonuser - for skills that contact non-user via another channels
  sentByFutBlock?: IUiBlock[] | null; // override or remove fut-signature block, for example, in whitelabel scenario
  referenceEmailOverrides?: IReferenceEmail // allows skills to change headers, add from, reply_to, etc. (shallow merge)
}

export interface ISkillReturnValue {
  title?: string;
  futUiAddition?: IUiBlock[];
  futUiAdditionBehavior?: "append" | "prepend" | "exclusive";
  taskUpdates?: IWebhookTask; // Updates are merged into task object
  endRequest?: boolean;
  skillsLog?: Array<any>; // returned only from the global applySkills method. Cannot be passed by handlers.
  templateOptions?: ITemplateOptions; // enable / disable email UI features. (Not all opts are available on all templates)
  skillStatus?: "success" | "error" | "warn";
}

export interface ISkillInfo {
  name: string;
  description?: string;
  developer_name?: string;
  search_key?: string; // Tags every task where this skill has been applied with this search key
  flag?: string;
  action_namespace?: string; // Let skill claim actions within its namespace (ex: github.close_issue);
  data_namespace?: string; // Data saved agains the mailbot is stored under this namespace (ex: github.token)
  icon_url?: string;
  more_info_url?: string;
  remote?: boolean; // Managed within fut-mailbot? Or send interbot-events to the remote skill?
  mailbotid?: number; // If it's a MailBot we can link to its directory page, etc.
  subdomain?: string; // Where to send Interbot Event
  show_as_search_filter?: boolean; // Search futs by this skill?
  show_as_scheduling_option?: boolean; // Show while scheduling?
  runs_on?: Array<"flag" | "everything">;
  timeless?: boolean; // if this skill is available as a timeless option
}

/**
 * Actions are classes that handle
 * incoming interbot events.
 */
export interface IAction {
  [key: string]: any | Promise<any>;
}

/**
 * Triggers are classes user to
 * send interbot events to other skills.
 */
export interface ITrigger {
  [key: string]: any;
}

/**
 * User friendly representation of a date
 */
export interface IFriendlyDate {
  friendlyDate: string;
  daysInFuture: number;
  hoursInFuture: number;
  minutesInFuture: number;
  howFarInFuture: string;
}

export interface IFUTCommandSkill {
  flag: string;
  args: string[];
}

export interface IFUTCommand {
  isTimeless: boolean;
  timeFormat: string;
  emailDomain: string;
  tags: string[];
  skills: Array<IFUTCommandSkill>;
}
