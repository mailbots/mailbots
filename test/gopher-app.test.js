// require("dotenv").config(); // TODO: Move to straight config

const { expect } = require("chai");
const request = require("supertest");
const fs = require("fs");
const GopherApp = require("../gopher-app");
const crypto = require("crypto");

const clientId = "foo";
const clientSecret = "bar";

describe("Gopher App", function() {
  const taskCreatedWebhook = require("./fixtures/task-created-webhook.json");
  let gopherApp = {}; // reinitialized before each test
  beforeEach(function() {
    gopherApp = new GopherApp({
      clientId,
      clientSecret
    });
  });

  function fireWebhookRequest(webhook, { errOnFallthrough = true } = {}) {
    // Throw an error if a request fails to match
    if (errOnFallthrough) {
      gopherApp.on(/.*/, gopher => {
        throw new Error("Gopher handler did not run");
      });
    }

    // Sign request
    const exampleTimestamp = Math.floor(Date.now() / 1000).toString();
    const generatedSignature = crypto
      .createHmac("sha256", exampleTimestamp + clientSecret)
      .update(JSON.stringify(webhook))
      .digest("hex");

    const app = gopherApp.exportApp();
    return (
      request(app)
        .post("/webhooks")
        .set("Accept", "application/json")
        .set("X-Gopher-Timestamp", exampleTimestamp)
        .set("X-Gopher-Signature", generatedSignature)
        .send(webhook)
        // .then(res => {})
        .catch(err => {
          console.log(err);
          debugger;
        })
    );
  }

  describe("configuration", function() {
    it("should throw if instaniated without config", function(done) {
      expect(() => new GopherApp()).to.throw();
      expect(() => new GopherApp({ clientId, clientSecret })).to.not.throw();
      done();
    });
  });

  describe("webhook validation", function() {
    before(function() {
      process.env.NODE_ENV = "production";
    });

    after(function() {
      process.env.NODE_ENV = "testing";
    });

    it("should only accept validate webhooks", function(done) {
      gopherApp.on(/.*/, gopher => {
        // Should fire and be valid
        expect(gopher.requestJson.event).to.equal("task.created");
        done();
        gopher.webhook.respond();
      });
      const exampleJson = require("./fixtures/task-created-webhook.json");
      fireWebhookRequest(exampleJson);
    });

    it("should fail webhook with an invalid secret", function(done) {
      gopherApp.on(/.*/, gopher => {
        done("An invalid webhook is executing");
        gopher.webhook.respond();
      });

      const app = gopherApp.exportApp();

      // build and sign request
      const exampleJson = require("./fixtures/task-created-webhook.json");

      const exampleTimestamp = Math.floor(Date.now() / 1000).toString();
      let generatedSignature = crypto
        .createHmac("sha256", exampleTimestamp + clientSecret + "foo")
        .update(JSON.stringify(exampleJson))
        .digest("hex");

      request(app)
        .post("/webhooks")
        .set("Accept", "application/json")
        .set("X-Gopher-Timestamp", exampleTimestamp)
        .set("X-Gopher-Signature", generatedSignature)
        .send(exampleJson)
        .then(res => {
          expect(res.status).to.equal(403);
          expect(res.body.message).to.equal("Webhook validation failed");
          done();
        })
        .catch(err => {
          console.log(err);
          debugger;
        });
    });
  });

  describe("event matching", function() {
    // Request headers are missing..but how best to catch this error??
    it("onCommand handler matches a command by regex", function(done) {
      gopherApp.onCommand(/.*/, gopher => {
        expect(gopher.command).to.equal("memorize");
        gopher.webhook.respond();
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("onCommand handler matches a command by string", function(done) {
      gopherApp.onCommand("memorize", gopher => {
        expect(gopher.command).to.equal("memorize");
        gopher.webhook.respond();
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    const actionReceivedWebhook = require("./fixtures/task-action-received-webhook.json");
    it("onAction handler matches by regex", function(done) {
      gopherApp.onAction(/^freque.*/, gopher => {
        expect(gopher.action).to.equal("frequency.0-2");
        gopher.webhook.respond();
        done();
      });
      fireWebhookRequest(actionReceivedWebhook);
    });

    const taskTriggeredWebhook = require("./fixtures/task-triggered-webhook.json");
    it("onTrigger handler matches task command by regex", function(done) {
      gopherApp.onTrigger(/^mem.*/, gopher => {
        expect(gopher.get("task.command")).to.equal(
          "memorize@gopher-memorize.gopher.email"
        );
        gopher.webhook.respond();
        done();
      });
      fireWebhookRequest(taskTriggeredWebhook);
    });

    const taskViewedWebhook = require("./fixtures/task-viewed-webhook.json");
    it("onTaskViewed handler matches task command by regex", function(done) {
      gopherApp.onTaskViewed(/^memorize.*/, gopher => {
        expect(gopher.get("task.command")).to.equal(
          "memorize@gopher-memorize.gopher.email"
        );
        gopher.webhook.respond();
        done();
      });
      fireWebhookRequest(taskViewedWebhook);
    });

    describe("settings", function() {
      const extensionSettingsViewed = require("./fixtures/extension-settings-viewed-webhook.json");

      it("fires onSettingsViewed handler", function(done) {
        gopherApp.onSettingsViewed(gopher => {
          done();
        });
        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        });
      });

      // TODO: Make sure all form schemas are objects
      it("onSettingsViewed handler returns proper data types");

      it("onSettingsViewed handler adds a json response", function(done) {
        gopherApp.onSettingsViewed(gopher => {
          gopher.responseJson = {
            settings: {
              foo: "bar"
            }
          };
        });
        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        }).then(res => {
          expect(res.body.settings.foo).to.equal("bar");
          done();
        });
      });

      it("onSettingsViewed handler handles an async function", function(done) {
        function getSettingsAsync() {
          return new Promise((resolve, reject) => {
            setTimeout(() => resolve({ my: "realtime settings" }), 10);
          });
        }

        gopherApp.onSettingsViewed(async gopher => {
          const settings = await getSettingsAsync();
          gopher.responseJson = settings;
        });
        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        }).then(res => {
          expect(res.body.my).to.equal("realtime settings");
          done();
        });
      });

      it("onSettingsViewed catches errors", function(done) {
        gopherApp.onSettingsViewed(async gopher => {
          throw new Error("A Test Error");
        });
        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        }).then(res => {
          expect(res.body).to.deep.equal({
            webhook: { status: "failed", message: "A Test Error" }
          });
          done();
        });
      });

      it("multiple onSettingsViewed handlers fire", function(done) {
        gopherApp.onSettingsViewed(gopher => {
          gopher.responseJson = {
            settings: {
              foo: "bar"
            }
          };
        });

        gopherApp.onSettingsViewed(gopher => {
          gopher.responseJson.settings.shoe = "far";
        });

        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        }).then(res => {
          expect(res.body.settings.foo).to.equal("bar");
          expect(res.body.settings.shoe).to.equal("far");
          done();
        });
      });

      it("passes data between onSettingsViewed handlers", function(done) {
        gopherApp.onSettingsViewed(gopher => {
          gopher.responseJson = {
            settings: {
              foo: "bar"
            }
          };
        });

        gopherApp.onSettingsViewed(gopher => {
          expect(gopher.responseJson.settings.foo).to.equal("bar");
          done();
        });

        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        });
      });

      const extensionSettingsBeforeSaved = require("./fixtures/extension-settings-pre-saved-webhook.json");

      it("fires beforeSettingsSaved handler", function(done) {
        gopherApp.beforeSettingsSaved(gopher => {
          done();
        });
        fireWebhookRequest(extensionSettingsBeforeSaved, {
          errOnFallthrough: false
        });
      });

      it("multiple beforeSettingsSaved handlers fire with data", function(done) {
        gopherApp.beforeSettingsSaved(gopher => {
          gopher.webhook.setExtensionData("github.foo", "bar");
        });
        gopherApp.beforeSettingsSaved(gopher => {
          expect(gopher.webhook.getExtensionData("github.foo")).to.equal("bar");
          gopher.webhook.setExtensionData("github.shoe", "far");
        });
        fireWebhookRequest(extensionSettingsBeforeSaved, {
          errOnFallthrough: false
        }).then(res => {
          expect(res.body.extension.stored_data.github.foo).to.equal("bar");
          expect(res.body.extension.stored_data.github.shoe).to.equal("far");
          done();
        });
      });
    });
    it("gopherApp.on method matches webhook types", function(done) {
      gopherApp.on("task.created", gopher => {
        expect(gopher.command).to.equal("memorize");
        gopher.webhook.respond();
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("gopherApp.on method matches webhook by function", function(done) {
      function matchFunction(webhook) {
        if (webhook.event == "task.created") return true;
      }
      gopherApp.on(matchFunction, gopher => {
        expect(gopher.command).to.equal("memorize");
        gopher.webhook.respond();
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("gopherApp.on method matches webhook by regex", function(done) {
      gopherApp.on(/task\..*/, gopher => {
        expect(gopher.command).to.equal("memorize");
        gopher.webhook.respond();
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("once a match is found, no future routes are matched", function(done) {
      gopherApp.on("task.created", gopher => {
        expect(gopher.command).to.equal("memorize");
        gopher.webhook.respond();
        setTimeout(() => done(), 500);
      });
      gopherApp.on(/.*/, gopher => {
        done("This should not run");
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("sends json response if not called by handler", async function() {
      gopherApp.on("task.created", gopher => {
        // gopher.webhook.respond(); //deliberately omitted
      });
      const res = await fireWebhookRequest(taskCreatedWebhook);
      expect(res.body.version).to.equal("1");
    });

    // Tests do not fail when a response is sent twice.
    // Run only this test and log around handleEvent to verify
    it.skip("does not re-send json response handler already responded", async function() {
      gopherApp.on("task.created", gopher => {
        gopher.webhook.respond({
          task: {
            completed: 1
          }
        });
      });
      const res = await fireWebhookRequest(taskCreatedWebhook);
      expect(res.body.version).to.equal("1");
    });
  });

  describe("middleware", function() {
    it("uses middleware to add skills", function(done) {
      gopherApp.app.use((req, res, next) => {
        res.locals.gopher.skills.completeTest = function(mochaDone) {
          mochaDone();
        };
        next();
      });
      gopherApp.on(/.*/, gopher => {
        gopher.skills.completeTest(done);
        gopher.webhook.respond();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });
  });

  describe("loading skills", function() {
    it("loads skills from a directory", function(done) {
      gopherApp.loadSkill(__dirname + "/test-skills-1");
      gopherApp.onCommand("memorize", gopher => {
        expect(gopher.skills.testing1).to.be.true;
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("loads skills from multiple directories", function(done) {
      gopherApp.loadSkill(__dirname + "/test-skills-1");
      gopherApp.loadSkill(__dirname + "/test-skills-2/");
      gopherApp.onCommand("memorize", gopher => {
        expect(gopher.skills.testing1).to.be.true;
        expect(gopher.skills.testing2).to.be.false;
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("loads skill files in alpha order by filename", function(done) {
      gopherApp.loadSkill(__dirname + "/test-skills-1");
      gopherApp.onCommand("memorize", gopher => {
        expect(gopher.skills.overwrite).to.equal("z-test-skill");
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });
  });

  describe("Gopher API", function() {
    it("loads authenticated gopher api client on gopher.api", function(done) {
      gopherApp.onCommand("memorize", gopher => {
        expect(gopher.api._accessToken).to.be.not.null;
        gopher.webhook.respond();
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });
  });

  describe("request information", function() {
    it("checks if current request is a webhook or not", function(done) {
      gopherApp.app.use((req, res, next) => {
        expect(res.locals.gopher.isWebhook).to.be.true;
        done();
        next();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("checks if current request is not a webhook", function(done) {
      gopherApp.app.use((req, res, next) => {
        expect(res.locals.gopher.isWebhook).to.be.false;
        done();
        next();
      });
      request(gopherApp.app)
        .get("/something-else")
        .set("Accept", "application/json")
        .catch(err => {
          console.log(err);
          debugger;
        });
    });
  });
});
