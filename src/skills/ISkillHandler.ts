import { IUiBlock } from "./IUiBlock";
import { IWebHookTask } from "../lib/IWebHook";

export interface ISkillHandlerReturnValue {
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
  mailbotid?: number; // If it's a MailBot we can link to its directory page, etc.
  show_as_search_filter?: boolean; // Search futs by this skill?
  show_as_scheduling_option?: boolean; // Show while scheduling?
}

/**
 * Interface for an skill handler class.
 */
export interface ISkillHandler {
  /**
   * Event handler methods
   */
  [key: string]: any;
}
