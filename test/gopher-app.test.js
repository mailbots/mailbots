// require("dotenv").config(); // TODO: Move to straight config

const { expect } = require("chai");
const request = require("supertest");
const fs = require("fs");
const GopherApp = require("../gopher-app");

describe("Gopher App", function() {
  const taskCreatedWebhook = require("./fixtures/task-created-webhook.json");
  let gopherApp = {}; // reinitialized before each test
  beforeEach(function() {
    gopherApp = new GopherApp({
      clientId: "foo",
      clientSecret: "bar"
    });
  });

  function fireWebhookRequest(webhook, { errOnFallthrough = true } = {}) {
    // Throw an error if a request fails to match
    if (errOnFallthrough) {
      gopherApp.on(/.*/, gopher => {
        throw new Error("Gopher handler did not run");
      });
    }
    const app = gopherApp.exportApp();
    return (
      request(app)
        .post("/webhooks")
        .set("Accept", "application/json")
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
      expect(
        () => new GopherApp({ clientId: "foo", clientSecret: "bar" })
      ).to.not.throw();
      done();
    });
  });

  describe("event matching", function() {
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
          expect(res.body.extension.private_data.github.foo).to.equal("bar");
          expect(res.body.extension.private_data.github.shoe).to.equal("far");
          done();
        });
      });

      // TODO: In GopherHelper
      // it("uses gopher helper to get and set settings");
      // Before saving

      it("onSettingsViewed loads data by namespace", function(done) {
        gopherApp.addSettingsForm("memorize", (gopher, settings) => {
          expect(settings.firstName).to.equal("Karl");
          done();
        });
        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
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
        expect(gopher.command).to.equal("memorize");
        gopher.webhook.respond();
        throw new Error("This should never run");
      });
      fireWebhookRequest(taskCreatedWebhook);
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
});
