import BotRequest from "../lib/bot-request";
import { ISkill, ISkillInfo } from "./ISkill";

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
  create(bot: BotRequest): ISkill;

  /**
   * Get skill information.
   */
  getSkillInfo(): ISkillInfo;
}
