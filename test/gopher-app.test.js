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
      it("onSettingsViewed loads data by namespace", function(done) {
        gopherApp.addSettingsForm("memorize", (gopher, settings) => {
          expect(settings.firstName).to.equal("Karl");
          done();
        });
        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        });
      });

      it("addSettingsForm loads data by namespace", function(done) {
        gopherApp.addSettingsForm("github", (gopher, settings) => {
          expect(settings.firstName).to.equal("Joe");
          done();
        });
        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        });
      });

      it("merges namespaced settings while viewing", function(done) {
        gopherApp.addSettingsForm("memorize", (gopher, settings) => {
          return { my: "realtime settings" };
        });
        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        }).then(res => {
          expect(res.body.settings.memorize.my).to.equal("realtime settings");
          done();
        });
      });

      it("merges multiple namespaced settings while viewing", function(done) {
        gopherApp.addSettingsForm("memorize", (gopher, settings) => {
          return { my: "realtime settings" };
        });

        gopherApp.addSettingsForm("github", (gopher, settings) => {
          return { my: "other settings" };
        });

        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        }).then(res => {
          expect(res.body.settings.memorize.my).to.equal("realtime settings");
          expect(res.body.settings.github.my).to.equal("other settings");
          done();
        });
      });

      it("handles async settings handlers", function(done) {
        // Async test function
        function getSettingsAsync() {
          return new Promise((resolve, reject) => {
            setTimeout(() => resolve({ my: "realtime settings" }), 500);
          });
        }
        // Add handler
        gopherApp.addSettingsForm("memorize", async (gopher, settings) => {
          return await getSettingsAsync();
        });
        fireWebhookRequest(extensionSettingsViewed, {
          errOnFallthrough: false
        }).then(res => {
          expect(res.body.settings.memorize.my).to.equal("realtime settings");
          done();
        });
      });

      it("handles settings handlers with errors", function(done) {
        function getSettingsAsync() {
          return new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error("A Test Error")), 500);
          });
        }
        // Add handler
        gopherApp.addSettingsForm("memorize", async (gopher, settings) => {
          return await getSettingsAsync();
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

      const extensionSettingsBeforeSaved = require("./fixtures/extension-settings-pre-saved-webhook.json");
      it("beforeSettingsSaved shows data by namespace", function(done) {
        gopherApp.beforeSettingsSaved(
          "memorize",
          (gopher, settings, newSettings) => {
            expect(settings.firstName).to.equal("Karl");
            expect(newSettings.firstName).to.equal("NewKarl");
            done();
          }
        );
        fireWebhookRequest(extensionSettingsBeforeSaved, {
          errOnFallthrough: false
        });
      });

      it("handles when the namespace does not exist and nothing is done", function(done) {
        gopherApp.beforeSettingsSaved(
          "does_not_exist",
          (gopher, settings, newSettings) => {
            expect(settings).to.be.undefined;
            expect(newSettings).to.be.undefined;
            done();
          }
        );
        fireWebhookRequest(extensionSettingsBeforeSaved, {
          errOnFallthrough: false
        });
      });

      it.skip("injects entirely new settings on pre-settings-saved", function(done) {
        gopherApp.beforeSettingsSaved(
          "does_not_exist",
          (gopher, settings, newSettings) => {
            console.log("settings", settings);
            // simple key / value pair of data for that namespace
            return { settings };

            // expect(settings).to.be.undefined;
            // expect(newSettings).to.be.undefined;
            // gopher.webhook.setExtensionData(
            //   "does_not_exist.newsetting",
            //   "newvalue"
            // );
            done();
          }
        );
        fireWebhookRequest(extensionSettingsBeforeSaved, {
          errOnFallthrough: false
        }).then(res => {
          console.log(res.body);
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
