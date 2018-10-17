const express = require("express");
const urljoin = require("urljoin");
const _ = require("lodash");

module.exports = function(gopherApp) {
  gopherApp.app.use(express.static("public"));

  /**
   * Catch unhandled webhook events
   */
  gopherApp.on(/.*/, gopher => {
    debug(`event unhandled: ${gopher.event}`);
    return gopher.webhook.respond({
      webhook: {
        status: "success",
        message: `Webhook received but not handled: ${gopher.event}`
      }
    });
  });

  /**
   * Catch errors
   */
  gopherApp.app.use((err, req, res, next) => {
    console.error(err); // Error logged to console for now
    res.status(500).send({
      webhook: {
        status: "failed",
        message:
          "There was an error processing the webhook. Check logs for details."
      }
    });
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
