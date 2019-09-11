// require("dotenv").config(); // TODO: Move to straight config

const { expect } = require("chai");
const request = require("supertest");
const fs = require("fs");
const MailBots = require("../dist/mailbots").default;
const crypto = require("crypto");

const clientId = "foo";
const clientSecret = "bar";

describe("MailBots App", function() {
  const taskCreatedWebhook = require("./fixtures/task-created-webhook.json");
  const actionReceivedWebhook = require("./fixtures/task-action-received-webhook.json");

  let mailbot = {}; // reinitialized before each test
  beforeEach(function() {
    mailbot = new MailBots({
      clientId,
      clientSecret
    });
  });

  function fireWebhookRequest(webhook, { errOnFallthrough = true } = {}) {
    // Throw an error if a request fails to match
    if (errOnFallthrough) {
      mailbot.on(/.*/, function failOnFallthrough(bot) {
        throw new Error("mailbot handler did not run");
      });
    }

    // Sign request
    const exampleTimestamp = Math.floor(Date.now() / 1000).toString();
    const generatedSignature = crypto
      .createHmac("sha256", exampleTimestamp + clientSecret)
      .update(JSON.stringify(webhook))
      .digest("hex");

    const app = mailbot.exportApp();
    return (
      request(app)
        .post("/webhooks")
        .set("Accept", "application/json")
        .set("X-MailBots-Timestamp", exampleTimestamp)
        .set("X-MailBots-Signature", generatedSignature)
        .send(webhook)
        // .then(res => {})
        .catch(err => {
          console.log(err);
          debugger;
        })
    );
  }

  // Example async function
  function getAsyncThing(delay = 10) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve({ my: "async settings" }), delay);
    });
  }

  describe("configuration", function() {
    it("should throw if instaniated without config", function(done) {
      expect(() => new MailBots()).to.throw();
      expect(() => new MailBots({ clientId, clientSecret })).to.not.throw();
      done();
    });
  });

  describe("webhook validation", function() {
    before(function() {
      process.env.NODE_ENV = "production";
    });

    after(function() {
      process.env.NODE_ENV = "test";
    });

    it("should only accept validate webhooks", function(done) {
      mailbot.on(/.*/, bot => {
        // Should fire and be valid
        expect(bot.requestJson.event).to.equal("task.created");
        done();
        bot.webhook.respond();
      });
      const exampleJson = require("./fixtures/task-created-webhook.json");
      fireWebhookRequest(exampleJson);
    });

    it("should fail webhook with an invalid secret", function(done) {
      mailbot.on(/.*/, bot => {
        done("An invalid webhook is executing");
        bot.webhook.respond();
      });

      const app = mailbot.exportApp();

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
        .set("X-MailBots-Timestamp", exampleTimestamp)
        .set("X-MailBots-Signature", generatedSignature)
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
      mailbot.onCommand(/.*/, bot => {
        expect(bot.command).to.equal("memorize");
        bot.webhook.respond();
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("onCommand handler matches a command by string", function(done) {
      mailbot.onCommand("memorize", bot => {
        expect(bot.command).to.equal("memorize");
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("onAction handler matches by regex", function(done) {
      mailbot.onAction(/^freque.*/, bot => {
        expect(bot.action).to.equal("frequency.0-2");
        bot.webhook.respond();
        done();
      });
      fireWebhookRequest(actionReceivedWebhook);
    });

    it("multiple handlers and requests can fire", async function() {
      mailbot.onCommand("memorize", function handleCmd(bot) {
        bot.webhook.quickReply("foo");
        expect(bot.command).to.equal("memorize");
        bot.webhook.respond();
      });

      mailbot.onAction(/^freque.*/, function handleFreq(bot) {
        bot.webhook.quickReply("got action");
        expect(bot.action).to.equal("frequency.0-2");
        bot.webhook.respond();
      });

      const result = await fireWebhookRequest(taskCreatedWebhook);
      const result2 = await fireWebhookRequest(actionReceivedWebhook);
    });

    it("multiple async handlers and requests can fire", async function() {
      mailbot.onCommand("memorize", async function handleCmd(bot) {
        await getAsyncThing(100);
        bot.webhook.quickReply("foo");
        expect(bot.command).to.equal("memorize");
        bot.webhook.respond();
      });

      mailbot.onAction(/^freque.*/, async function handleFreq(bot) {
        await getAsyncThing(100);
        bot.webhook.quickReply("got action");
        expect(bot.action).to.equal("frequency.0-2");
        bot.webhook.respond();
      });

      const result = await fireWebhookRequest(taskCreatedWebhook);
      const result2 = await fireWebhookRequest(actionReceivedWebhook);
    });

    const taskTriggeredWebhook = require("./fixtures/task-triggered-webhook.json");
    it("onTrigger handler matches task command by regex", function(done) {
      mailbot.onTrigger(/^mem.*/, bot => {
        expect(bot.get("task.command")).to.equal(
          "memorize@mailbots-memorize.eml.bot"
        );
        bot.webhook.respond();
        done();
      });
      fireWebhookRequest(taskTriggeredWebhook);
    });

    const taskViewedWebhook = require("./fixtures/task-viewed-webhook.json");
    it("onTaskViewed handler matches task command by regex", function(done) {
      mailbot.onTaskViewed(/^memorize.*/, bot => {
        expect(bot.get("task.command")).to.equal(
          "memorize@mailbots-memorize.eml.bot"
        );
        bot.webhook.respond();
        done();
      });
      fireWebhookRequest(taskViewedWebhook);
    });

    it("mailbot.on method matches webhook types", function(done) {
      mailbot.on("task.created", bot => {
        expect(bot.command).to.equal("memorize");
        bot.webhook.respond();
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("mailbot.on method matches webhook by function", function(done) {
      function matchFunction(webhook) {
        if (webhook.event == "task.created") return true;
      }
      mailbot.on(matchFunction, bot => {
        expect(bot.command).to.equal("memorize");
        bot.webhook.respond();
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("mailbot.on method matches webhook by regex", function(done) {
      mailbot.on(/task\..*/, bot => {
        expect(bot.command).to.equal("memorize");
        bot.webhook.respond();
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("mailbot.on method matches webhook by regex", function(done) {
      mailbot.onEvent("intercom", bot => {
        bot.webhook.quickReply("test");
        bot.webhook.respond();
        done();
      });
      const intercomEvent = require("./fixtures/mailbot-event-received.json");
      fireWebhookRequest(intercomEvent);
    });

    it("mailbot.on method matches webhook by regex (async)", async function() {
      mailbot.onEvent("intercom", async bot => {
        let res = await getAsyncThing();
        bot.webhook.respond();
      });
      const intercomEvent = require("./fixtures/mailbot-event-received.json");
      await fireWebhookRequest(intercomEvent);
    });

    it("once a match is found, no future routes are matched", function(done) {
      mailbot.on("task.created", bot => {
        expect(bot.command).to.equal("memorize");
        bot.webhook.respond();
        setTimeout(() => done(), 500);
      });
      mailbot.on(/.*/, bot => {
        done("This should not run");
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("gives a nice message when no handlers fire ", async function() {
      const res = await fireWebhookRequest(taskCreatedWebhook, {
        errOnFallthrough: false
      });
      expect(res.body.webhook.message).to.equal(
        "Webhook received but not handled: task.created"
      );
    });
  });

  describe("settings", function() {
    const mailbotSettingsViewed = require("./fixtures/mailbot-settings-viewed-webhook.json");

    it("fires onSettingsViewed handler", function(done) {
      mailbot.onSettingsViewed(bot => {
        done();
      });
      fireWebhookRequest(mailbotSettingsViewed, {
        errOnFallthrough: false
      });
    });

    it("onSettingsViewed handler adds a json response", function(done) {
      mailbot.onSettingsViewed(bot => {
        bot.responseJson = {
          settings: {
            foo: "bar"
          }
        };
      });
      fireWebhookRequest(mailbotSettingsViewed, {
        errOnFallthrough: false
      }).then(res => {
        expect(res.body.settings.foo).to.equal("bar");
        done();
      });
    });

    it("onSettingsViewed handler handles an async function", function(done) {
      mailbot.onSettingsViewed(async bot => {
        const settings = await getAsyncThing();
        bot.responseJson = settings;
      });
      fireWebhookRequest(mailbotSettingsViewed, {
        errOnFallthrough: false
      }).then(res => {
        expect(res.body.my).to.equal("async settings");
        done();
      });
    });

    it("multiple onSettingsViewed handlers fire", function(done) {
      mailbot.onSettingsViewed(bot => {
        bot.responseJson = {
          settings: {
            foo: "bar"
          }
        };
      });

      mailbot.onSettingsViewed(bot => {
        bot.responseJson.settings.shoe = "far";
      });

      fireWebhookRequest(mailbotSettingsViewed, {
        errOnFallthrough: false
      }).then(res => {
        expect(res.body.settings.foo).to.equal("bar");
        expect(res.body.settings.shoe).to.equal("far");
        done();
      });
    });

    it("passes data between onSettingsViewed handlers", function(done) {
      mailbot.onSettingsViewed(bot => {
        bot.responseJson = {
          settings: {
            foo: "bar"
          }
        };
      });

      mailbot.onSettingsViewed(bot => {
        expect(bot.responseJson.settings.foo).to.equal("bar");
        done();
      });

      fireWebhookRequest(mailbotSettingsViewed, {
        errOnFallthrough: false
      });
    });

    const mailbotSettingsBeforeSaved = require("./fixtures/mailbot-settings-pre-saved-webhook.json");

    it("fires onSettingsSubmit handler", function(done) {
      mailbot.onSettingsSubmit(bot => {
        done();
      });
      fireWebhookRequest(mailbotSettingsBeforeSaved, {
        errOnFallthrough: false
      });
    });

    it("multiple onSettingsSubmit handlers fire with data", function(done) {
      mailbot.onSettingsSubmit(bot => {
        bot.webhook.setMailBotData("github.foo", "bar");
      });
      mailbot.onSettingsSubmit(bot => {
        expect(bot.webhook.getMailBotData("github.foo")).to.equal("bar");
        bot.webhook.setMailBotData("github.shoe", "far");
      });
      fireWebhookRequest(mailbotSettingsBeforeSaved, {
        errOnFallthrough: false
      }).then(res => {
        expect(res.body.mailbot.stored_data.github.foo).to.equal("bar");
        expect(res.body.mailbot.stored_data.github.shoe).to.equal("far");
        done();
      });
    });

    it("resets existing mailbot settings", function(done) {
      mailbot.onSettingsSubmit(bot => {
        bot.webhook.setMailBotData("github.foo", "bar");
      });
      mailbot.onSettingsSubmit(bot => {
        expect(bot.webhook.getMailBotData("github.foo")).to.equal("bar");
        bot.webhook.setMailBotData("github.shoe", "far");
      });
      fireWebhookRequest(mailbotSettingsBeforeSaved, {
        errOnFallthrough: false
      }).then(res => {
        expect(res.body.mailbot.stored_data.github.foo).to.equal("bar");
        expect(res.body.mailbot.stored_data.github.shoe).to.equal("far");
        done();
      });
    });
  });

  describe("middleware", function() {
    it("uses middleware to add skills", function(done) {
      mailbot.app.use((req, res, next) => {
        res.locals.bot.skills.completeTest = function(done) {
          done();
        };
        next();
      });
      mailbot.on(/.*/, bot => {
        bot.skills.completeTest(done);
        bot.webhook.respond();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("uses async middleware to add skills", function(done) {
      mailbot.app.use((req, res, next) => {
        res.locals.bot.skills.completeTest = function(done) {
          done();
        };
        next();
      });
      mailbot.on(/.*/, bot => {
        bot.skills.completeTest(done);
        bot.webhook.respond();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("allows middleware to make itself run once per request", async function() {
      let runCount = 0;
      function mw(req, res, next) {
        const bot = res.locals.bot;
        if (bot.alreadyRan(mw)) return next(); // reference itself
        runCount++;
        next();
      }

      // duplicate middleware function on stack
      mailbot.app.use(mw);
      mailbot.app.use(mw);
      mailbot.app.use(mw);
      mailbot.app.use(mw);

      // only two requests
      await fireWebhookRequest(taskCreatedWebhook, {
        errOnFallthrough: false
      });

      await fireWebhookRequest(taskCreatedWebhook, {
        errOnFallthrough: false
      });

      expect(runCount).to.equal(2);
    });
  });

  describe("loading skills", function() {
    it("loads skills from a directory", function(done) {
      mailbot.loadSkill(__dirname + "/test-skills-1");
      mailbot.onCommand("memorize", bot => {
        expect(bot.skills.testing1).to.be.true;
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("loads skills from multiple directories", function(done) {
      mailbot.loadSkill(__dirname + "/test-skills-1");
      mailbot.loadSkill(__dirname + "/test-skills-2/");
      mailbot.onCommand("memorize", bot => {
        expect(bot.skills.testing1).to.be.true;
        expect(bot.skills.testing2).to.be.false;
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });

    it("loads skill files in alpha order by filename", function(done) {
      mailbot.loadSkill(__dirname + "/test-skills-1");
      mailbot.onCommand("memorize", bot => {
        expect(bot.skills.overwrite).to.equal("z-test-skill");
        done();
      });
      fireWebhookRequest(taskCreatedWebhook);
    });
  });

  describe("request information", function() {
    it("checks if current request is a webhook or not", function() {
      mailbot.app.use((req, res, next) => {
        expect(res.locals.bot.isWebhook).to.be.true;
        next();
      });
      fireWebhookRequest(taskCreatedWebhook, { errOnFallthrough: false });
    });

    it("checks if current request is not a webhook", function(done) {
      mailbot.app.use((req, res, next) => {
        expect(res.locals.bot.isWebhook).to.be.false;
        done();
        next();
      });
      request(mailbot.app)
        .get("/something-else")
        .set("Accept", "application/json")
        .catch(err => {
          console.log(err);
          debugger;
        });
    });
  });

  describe("async handlers", function() {
    it("handles an onCommand handler that returns a promise", async function() {
      mailbot.onCommand("memorize", async function(bot) {
        let res = await getAsyncThing();
        bot.set("task.stored_data", res);
        bot.webhook.respond();
      });
      const exampleJson = require("./fixtures/task-created-webhook.json");
      const webhookResponse = await fireWebhookRequest(exampleJson);
      expect(webhookResponse.body).to.deep.eq({
        version: "1",
        task: { stored_data: { frequency_pref: "1.5", my: "async settings" } }
      });
    });

    it.skip("doesn't support async handlers that use callbacks");
  });

  describe("followupthen lifecycle hooks", function() {
    it("mailbot.onFutViewUser method works with raw json", function(done) {
      mailbot.onFutViewUser(bot => {
        bot.responseJson = {
          // must add response directly to responseJson
          futUiAddition: [
            {
              type: "text",
              text: "An SMS notification will also be sent with this reminder."
            }
          ]
        };
      });

      const futViewedInterbotEvent = require("./fixtures/mailbot-interbot-event-fut-task-viewed.json");
      fireWebhookRequest(futViewedInterbotEvent).then(res => {
        expect(res.body.futUiAddition).to.be.an("array");
        expect(res.body.futUiAddition[0]).to.haveOwnProperty("text");
      });
      done();
    });

    it("bot.webhook.addFutUiBlocks helper methods add IUiBlock elements", function(done) {
      mailbot.onFutViewUser(bot => {
        bot.webhook.addFutUiBlocks([
          {
            type: "text",
            text: "An SMS notification will also be sent with this reminder."
          }
        ]);
      });

      const futViewedInterbotEvent = require("./fixtures/mailbot-interbot-event-fut-task-viewed.json");
      fireWebhookRequest(futViewedInterbotEvent).then(res => {
        // console.log(res.body);
        expect(res.body.futUiAddition).to.be.an("array");
        expect(res.body.futUiAddition[0]).to.haveOwnProperty("text");
      });
      done();
    });

    it("bot.webhook.addFutUiBlocks accumulates IUiBlock elements", function(done) {
      mailbot.onFutViewUser(bot => {
        bot.webhook.addFutUiBlocks([
          {
            type: "text",
            text: "An SMS notification will also be sent with this reminder."
          }
        ]);
      });

      mailbot.onFutViewUser(bot => {
        bot.webhook.addFutUiBlocks([
          {
            type: "text",
            text: "More UI Blocks"
          }
        ]);
      });

      const futViewedInterbotEvent = require("./fixtures/mailbot-interbot-event-fut-task-viewed.json");
      fireWebhookRequest(futViewedInterbotEvent).then(res => {
        // console.log(res.body);
        expect(res.body.futUiAddition).to.be.an("array");
        expect(res.body.futUiAddition.length).to.equal(2);
      });
      done();
    });

    it("bot.set gives error if a FUT handlers sets data outside ISkillResponse", function(done) {
      mailbot.onFutViewUser(bot => {
        try {
          bot.set("mailbot.stored_data", "foo"); // Not allowed if handling a futHook!
          bot.webhook.respond();
          done("FUT Skill response handler did not throw error");
        } catch (e) {
          done();
        }
      });

      const futViewedInterbotEvent = require("./fixtures/mailbot-interbot-event-fut-task-viewed.json");
      fireWebhookRequest(futViewedInterbotEvent);
    });
  });

  describe("error handling", function() {
    const mailbotSettingsViewed = require("./fixtures/mailbot-settings-viewed-webhook.json");

    it("uses the default error handler", async function() {
      process.env.SILENCE_DEFAULT_ERROR_HANDLER = "true";
      mailbot.onCommand("memorize", bot => {
        throw new Error("An error!");
        bot.webhook.respond(); // isnt' called
      });
      const result = await fireWebhookRequest(taskCreatedWebhook);
      expect(result.status).to.equal(500);
      expect(result.body.webhook.message).to.contain(
        "Your MailBot caught an unhandled error"
      );
      delete process.env.SILENCE_DEFAULT_ERROR_HANDLER;
    });

    it("uses the default error handler in async requests", async function() {
      process.env.SILENCE_DEFAULT_ERROR_HANDLER = "true";
      mailbot.onCommand("memorize", async bot => {
        await getAsyncThing(20);
        throw new Error("An error!");
        bot.webhook.respond(); // isnt' called
      });
      const result = await fireWebhookRequest(taskCreatedWebhook);
      expect(result.body.webhook.message).to.contain(
        "Your MailBot caught an unhandled error"
      );
      delete process.env.SILENCE_DEFAULT_ERROR_HANDLER;
    });

    it("uses the default error handler in multi-fire handlers", async function() {
      process.env.SILENCE_DEFAULT_ERROR_HANDLER = "true";
      mailbot.onSettingsViewed(bot => {
        throw new Error("An error!");
        bot.webhook.respond(); // isnt' called
      });
      const result = await fireWebhookRequest(mailbotSettingsViewed);
      expect(result.body.webhook.message).to.contain(
        "Your MailBot caught an unhandled error"
      );
      delete process.env.SILENCE_DEFAULT_ERROR_HANDLER;
    });

    it("uses the default error handler in in async multi-fire handlers", async function() {
      process.env.SILENCE_DEFAULT_ERROR_HANDLER = "true";
      mailbot.onSettingsViewed(async bot => {
        await getAsyncThing(20);
        throw new Error("An error!");
        bot.webhook.respond(); // isnt' called
      });
      const result = await fireWebhookRequest(mailbotSettingsViewed);
      expect(result.body.webhook.message).to.contain(
        "Your MailBot caught an unhandled error"
      );
      delete process.env.SILENCE_DEFAULT_ERROR_HANDLER;
    });

    it("uses a custom error handler in async one-time handlers", async function() {
      mailbot.setErrorHandler((err, bot) => {
        expect(err.message).to.equal("An error!");
        return bot.webhook.respond({
          webhook: { status: "failed", message: err.message }
        });
      });

      mailbot.onCommand("memorize", async function handleCmd(bot) {
        const foo = await getAsyncThing(100);
        throw new Error("An error!");
        bot.webhook.respond(); // isnt' called
      });

      const result = await fireWebhookRequest(taskCreatedWebhook);
    });

    it("handles an error and then more requets", async function() {
      mailbot.setErrorHandler((err, bot) => {
        expect(err.message).to.equal("An error!");
        return bot.webhook.respond({
          webhook: { status: "failed", message: err.message }
        });
      });

      mailbot.onCommand("memorize", async function handleCmd(bot) {
        const foo = await getAsyncThing(100);
        throw new Error("An error!");
        bot.webhook.respond(); // isnt' called
      });

      mailbot.onAction(/^freque.*/, function handleFreq(bot) {
        bot.webhook.quickReply("got action");
        expect(bot.action).to.equal("frequency.0-2");
        bot.webhook.respond();
      });

      const result = await fireWebhookRequest(taskCreatedWebhook);
      const result2 = await fireWebhookRequest(actionReceivedWebhook);
    });

    it("uses a custom error handler with async multi-fire handlers (settings)", async function() {
      mailbot.setErrorHandler((err, bot) => {
        bot.webhook.respond({ webhook: { message: "foo!" } });
      });

      mailbot.onSettingsViewed(function(bot) {
        throw new Error("An error!");
        bot.webhook.respond();
      });

      const result = await fireWebhookRequest(mailbotSettingsViewed);
      expect(result.body.webhook.message).to.contain("foo!");
    });

    it("bubbles up Express middleware errors to MailBots App Error Handler", function(done) {
      mailbot.setErrorHandler((err, bot) => {
        expect(err.message).to.equal("Middleware Error");
        done();
        bot.webhook.respond();
      });

      mailbot.app.use((req, res, next) => {
        return next(new Error("Middleware Error"));
      });

      mailbot.onCommand("memorize", bot => {
        done("Handler should not have run");
        bot.webhook.respond();
      });

      const result = fireWebhookRequest(taskCreatedWebhook);
    });
  });

  describe("problematic payloads", function() {
    it("handles large files", async function() {
      mailbot.onCommand("memorize", bot => {
        bot.webhook.respond({
          webhook: {
            message: "handled large file"
          }
        });
      });

      mailbot.setErrorHandler(err => {
        console.log(err);
      });

      const hugeTask = { ...taskCreatedWebhook };
      for (let i = 0; i < 1000 * 1000 * 4; i++) {
        hugeTask.source.html += ".";
      }
      const result = await fireWebhookRequest(hugeTask, {
        errOnFallthrough: false
      });

      expect(result.body.webhook.message).to.equal("handled large file");
      return;
    });
  });
});
