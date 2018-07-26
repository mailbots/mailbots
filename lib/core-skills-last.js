const express = require("express");
const urljoin = require("urljoin");

module.exports = function(gopherApp) {
  gopherApp.use(express.static("public"));

  /**
   * Catch unhandled webhook events
   */
  gopherApp.on(/.*/, (gopher, request, response) => {
    return response.send({
      webhook: {
        status: "success",
        message: `Webhook received but not handled: ${request.body.event}`
      }
    });
  });

  /**
   * Custom 404
   */
  gopherApp.use((request, response) => {
    const gopher = response.locals.gopher;
    const extensionDirectoryPage = urljoin(
      gopher.config.gopherAdmin,
      "/extensions",
      gopher.config.extensionId
    );
    response.status(404).send(`
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
