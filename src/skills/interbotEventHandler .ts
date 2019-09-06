import { ISkill, IAction } from "./ISkill";
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
  constructor(private _handler: ISkill | IAction) {}

  /**
   * Setup interbot event hook on mailbot object.
   */
  async addHook(mailbot: MailBots) {
    mailbot.on("mailbot.interbot_event", async (bot: BotRequest) => {
      const eventMethod: string = bot.get("payload.action");

      const handlerFn: Function = (this._handler as any)[eventMethod];
      if (typeof handlerFn !== "function") return; // skills can leave event handlers undefined. It's 👌
      const mayBeAPromise = handlerFn.call(this._handler, bot); // ex observer.onCreate();
      let result = mayBeAPromise;
      if (mayBeAPromise && mayBeAPromise instanceof Promise) {
        result = await mayBeAPromise;
      }

      bot.webhook.respond({ data: result });
    });
  }
}
