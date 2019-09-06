export { default } from "./mailbots";
export { default as BotRequest } from "./lib/bot-request";

// skill exports
export { IUiBlock } from "./skills/IUiBlock";
export { ISkillFactory } from "./skills/ISkillFactory";
export {
  ISkill,
  ISkillInfo,
  ISkillReturnValue,
  IAction,
  ITrigger
} from "./skills/ISkill";
export { InterbotEventHandler } from "./skills/interbotEventHandler ";
