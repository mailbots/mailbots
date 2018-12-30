const express = require("express");
const urljoin = require("url-join");
const _ = require("lodash");
const debug = require("debug")("mailbots");

module.exports = function(mailbot) {
  mailbot.app.use(express.static("public"));

  /**
   * Default webhook response for unhandled webhook events
   */
  mailbot.on(/.*/, function catchUnhandledEvent(bot) {
    debug(`event unhandled: ${bot.event}`);
    return bot.webhook.respond({
      webhook: {
        status: "success",
        message: `Webhook received but not handled: ${bot.event}`
      }
    });
  });

  // Send Express errors to MailBots's error handler
  mailbot.app.use((err, req, res, next) => {
    const bot = res.locals.bot;
    mailbot.errorHandler(err, bot);
  });

  // Custom 404
  mailbot.app.use((req, res) => {
    const bot = res.locals.bot;
    const mailbotsDirectoryPage = urljoin(
      bot.config.mailbotsAdmin,
      "/extensions",
      bot.config.botId
    );
    res.status(404).send(`
        <head>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootswatch/4.1.2/flatly/bootstrap.min.css" integrity="sha256-D411KJenDIQgLv9h+IgguBc1wWFNOYezUTtAHryNLBQ=" crossorigin="anonymous" />
        </head>
        <body>
        <div style="display: flex; align-items: center; justify-content: center; height: 62vh;"> 
          <div style="max-width: 50%; text-align: center">
            <h1>Page Not Found</h1>
            <p>Visit the <a href="${mailbotsDirectoryPage}">MailBots Directory page</a> for this extension</a> or <a href="/auth/login">login</a>.</p>
          </div>
        </div>
      </body>
    `);
  });
};
