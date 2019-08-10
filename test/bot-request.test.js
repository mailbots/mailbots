const { expect } = require("chai");
const BotRequest = require("../dist/lib/bot-request").default;
const _ = require("lodash");

let botRequest;
let responseJson;
let request = {};

describe("Bot Request Helper", function() {
  beforeEach(function() {
    delete require
      .cache[require("path").join(__dirname, "./fixtures/task-created-webhook.json")];
    const webhookJson = require("./fixtures/task-created-webhook.json");
    // TODO: Improve testing different types of webhooks
    // const webhookJson = require("./fixtures/task-triggered-webhook.json");
    // const webhookJson = require("./fixtures/task-action-received-webhook.json");
    // const webhookJson = require("./fixtures/task-updated-webhook.json");
    // const webhookJson = require("./fixtures/mailbot-triggered-webhook.json"); //expected failures for undefined
    // const webhookJson = require("./fixtures/mailbot-settings-viewed-webhook.json");
    // const webhookJson = require("./fixtures/mailbot-settings-pre-saved-webhook.json");

    request.body = webhookJson;
    response = {};
    response.locals = {};
    botRequest = new BotRequest(request, response);
    responseJson = botRequest.webhook.responseJson;
    // const ref = botRequest.webhook.getReferenceEmail();
  });

  describe("settings helpers", function() {
    it("creates an empty, namespaced settings form", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize",
        title: "Memorize Settings"
      });
      const settings = botRequest.webhook.responseJson.settings;
      expect(settings.memorize).to.haveOwnProperty("JSONSchema");
      expect(settings.memorize).to.haveOwnProperty("uiSchema");
      expect(settings.memorize.JSONSchema.title).to.equal("Memorize Settings");
      done();
    });

    it("adds a form input", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize",
        title: "Memorize Settings"
      });
      newForm.input({ name: "first_name", title: "First name" });
      const settings = botRequest.webhook.responseJson.settings;
      expect(settings.memorize.JSONSchema.properties).to.haveOwnProperty(
        "first_name"
      );
      expect(settings.memorize.JSONSchema.properties.first_name).to.deep.equal({
        type: "string",
        title: "First name",
        description: undefined
      });
      done();
    });

    it("adds a form input with a default value", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize",
        title: "Memorize Settings"
      });
      newForm.input({
        name: "first_name",
        title: "First name",
        defaultValue: "Joe"
      });
      const settings = botRequest.webhook.responseJson.settings;
      expect(settings.memorize.formData.first_name).to.equal("Joe");
      done();
    });

    it("overwrites default input value when populating", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize",
        title: "Memorize Settings"
      });
      newForm.input({
        name: "first_name",
        title: "First name",
        defaultValue: "Joe"
      });
      newForm.populate({ first_name: "Bob" });
      const settings = botRequest.webhook.responseJson.settings;
      expect(settings.memorize.formData.first_name).to.equal("Bob");
      done();
    });

    it("adds a textarea input", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize",
        title: "Memorize Settings"
      });
      newForm.textarea({ name: "essay", title: "essay" });
      const settings = botRequest.webhook.responseJson.settings;
      expect(settings.memorize.JSONSchema.properties).to.haveOwnProperty(
        "essay"
      );
      done();
    });

    it("adds an alert dialog", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize",
        title: "Memorize Settings"
      });
      newForm.alert({ name: "dialog", title: "An Alert Dialog" });
      const settings = botRequest.webhook.responseJson.settings;
      const fields =
        botRequest.webhook.responseJson.settings.memorize.JSONSchema.properties;
      const hasAlert = Object.keys(fields).some(key => key.includes("_alert_"));
      expect(hasAlert).to.be.true;
      done();
    });

    it("adds a markdown text block", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize",
        title: "Memorize Settings"
      });
      newForm.text(`--------------
  ## ️⚠️ Connect Github
  This is a text block here. Leading spaces can break this.
  And this is a new line. Here is a new line

  [Connect Github](http://www.google.com)

  ------------------
  `);

      const fields =
        botRequest.webhook.responseJson.settings.memorize.JSONSchema.properties;
      const hasMarkdown = Object.keys(fields).some(key => key.includes("_md_"));
      expect(hasMarkdown).to.be.true;
      done();
    });

    it("Adds a checkbox", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize"
      });
      newForm.checkbox({ name: "notifications", title: "Notifications" });
      const settings = botRequest.webhook.responseJson.settings;
      expect(settings.memorize.JSONSchema.properties).to.haveOwnProperty(
        "notifications"
      );
      done();
    });

    it("inserts custom schemas in the right locations", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize"
      });
      newForm.insert({
        name: "my_selection",
        JSONSchema: {
          title: "Something direct",
          type: "string",
          enum: ["foo", "bar", "show", "far"]
        },
        uiSchema: {
          "ui:placeholder": "Choose one"
        }
      });
      const settings = botRequest.webhook.responseJson.settings;
      expect(settings.memorize.JSONSchema.properties).to.haveOwnProperty(
        "my_selection"
      );
      expect(settings.memorize.uiSchema).to.haveOwnProperty("my_selection");
      expect(settings.memorize.uiSchema.my_selection).to.deep.equal({
        "ui:placeholder": "Choose one"
      });
      done();
    });

    it("Adds a select dropdown box", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize"
      });
      newForm.select({
        name: "select_something",
        options: ["Red", "Blue", "Green"],
        placeholder: "Select something",
        title: "What's your favorite color?",
        description: "This tells a lot about a person",
        helpText: "(Hint: Blue is the best)"
      });
      const settings = botRequest.webhook.responseJson.settings;
      expect(settings.memorize.JSONSchema.properties).to.haveOwnProperty(
        "select_something"
      );
      expect(settings.memorize.uiSchema).to.haveOwnProperty("select_something");
      expect(settings.memorize.uiSchema.select_something).to.deep.equal({
        "ui:help": "(Hint: Blue is the best)",
        "ui:placeholder": "Select something",
        "ui:emptyValue": ""
      });
      done();
    });

    it("builds an array of separate JSON Schema forms", function(done) {
      const firstForm = botRequest.webhook.settingsPage({
        namespace: "github",
        title: "Github Settings"
      });
      firstForm.input({
        name: "first_name",
        title: "First Name"
      });
      firstForm.populate({ first_name: "Bob" });

      const secondForm = botRequest.webhook.settingsPage({
        namespace: "memorize",
        title: "Github Settings"
      });
      secondForm.input({
        name: "first_name",
        title: "First Name"
      });
      secondForm.populate({ first_name: "Joe" });
      const settings = botRequest.responseJson.settings;
      expect(settings).to.haveOwnProperty("github");
      expect(settings).to.haveOwnProperty("memorize");
      expect(settings.github.formData.first_name).to.equal("Bob");
      done();
    });

    it("gets new and old settings from pre-save webhook");
    it("sets newly set data from mailbot.settings_pre_saved hook");

    it("adds a custom submit button with url params", function(done) {
      const newForm = botRequest.webhook.settingsPage({
        namespace: "memorize",
        title: "Memorize Settings"
      });
      newForm.submitButton({
        submitText: "Submit Me",
        urlParams: { foo: "bar" }
      });
      const settings = botRequest.responseJson.settings;
      expect(settings.memorize.formMeta).to.haveOwnProperty("submitText");
      expect(settings.memorize.formMeta).to.haveOwnProperty("urlParams");
      done();
    });
  });

  describe("task data", function() {
    // Dependent tests - TODO: Separate tests
    it("gets task data", done => {
      _.set(
        botRequest.webhook,
        "requestJson.task.stored_data.frequency_pref",
        "1.5"
      );
      const fq = botRequest.webhook.getTaskData("frequency_pref");
      expect(fq).to.equal("1.5");
      done();
    });

    it("sets task data with an object", done => {
      botRequest.webhook.setTaskData({ frequency_pref: "5" });
      done();
    });

    it("sets task data using object path and string", done => {
      botRequest.webhook.setTaskData("frequency_pref", "8");
      expect(
        botRequest.webhook.responseJson.task.stored_data.frequency_pref
      ).to.equal("8");
      done();
    });

    it("gets default if key doesn't exist", done => {
      const data = botRequest.webhook.getTaskData("not_here", "foo");
      expect(data).to.equal("foo");
      done();
    });

    it("prioritizes newly set responseJson data", done => {
      botRequest.webhook.setTaskData("frequency_pref", "8");
      const fq = botRequest.webhook.getTaskData("frequency_pref");
      expect(fq).to.equal("8");
      done();
    });

    it("gets the reference email", done => {
      const email = botRequest.webhook.getReferenceEmail();
      expect(email.from).to.equal("esweetland@gmail.com");
      done();
    });

    it("gets and sets reference email by merging", done => {
      botRequest.webhook.setReferenceEmail({ to: ["fdsa@fdsa.com"] });
      const newEmail = botRequest.webhook.getReferenceEmail();
      expect(newEmail.to).to.deep.equal(["fdsa@fdsa.com"]);
      expect(newEmail.from).to.equal("esweetland@gmail.com");
      done();
    });

    it("gets a reply_to address from reference email or source", done => {
      let email = botRequest.webhook.getReplyTo();
      expect(email).to.equal("esweetland@gmail.com");
      botRequest.webhook.set("task.reference_email.reply_to", "fdas@fdsa.com");
      email = botRequest.webhook.getReplyTo();
      expect(email).to.equal("fdas@fdsa.com");
      done();
    });

    it("determines the to / cc / bcc email methods", done => {
      // email command is memorize@mailbots-memorize.eml.bot
      // webhook uses "to"
      let emailMethod;
      emailMethod = botRequest.webhook.getEmailMethod();
      expect(emailMethod).to.equal("to");

      // cc
      botRequest.webhook.set(
        "task.reference_email.cc",
        "memorize@mailbots-memorize.eml.bot"
      );
      botRequest.webhook.set("task.reference_email.to", "foo@email.com");
      emailMethod = botRequest.webhook.getEmailMethod();
      expect(emailMethod).to.equal("cc");

      // bcc (nowhere in the message envelope in an email env)
      // botRequest.webhook.set("task.reference_email.bc", "memorize@mailbots-memorize.eml.bot");
      botRequest.webhook.set("task.reference_email.cc", "bar@gmail.com");
      botRequest.webhook.set("task.reference_email.to", "foo@email.com");
      emailMethod = botRequest.webhook.getEmailMethod();
      expect(emailMethod).to.equal("bcc");
      // email = botRequest.webhook.getReplyTo();
      // expect(email).to.equal("fdas@fdsa.com");
      done();
    });

    it("sets the trigger time nautally", done => {
      botRequest.webhook.setTriggerTime("1day");
      expect(botRequest.responseJson.task.trigger_timeformat).to.eq("1day");
      done();
    });

    it("sets the trigger reminder time with a timestamp", done => {
      botRequest.webhook.setTriggerTimestamp(100000000);
      expect(botRequest.responseJson.task.trigger_time).to.equal(100000000);
      done();
    });

    it("marks a task as completed", done => {
      botRequest.webhook.completeTask();
      expect(botRequest.responseJson.task.completed).to.equal(1);
      done();
    });

    it("lets data accumulate with requestJson values and added data", done => {
      _.set(botRequest.webhook, "requestJson.task.stored_data", null);
      _.set(botRequest.webhook, "responseJson.task.stored_data", null);
      // data can be set on the
      _.set(botRequest.webhook, "requestJson.task.stored_data", {
        foo: "bar",
        second: { inside: "value" }, // this will be overridden
        third: { another: "value" }
      });
      botRequest.webhook.setTaskData({ first: "value" });
      botRequest.webhook.setTaskData({ second: "value" });
      expect(botRequest.webhook.responseJson.task.stored_data).to.deep.eq({
        first: "value",
        foo: "bar",
        second: "value", // since we shallowly merge, this gets overwritten
        third: {
          another: "value" // left untouched from request object since it was never reset
        }
      });
      done();
    });
  });

  describe("deeply gets and sets object data", function() {
    it("getting task data shallowly merges requestJson and response JSON", done => {
      _.set(botRequest, "webhook.requestJson.task.stored_data", {
        foo: "bar"
      });
      _.set(botRequest, "webhook.responseJson.task.stored_data", {
        shoe: "far"
      });
      const taskData = botRequest.webhook.getTaskData();
      expect(taskData).to.deep.eq({
        foo: "bar",
        shoe: "far"
      });
      done();
    });

    it("getting data unmergable data returns responseJson over requestJson", done => {
      _.set(botRequest, "webhook.requestJson.task.trigger_time", 1539680468);
      _.set(botRequest, "webhook.responseJson.task.trigger_time", 153968000);
      expect(botRequest.get("task.trigger_time")).to.deep.eq(153968000);
      done();
    });

    // Common scenario
    it("returns a shallowly merged task object when partially set", done => {
      botRequest.webhook.responseJson.task = {
        trigger_time: 153968000
      };
      botRequest.webhook.requestJson.task = {
        created: 1539642091,
        id: 3541,
        trigger_time: 153961111,
        trigger_timeformat: "",
        command: "memorize@memorize.eml.bot",
        stored_data: null
      };
      expect(botRequest.get("task")).to.deep.eq({
        created: 1539642091,
        id: 3541,
        trigger_time: 153968000, // <-- updated trigger time
        trigger_timeformat: "",
        command: "memorize@memorize.eml.bot",
        stored_data: null
      });
      done();
    });

    it("merges task data when passed an object", done => {
      botRequest.webhook.setTaskData({ new: "value" });
      expect(botRequest.responseJson.task.stored_data).to.deep.eq({
        frequency_pref: "1.5",
        new: "value"
      });
      done();
    });

    it("only shallow-merges task data when passed only an object", done => {
      botRequest.webhook.setTaskData({ new: { inside: "key" } });
      botRequest.webhook.setTaskData({ new: "value" });
      expect(JSON.stringify(responseJson.task.stored_data)).to.eq(
        '{"frequency_pref":"1.5","new":"value"}'
      );
      done();
    });

    it("deeply, non-destructively sets properties when passed a JSON path string", done => {
      botRequest.webhook.setTaskData({ pref: 1, new: { inside: "key" } });
      botRequest.webhook.setTaskData("new.inside", "updated_key");
      expect(responseJson.task.stored_data).to.deep.eq({
        frequency_pref: "1.5",
        pref: 1,
        new: { inside: "updated_key" }
      });
      done();
    });

    it("shallow merges a 'deep object' using a json path string", done => {
      botRequest.webhook.setTaskData({
        new: { inside: "key", nested_obj: { key: "v" } }
      });
      botRequest.webhook.setTaskData("new", { anohter_inside: "overridden" });
      expect(JSON.stringify(responseJson.task.stored_data)).to.eq(
        `{"frequency_pref":"1.5","new":{"inside":"key","nested_obj":{"key":"v"},"anohter_inside":"overridden"}}`
      );
      done();
    });

    it("array data ovewrites and does not merge", done => {
      botRequest.webhook.setTaskData("frequency_pref", "8");
      botRequest.webhook.setTaskData(["a", "b"]);
      expect(responseJson.task.stored_data).to.deep.eq(["a", "b"]);
      botRequest.webhook.setTaskData({ foo: { bar: { something: "here" } } });
      // Note: If lodash _.set tries to set a object path on an array, it turns the array into an object.
      botRequest.webhook.setTaskData("foo.bar", ["no", "more"]);
      expect(responseJson.task.stored_data.foo.bar).to.deep.eq(["no", "more"]);
      done();
    });

    it("deeply gets a data key", done => {
      botRequest.webhook.setTaskData({
        foo: { bar: "baz" }
      });
      const data = botRequest.webhook.getTaskData("foo.bar");
      expect(data).to.equal("baz");
      done();
    });
  });

  describe("mailbot", function() {
    it("sets mailbot data", done => {
      botRequest.webhook.setMailBotData({
        crm: {
          key: "23432",
          name: "bob"
        }
      });
      expect(responseJson.mailbot.stored_data.crm).to.deep.equal({
        key: "23432",
        name: "bob"
      });
      done();
    });

    it("gets mailbot data", done => {
      _.set(botRequest, "webhook.responseJson.mailbot.stored_data", {
        crm: {
          key: "23432",
          name: "bob"
        }
      });
      const data = botRequest.webhook.getMailBotData("crm.name");
      expect(data).to.equal("bob");
      done();
    });

    it("shallow merges mailbot data", done => {
      botRequest.webhook.setMailBotData({
        crm: {
          another: "key"
        }
      });
      expect(responseJson.mailbot.stored_data.crm).to.deep.equal({
        another: "key"
      });
      done();
    });

    it("sets mailbot data using json path string", done => {
      botRequest.webhook.setMailBotData("crm", {
        another: "key",
        key: "9876",
        name: "joe"
      });
      expect(responseJson.mailbot.stored_data.crm).to.deep.equal({
        another: "key",
        key: "9876",
        name: "joe"
      });
      done();
    });

    it("invites other people to use the mailbot", done => {
      botRequest.webhook.invite(["newuser@fdsa.com"]);
      expect(botRequest.responseJson.mailbot.invite).to.deep.equal([
        "newuser@fdsa.com"
      ]);
      done();
    });
  });

  describe("sending email", function() {
    it("adds outbound email to response", done => {
      botRequest.webhook.sendEmail({
        to: "fdas@fdsa.com",
        subject: "testing",
        body: [
          {
            type: "title",
            text: "Testing from MailBots"
          }
        ]
      });
      expect(botRequest.responseJson).to.haveOwnProperty("send_messages");
      expect(botRequest.responseJson.send_messages[0].to).to.equal(
        "fdas@fdsa.com"
      );
      done();
    });

    it("adds multiple emails to a response", done => {
      botRequest.webhook.quickReply("first reply");
      botRequest.webhook.quickReply("another reply");
      expect(botRequest.responseJson).to.haveOwnProperty("send_messages");
      expect(botRequest.responseJson.send_messages[1].body[0].text).to.equal(
        "another reply"
      );
      expect(botRequest.responseJson.send_messages[1].subject).to.equal(
        "another reply"
      );
      done();
    });

    it("uses quickReply with complete body elements", done => {
      botRequest.webhook.quickReply({
        subject: "Quick reply subject",
        body: [
          {
            type: "title",
            text: "Welcome"
          },
          {
            type: "button",
            behavior: "url",
            text: "Press Me",
            url: "google.com"
          }
        ]
      });
      expect(botRequest.responseJson).to.haveOwnProperty("send_messages");
      expect(botRequest.responseJson.send_messages[0].body[0].text).to.equal(
        "Welcome"
      );
      expect(botRequest.responseJson.send_messages[0].body[1].type).to.equal(
        "button"
      );
      expect(botRequest.responseJson.send_messages[0].subject).to.equal(
        "Quick reply subject"
      );
      done();
    });

    it("returns a mutable reference to the new email", done => {
      const email = botRequest.webhook.sendEmail({
        to: "fdas@fdsa.com",
        subject: "testing",
        body: [
          {
            type: "title",
            text: "Testing from MailBots"
          }
        ]
      });
      email.subject = "new subject";
      const lastEmailIndex = botRequest.responseJson.send_messages.length - 1;
      expect(
        botRequest.responseJson.send_messages[lastEmailIndex].subject
      ).to.equal("new subject");
      done();
    });
  });

  describe("helpers", function() {
    it("makes webhook req / res JSON available", done => {
      expect(botRequest.webhook.requestJson).to.be.an("object");
      expect(botRequest.webhook.responseJson).to.be.an("object");
      done();
    });

    it("sets the version of the response", done => {
      expect(botRequest.webhook.responseJson).to.haveOwnProperty("version");
      done();
    });

    it("exposes the get and set method for any value", done => {
      botRequest.webhook.set("task.unexpected_future_field", "foo");
      expect(botRequest.webhook.get("task.unexpected_future_field")).to.equal(
        "foo"
      );
      done();
    });

    // TODO: This fails when running action_received webhook
    it("exposes command as bot.command", done => {
      expect(botRequest.command).to.equal("memorize");
      done();
    });

    it("exposes event as bot.webhook.event", done => {
      expect(botRequest.event).to.equal("task.created");
      done();
    });

    it.skip("exposes action as bot.action", done => {
      expect(botRequest.action).to.equal("frequency.0-2");
      done();
    });

    it("provides a method for working with user friendly dates", done => {
      let date = new Date();
      date.setMinutes(date.getMinutes() + 60 * 4); // 4 hours in the future
      let parsed = botRequest.getFriendlyDates({
        unixTime: date.getTime() / 1000,
        userTimezone: "America/Los_Angeles"
      });

      expect(parsed.daysInFuture).to.be.equal(0);
      expect(parsed.hoursInFuture).to.be.equal(4);
      expect(parsed.howFarInFuture).to.be.equal("4 hours");

      date.setHours(date.getHours() + 24 * 6); // 6 days in the future
      parsed = botRequest.getFriendlyDates({
        unixTime: date.getTime() / 1000,
        userTimezone: "America/Los_Angeles"
      });

      expect(parsed.daysInFuture).to.be.equal(6);
      expect(parsed.howFarInFuture).to.be.equal("6 days");

      done();
    });
  });
});
