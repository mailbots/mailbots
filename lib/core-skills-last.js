const express = require("express");
const urljoin = require("urljoin");
const _ = require("lodash");
const debug = require("debug")("gopher-app");

module.exports = function(gopherApp) {
  gopherApp.app.use(express.static("public"));

  /**
   * Default webhook response for unhandled webhook events
   */
  gopherApp.on(/.*/, function catchUnhandledEvent(gopher) {
    debug(`event unhandled: ${gopher.event}`);
    return gopher.webhook.respond({
      webhook: {
        status: "success",
        message: `Webhook received but not handled: ${gopher.event}`
      }
    });
  });

  /**
   * Send Express errors to Gopher App's error handler
   */
  gopherApp.app.use((err, req, res, next) => {
    const gopher = res.locals.gopher;
    gopherApp.errorHandler(err, gopher);
  });

  /**
   * Custom 404
   */
  gopherApp.app.use((req, res) => {
    const gopher = res.locals.gopher;
    const extensionDirectoryPage = urljoin(
      gopher.config.gopherAdmin,
      "/extensions",
      gopher.config.extensionId
    );
    res.status(404).send(`
        <head>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootswatch/4.1.2/flatly/bootstrap.min.css" integrity="sha256-D411KJenDIQgLv9h+IgguBc1wWFNOYezUTtAHryNLBQ=" crossorigin="anonymous" />
        </head>
        <body>
        <div style="display: flex; align-items: center; justify-content: center; height: 62vh;"> 
          <div style="max-width: 50%; text-align: center">
            <h1>Page Not Found</h1>
            <p>Visit the <a href="${extensionDirectoryPage}">Gopher Directory page</a> for this extension</a> or <a href="/auth/login">login</a>.</p>
          </div>
        </div>
      </body>
    `);
  });
};
