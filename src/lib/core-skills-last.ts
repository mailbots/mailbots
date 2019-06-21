import * as express from "express";
import * as _ from "lodash";
import * as debugAs from "debug";
const urljoin = require("url-join");

import MailBots from "../mailbots";
import BotRequest from "./bot-request";

const debug = debugAs("mailbots");

export default function(mailbot: MailBots) {
  mailbot.app.use(express.static("../public"));

  /*
   * Default webhook response for unhandled webhook events
   */
  mailbot.on(/.*/, function catchUnhandledEvent(bot: BotRequest) {
    debug(`event unhandled: ${bot.event}`);
    return bot.webhook.respond({
      webhook: {
        status: "success",
        message: `Webhook received but not handled: ${bot.event}`
      }
    });
  });

  // Send Express errors to MailBots's error handler
  mailbot.app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const bot: BotRequest = res.locals.bot;
      if (mailbot.errorHandler) mailbot.errorHandler(err, bot);
    }
  );

  // Custom 404
  mailbot.app.use((req, res) => {
    const bot: BotRequest = res.locals.bot;
    const mailbotsAdmin = bot.config ? bot.config.mailbotsAdmin : "";
    const mailbotId = bot.config ? bot.config.mailbotId : "";
    const mailbotsDirectoryPage = urljoin(
      mailbotsAdmin,
      "/mailbots",
      mailbotId
    );
    res.status(404).send(`
        <head>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootswatch/4.1.2/flatly/bootstrap.min.css" integrity="sha256-D411KJenDIQgLv9h+IgguBc1wWFNOYezUTtAHryNLBQ=" crossorigin="anonymous" />
        </head>
        <body>
        <div style="display: flex; align-items: center; justify-content: center; height: 62vh;">
          <div style="max-width: 50%; text-align: center">
            <h1>Page Not Found</h1>
            <p>Visit the <a href="${mailbotsDirectoryPage}">MailBots Directory page</a> for this mailbot</a> or <a href="/auth/login">login</a>.</p>
          </div>
        </div>
      </body>
    `);
  });
}
