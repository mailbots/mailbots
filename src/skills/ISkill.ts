import { IUiBlock } from "../lib/IUiBlock";
import { IWebHookTask } from "../lib/IWebHook";
import { BotRequest } from "..";

export interface ISkillReturnValue {
  title?: string;
  futUiAddition?: IUiBlock[];
  futUiAdditionBehavior?: "append" | "prepend" | "exclusive";
  task?: IWebHookTask; // Use this? Or just use bot.webhook methods?
  endRequest?: boolean;
  skillsLog?: Array<any>; // returned only from the global applySkills method. Cannot be passed by handlers.
}

export interface ISkillInfo {
  name: string;
  description?: string;
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
}

/**
 * Interface for an skill handler class.
 */
export interface ISkill {
  /**
   * Event handler methods
   */
  onCreate?(
    bot: BotRequest
  ): ISkillReturnValue | void | Promise<ISkillReturnValue | void>;
  onTriggerUser?(
    bot: BotRequest
  ): ISkillReturnValue | void | Promise<ISkillReturnValue | void>;
  onTriggerNonUser?(
    bot: BotRequest
  ): ISkillReturnValue | void | Promise<ISkillReturnValue | void>;
  onAction?(
    bot: BotRequest
  ): ISkillReturnValue | void | Promise<ISkillReturnValue | void>;
  onTaskUpdate?(
    bot: BotRequest
  ): ISkillReturnValue | void | Promise<ISkillReturnValue | void>;
  onSettingsSubmit?(
    bot: BotRequest
  ): ISkillReturnValue | void | Promise<ISkillReturnValue | void>;
  onSettingsViewed?(
    bot: BotRequest
  ): ISkillReturnValue | void | Promise<ISkillReturnValue | void>;
  onPreviewUser?(
    bot: BotRequest
  ): ISkillReturnValue | void | Promise<ISkillReturnValue | void>;
  onPreviewNonUser?(
    bot: BotRequest
  ): ISkillReturnValue | void | Promise<ISkillReturnValue | void>;
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
