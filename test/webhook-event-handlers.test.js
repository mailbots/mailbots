require("dotenv").config(); // TODO: Move to straight config
console.log(process.env);

const { expect } = require("chai");
const request = require("supertest");
const fs = require("fs");
const GopherApp = require("../gopher-app");
const gopherApp = new GopherApp();

describe.only("webhook event handlers", function() {
  const webhookJsonBase = require("./fixtures/task-created-webhook.json");

  it("should forward the matched expression from a regex event handler", function(done) {
    const wildcardCommand = { ...webhookJsonBase };
    wildcardCommand.command.format = "wildcard";
    gopherApp.onCommand(/.*/, (gopher, request, response) => {
      debugger;
      gopher.webhook.respond();
    });

    const app = gopherApp.exportApp();

    const webhookJson = require("./fixtures/task-created-webhook.json");
    request(app)
      .post("/webhooks")
      .set("Accept", "application/json")
      .send(webhookJson)
      .then(res => {
        done();
      })
      .catch(err => {
        console.log(err);
        done(err);
      });
  });
});
