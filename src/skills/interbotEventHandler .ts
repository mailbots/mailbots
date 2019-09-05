import { ISkillHandler } from "./ISkillHandler";
import MailBots from "../mailbots";
import BotRequest from "../lib/bot-request";

/**
 * Class used for dispatching events
 * to the skill sent via interbot
 * events from FUT mailbot.
 */
export class InterbotEventHandler {
  /**
   * Class constructor.
   */
  constructor(private _skill: ISkillHandler) {}

  /**
   * Setup interbot event hook on mailbot object.
   */
  async addHook(mailbot: MailBots) {
    mailbot.on("mailbot.interbot_event", async (bot: BotRequest) => {
      const eventMethod = bot.get("payload.action");

      if (typeof this._skill[eventMethod] !== "function") return; // skills can leave event handlers undefined. It's 👌
      const mayBeAPromise = this._skill[eventMethod](bot); // ex observer.onCreate();
      let result = mayBeAPromise;
      if (mayBeAPromise && mayBeAPromise instanceof Promise) {
        result = await mayBeAPromise;
      }

      bot.webhook.respond({ data: result });
    });
  }
}
