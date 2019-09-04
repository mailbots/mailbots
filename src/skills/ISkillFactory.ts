import BotRequest from "../lib/bot-request";
import { ISkillHandler, ISkillInfo } from "./ISkillHandler";

/**
 * Interface for skill factory.
 */
export interface ISkillFactory {
  /**
   * Check if this skill should
   * be instantiated.
   */
  shouldRun(bot: BotRequest): boolean;

  /**
   * Get an instance of the skill.
   */
  create(bot: BotRequest): ISkillHandler;

  /**
   * Get skill information.
   */
  getSkillInfo(): ISkillInfo;
}
