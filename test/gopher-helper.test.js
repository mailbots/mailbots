const { expect } = require("chai");
const GopherHelper = require("../lib/gopher-helper");

describe("Gopher Helper", function() {
  const webhookJson = require("./fixtures/task-created-webhook.json");
  // TODO: Improve testing different types of webhooks
  // const webhookJson = require("./fixtures/task-triggered-webhook.json");
  // const webhookJson = require("./fixtures/task-action-received-webhook.json");
  // const webhookJson = require("./fixtures/task-updated-webhook.json");
  // const webhookJson = require("./fixtures/extension-triggered-webhook.json"); //expected failures for undefined

  const request = {};
  request.body = webhookJson;
  response = {};
  response.locals = {};
  gopherHelper = new GopherHelper(request, response);
  const responseJson = gopherHelper.webhook.responseJson;

  describe("task data", function() {
    // Dependent tests
    it("gets task data", done => {
      const fq = gopherHelper.webhook.getTaskData("frequency_pref");
      expect(fq).to.equal("1.5");
      done();
    });

    it("sets task data", done => {
      gopherHelper.webhook.setTaskData({ frequency_pref: "5" });
      done();
    });

    it("gets default if key doesn't exist", done => {
      const data = gopherHelper.webhook.getTaskData("not_here", "foo");
      expect(data).to.equal("foo");
      done();
    });

    it("prioritizes newly set responseJson data", done => {
      const fq = gopherHelper.webhook.getTaskData("frequency_pref");
      expect(fq).to.equal("5");
      done();
    });

    it("gets the reference email", done => {
      const email = gopherHelper.webhook.getReferenceEmail();
      expect(email.from).to.equal("esweetland@gmail.com");
      done();
    });

    it("gets and sets reference email by merging", done => {
      gopherHelper.webhook.setReferenceEmail({ to: ["fdsa@fdsa.com"] });
      const newEmail = gopherHelper.webhook.getReferenceEmail();
      expect(newEmail.to).to.deep.equal(["fdsa@fdsa.com"]);
      expect(newEmail.from).to.equal("esweetland@gmail.com");
      done();
    });

    it("gets a reply_to address from reference email or source", done => {
      let email = gopherHelper.webhook.getReplyTo();
      expect(email).to.equal("esweetland@gmail.com");
      gopherHelper.webhook.set(
        "task.reference_email.reply_to",
        "fdas@fdsa.com"
      );
      email = gopherHelper.webhook.getReplyTo();
      expect(email).to.equal("fdas@fdsa.com");
      done();
    });

    it("sets the trigger time nautally", done => {
      gopherHelper.webhook.setTriggerTime("1day");
      expect(gopherHelper.responseJson.task.trigger_timeformat).to.eq("1day");
      done();
    });

    it("sets the trigger reminder time with a timestamp", done => {
      gopherHelper.webhook.setTriggerTimestamp(100000000);
      expect(gopherHelper.responseJson.task.trigger_time).to.equal(100000000);
      done();
    });

    it("marks a task as completed", done => {
      gopherHelper.webhook.completeTask();
      expect(gopherHelper.responseJson.task.completed).to.equal(1);
      done();
    });
  });

  describe("deeply gets and sets object data", function() {
    // Dependent tests
    it("deeply sets object data", done => {
      gopherHelper.webhook.setTaskData({
        foo: { bar: "baz" }
      });
      expect(responseJson.task.private_data).to.have.property("foo");
      done();
    });

    it("deeply gets a data key", done => {
      const data = gopherHelper.webhook.getTaskData("foo.bar");
      expect(data).to.equal("baz");
      done();
    });

    it("sets deep object data by merging", done => {
      gopherHelper.webhook.setTaskData({
        foo: { nine: "ten" }
      });
      expect(JSON.stringify(responseJson.task.private_data)).to.equal(
        '{"frequency_pref":"5","foo":{"bar":"baz","nine":"ten"}}'
      );
      done();
    });

    it.skip("throws an error if its overwriting a data key", done => {
      const data = gopherHelper.webhook.setTaskData("foo.bar");
      expect(data).to.equal("baz");
      done();
    });
  });

  describe("extension", function() {
    it("sets extension data", done => {
      gopherHelper.webhook.setExtensionData({
        crm: {
          key: "23432",
          name: "bob"
        }
      });
      expect(responseJson.extension.private_data.crm).to.deep.equal({
        key: "23432",
        name: "bob"
      });
      done();
    });

    it("gets extension data", done => {
      const data = gopherHelper.webhook.getExtensionData("crm.name");
      expect(data).to.equal("bob");
      done();
    });

    it("deeply sets extension data", done => {
      gopherHelper.webhook.setExtensionData({
        crm: {
          another: "key"
        }
      });
      expect(responseJson.extension.private_data.crm).to.deep.equal({
        key: "23432",
        name: "bob",
        another: "key"
      });
      done();
    });

    it("invites other people to use the extension", done => {
      gopherHelper.webhook.invite(["newuser@fdsa.com"]);
      expect(gopherHelper.responseJson.extension.invite).to.deep.equal([
        "newuser@fdsa.com"
      ]);
      done();
    });
  });

  describe("sending email", function() {
    it("adds outbound email to response", done => {
      gopherHelper.webhook.addEmail({
        to: "fdas@fdsa.com",
        subject: "testing",
        body: [
          {
            type: "title",
            text: "Testing from Gopher"
          }
        ]
      });
      expect(gopherHelper.responseJson).to.haveOwnProperty("send_messages");
      expect(gopherHelper.responseJson.send_messages[0].to).to.equal(
        "fdas@fdsa.com"
      );
      done();
    });

    it("returns a mutable reference to the new email", done => {
      const email = gopherHelper.webhook.addEmail({
        to: "fdas@fdsa.com",
        subject: "testing",
        body: [
          {
            type: "title",
            text: "Testing from Gopher"
          }
        ]
      });
      email.subject = "new subject";
      const lastEmailIndex = gopherHelper.responseJson.send_messages.length - 1;
      expect(
        gopherHelper.responseJson.send_messages[lastEmailIndex].subject
      ).to.equal("new subject");
      done();
    });
  });

  describe("helpers", function() {
    it("makes webhook req / res JSON available", done => {
      expect(gopherHelper.webhook.requestJson).to.be.an("object");
      expect(gopherHelper.webhook.responseJson).to.be.an("object");
      done();
    });

    it("sets the version of the response", done => {
      expect(gopherHelper.webhook.responseJson).to.haveOwnProperty("version");
      done();
    });

    it("exposes the get and set method for any value", done => {
      gopherHelper.webhook.set("task.unexpected_future_field", "foo");
      expect(gopherHelper.webhook.get("task.unexpected_future_field")).to.equal(
        "foo"
      );
      done();
    });

    // TODO: This fails when running action_received webhook
    it("exposes command as gopher.command", done => {
      expect(gopherHelper.command).to.equal("memorize");
      done();
    });

    it.skip("exposes action as gopher.action", done => {
      expect(gopherHelper.action).to.equal("frequency.0-2");
      done();
    });
  });
});
