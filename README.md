[MailBots](https://www.mailbots.com) is a platform for creating bots, AIs and assistants that get things done right from your inbox. Read more at [mailbots.com](https://www.mailbots.com).

# Quick Start

Go to mailbots.com and create a MailBot. The bot creation process sets up a working instance of this framework.

Next, let's tell our MailBot what to do when it receives an email:

```javascript
var MailBot = require("mailbots");
var mailbot = new MailBot(); // assuming .env is set

// When someone emails: say-hi@my-bot.eml.bot, respond "Hello Human!"
mailbot.onCommand("say-hi", function(bot) {
  bot.webhook.quickReply("Hello Human!");
  bot.webhook.respond();
});

mailbot.listen();
```

`say-hi@my-bot.eml.bot` is an example of an "email command". Whatever is before the @ sign is a command to your bot to accomplish some task. [Read more about email commands](https://docs.mailbots.com/reference#email-commands).

# Docs

Tip: Use our [reference guide](https://mailbots-app.mailbots.com) to quickly look up helpers and method names.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [How MailBots Work](#how-mailbots-work)
  - [Commands](#commands)
  - [Tasks](#tasks)
  - [Triggering](#triggering)
  - [Architecture](#architecture)
  - [Handlers](#handlers)
  - [Skills](#skills)
- [Examples:](#examples)
  - [Hello World](#hello-world)
  - [Set a Reminder](#set-a-reminder)
  - [Handle Action-Emails](#handle-action-emails)
  - [Install A Skill](#install-a-skill)
- [Handler Reference](#handler-reference)
  - [onCommand](#oncommand)
  - [onTrigger](#ontrigger)
  - [onAction](#onaction)
  - [onTaskViewed](#ontaskviewed)
  - [onEvent](#onevent)
  - [onSettingsViewed](#onsettingsviewed)
  - [beforeSettingsSaved](#beforesettingssaved)
  - [on](#on)
  - [Handling Errors](#handling-errors)
- [The "bot" Object](#the-bot-object)
- [Building Skills](#building-skills)
  - [Using Handlers](#using-handlers)
  - [The "one-bot function"](#the-one-bot-function)
  - [Handling Web Requests](#handling-web-requests)
  - [Middleware](#middleware)
  - [Namespacing Conventions](#namespacing-conventions)
- [Installing Skills From npm](#installing-skills%C2%A0from-npm)
  - [Skills With Side-Effects](#skills-with-side-effects)
- [Welcoming New Bot Users](#welcoming-new-bot-users)
- [Testing](#testing)
- [Installing](#installing)
- [Contributions](#contributions)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# How MailBots Work

A MailBot's purpose is to help someone get something done quickly, efficiently and without leaving their inbox.

## Tasks

A unit of work accomplished by a MailBot is called a "task". Tasks can scheduled, edited or "completed". Tasks are always associated with a command.

## Commands

MailBots always work in the context of commands while accomplishing tasks. A command can be thought of as the instruction for how to complete a particular task, or the purpose of the task. Email Commands (shown above) are one way to issue commands. Creating a task with the API also requires a command.

## Triggering

A task (that carries out a command) can be created then wait for the perfect moment to notify a user. Timliness is a core feature of of a MailBot.

## Architecture

When events happen in the MailBots platform (ex: an email is received), your MailBot receives webhooks. Your MailBot then gets some useful bit of work done (ex: enters data into a CRM) and responds with JSON that tells the MailBots platform what to do next (ex: send an email, store data, set a reminder, etc). JSON in, JSON out.

This library simplifies much of the above architecture, allowing you to simply create handler functions for certain events.

The webhook request and response can be viewed via the [MailBots Sandbox](https://app.mailbots.com/sandbox).

## Handlers

MailBots are composed of handlers – functions that run when certain events occur. For example: _When the bot receives an email at this address, execute these actions_

## Skills

Handlers and other bot functionality can be packaged into "skills" – high-level abilities that can shared between bots. Here are some example skills:

- Interact with a CRM
- Parse natural language
- Send a text message or Slack message
- Render special UI elements

You can publish, share and install new skills from npm.

# Examples:

## Hello World

Create an [email command](https://docs.mailbots.com/reference#email-commands) that says hi.

```javascript
var MailBotsApp = require("mailbots");
var app = new MailBotsApp();

mailbot.onCommand("hi", function(bot) {
  bot.webhook.quickReply("Hi back!");
  bot.webhook.respond();
});

mailbot.listen();
```

## Set a Reminder

The first handler creates the reminder. The second one handles the reminder when it becomes due.

```javascript
mailbot.onCommand("hi", function(bot) {
  // Schedule the task to trigger in 1 minute
  bot.webhook.setTriggerTime("1min");
  bot.webhook.respond();
});

// When a task with "hi" command triggers, run this
mailbot.onTrigger("hi", function(bot) {
  bot.webhook.quickReply("Hi 1 minute later!");
  bot.webhook.respond();
});
```

## Handle Action-Emails

MailBots can render quick-action buttons (mailto links that map to executable code) that let users get things done without leaving their inbox. Read more about [action emails](https://docs.mailbots.com/reference#email-based-actions).

```javascript

// This first handler renders an email with an action-email button
 mailbot.onCommand("send-buttons", function(bot) {
    bot.webhook.addEmail({
      to: bot.get('source.from')
      from: "MyBot",
      subject: bot.get('source.subject'),
      body: [

        // 👇 An email-action
        {
          type: "button",
          text: "Press Me",
          action: 'say.hi',
          subject: "Just hit 'send'",
        }
      ]
    });
    bot.webhook.respond();
  };

  // This handler handles the email action
  mailbot.onAction('say.hi', function(bot) {
    bot.webhook.quickReply('hi');
    // Lots of useful things can be done here. Completing a todo item, adding notes to a CRM, etc.
    bot.webhook.respond();
  });

  mailbot.listen();
```

## Install A Skill

Let's install a skill to that extracts the email message from previously quoted emails and signatures.

```javascript
var mailbotsTalon = require("mailbots-talon");
mailbot.onCommand("hi", function(bot) {
  const emailWithoutSignature = mailbotsTalon.getEmail(bot);
  bot.quickReply(
    "Here is the email without the signature:" + emailWithoutSignature
  );
  bot.webhook.respond();
});
```

# Handler Reference

Note: The first matching event handler ends the request, even if subsequent handlers also match, except where otherwise noted.

## onCommand

```
mailbot.onCommand(command, handlerFn)
```

Handle when an [email command](https://docs.mailbots.com/reference) is received. This also fires when a new task is created via the API (All tasks have a command to define their purpose or reason for existence.)

```javascript
mailbot.onCommand("todo", function(bot) {
  //handle when a task is created with this command string
});
```

Regular expressions work with all handlers.

```javascript
mailbot.onCommand(/todo.*/, function(bot) {
  //Handle todo.me@my-ext.eml.bot, todo.you@my-ext.eml.bot, todo.everyone@my-ext.eml.bot
});
```

## onTrigger

```
mailbot.onTrigger(command, handlerFn)
```

Timeliness is a MailBot superpower. A user can schedule a task, then days, months or years later your bot can follow up at the exact right moment – scheduled by the user, or by another event. Read more about [triggering](https://docs.mailbots.com/reference#perfect-timing).

Tasks with different commands may trigger differently. For example:

```javascript
mailbot.onTrigger("todo.me", function(bot) {
  // Assigned to myself, so only remind me
});
```

```javascript
mailbot.onTrigger("todo.assign", function(bot) {
  // Assigned to the person in the 'to' field, so remind them
});
```

```javascript
mailbot.onTrigger("todo.crm", function(bot) {
  // Query CRM API, populate email followup with contact data
});
```

## onAction

```
mailbot.onAction(action, handlerFn)
```

Handle when a user performs an action that relates to a task.

For example a user can send an [action-email](https://docs.mailbots.com/reference#email-based-actions) to accomplish an action without leaving their inbox (postponing a reminder, completing a todo item, logging a call, etc).

```javascript
mailbot.onAction("complete", function(bot) {
  // Complete the related todo
});
```

**MailBot Conversations**

Set the reply-to address of a MailBot email to an action email to carry out a conversation with the user.

```javascript
mailbot.onAction("assistant", function(bot) {
  // Use luis-ai middlweare to dtermine intent
  // Store conversation state
  // send-email whose reply-to is also "assistant"
});
```

## onTaskViewed

```
mailbot.onTaskViewed(command, handlerFn)
```

Handle when a task is viewed in the MailBots Web UI, allowing a user to view and interact with a future MailBots email.

```javascript
mailbot.onTaskViewed("todo.me", function(bot) {
  // Show a preview of the future email
});
```

Different task commands may render differently. For example a task with command `todo.crm` may query and render current CRM data within the preview.

## onEvent

```
mailbot.onEvent(event, handlerFn)
```

Handle when the MailBot receives an inbound webhok from a 3rd party system about an external event. For example, a support ticket is created or a lead is added to a CRM.

Note: This action does not automatically create a MailBots Task. One can be created with [mailbots-sdk](https://www.npmjs.com/package/@mailbots/mailbots-sdk)

```javascript
mailbot.onEvent("issue.created", async function(bot) {
  // Handle event, for example, create a MailBots Task.
  const mailBotsClient = new MailBotsClient.fromBot(bot);
  await mailBotsClient.createTask({
    // Pre-authenticated API client
  });
  bot.webhook.respond({ webhook: { status: "success" } });
});
```

## onSettingsViewed

```
mailbot.onSettingsViewed(handlerFn)
```

Handle when a user views this MailBot's settings.

Bots can build custom settings pages. These are rendered when a user views bot settings on the MailBots.com admin UI.

See the [settings page reference](https://mailbots-app.mailbots.com/#settingspage).

The handler's only parameter is a callback function that responds with JSON to to render a settings form. The callback function is passed the `bot` object as usual.

Settings form JSON can be easily built using the [settings helper functions](https://mailbots-app.mailbots.com/#settingspage).

Unlike the other handlers, every instance of this handler is called. (ie, all settings pages from all settings handlers are rendered).

NOTE: Do not call `bot.webhook.respond()` at the end of this particular request. MailBots' internals take care of compiling the JSON and responding.

```javascript
// Render a settings field for the user to enter their first name
mailbot.onSettingsViewed(async function(bot) {
  const todoSettings = bot.webhook.todoSettings({
    namespace: "todo",
    title: "Todo Settings", // Page title
    menuTitle: "Todo" // Name of menu item
  });
  todoSettings.input({ name: "first_name", title: "First name" });
  todoSettings.submitButton();

  // Populate form values
  todoSettings.populate(bot.get("extension.saved_data.todo"));
  // Note bot.webhook.respond() is NOT called
});
```

URL parameters are passed through to the settings webhook. Use this to pass data into your settings when linking to it.

```javascript
mailbot.onSettingsViewed(function(bot) {
  const settingsPage = bot.webhook.settingsPage({ namespace: "todo" });

  if (bot.get("url_params.linkInstructions", false)) {
    settings.text(`# Instructions to link your account!`);
  }
  // Note that there is no submit button. It's just an informational page.
});
```

If you wish to use URL params in your `beforeSettingsSaved` handler (below), pass them via the `urlParams` key in the `submit` form element.

```javascript
// within a onSettingsViewed form as shown above
settings.submitButton({
  submitText: "Save Notification Settings",
  urlParams: { saveSettings: 1 }
  // Tip: Pass through all URL current params, but use caution! (see note)
  // urlParams: {saveSettings: 1, ...bot.get("url_params", {})}
});
```

NOTE: URL parameters are an easy way to pass data into your bot settings, but **keep this in mind while using URL params**: Anyone can link a user to their settings page with _anything_ in URL. Do not, for example, create a url like: `/settings?delete_everything=true` that deletes all their tasks. An unsuspecting user may arrive on their settings page from an external link, not see this in the URL and submit the form only find themselves without any data. [Read more](<https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)>).

## beforeSettingsSaved

```
mailbot.beforeSettingsSaved(handlerFn)
```

Handle when the user saves their settings. Called before settings are actually saved.

Similar to the above `onSettingsViewed` handler, every instance of this handler is called when settings are saved.

Validate user data, perform API calls to keep other systems in sync. Return an error
to abort saving the settings.

```javascript
  mailbot.beforeSettingsSaved(bot =>

    // assuming the same "todo" namespace as shown in the above examples
    const data = bot.get("settings.todo");

    // handler is fired any times settings are saved, even if its not our form
    if(!data) return;

    // perform API calls, synchronize systems, etc.
    if(!isvalid(data)) {

    // abort the saving process
    bot.webhook.respond({
      webhook: {
        status: "error",
        message: "This is  a warning message"
      }
    });
    }

    // implicitly returns successfully
  });
```

## on

```
mailbot.on(webhookEvent, handlerFn)
```

This is a generic handler for any webhook. It can be used to handle any inbound webhook – mainly ones that are not covered by the handlers above. (Of note: The handlers above are simply wrappers for this lower-level handler).

Example:

```javascript
mailbot.on("extension.installed", function(bot) {
  // Handle when a MailBot is installed
  // Create task with MailBots SDK
  // bot.webhook.respond();
});
```

The first paramater can be:

- A string that matches the webhook `type`. (ie. [`extension.installed`](https://docs.mailbots.com/reference#extensioninstalled))
- A regular expression that matches on webhook `type`
- A function that takes the incoming webhook as the only parameter and returns a boolean value indicating whether or not that webhook should be handled by that function handler.

The second parameter is the function handler that runs only if the matching condition (the first parameter) is met.

```javascript
mailbot.on("extension.installed", function(bot) {
  // Handle when a MailBot is installed
  // Create a task from mailbots sdk
  // bot.webhook.respond();
});
```

## Handling Errors

Ideally, error conditions are handled within the normal application flow. If something unexpected happens you can set up a custom error handler for adding logs, alerting or providing error messaging to users.

If you want to send the user your own error email, use the [sendEmail](https://mailbots-sdk-js.mailbots.com/#sendemaill) method from the MailBots SDK. (Not all webhook responses send emails).

```javascript
// define a custom error handler
app.setErrorHandler(function(error, bot) {
  // myCustomLogger.log(error);
  // send email with mailbots sdk
  // send a custom error email to user
  // Respond with 5xx status code to send the generic MailBots error email to the user
  // bot.response.status(500);

  bot.webhook.respond({
    status: "error",
    message: "A custom error message" // Shown to user if in the web UI.
  }); // A webhook response must be sent
});
```

# The "bot" Object

The `bot` object passed to the handlers above contains useful helpers that make it easy to handle bot requests. See [webhook helpers reference docs](https://mailbots-app.mailbots.com/#webhookhelpers).

**Setting Data Works By Shallow Merging**
Data is set by shallow merging. For example.

```javascript
bot.webhook.setTaskData("my_namespace", { name: "Joe" });
bot.webhook.setTaskData("my_namespace", { key: "123" });
// task data is now
console.log(bot.webhook.responseJson);
// {my_namespace: { name: "Joe", key: "123" }}
```

```javascript
bot.webhook.setTaskData("my_namespace", {
  name: "Joe",
  data: { value: "here" } // ⚠️ Overwritten (shallow merge)
});
bot.webhook.setTaskData("my_namespace", {
  data: { value2: "there" }
});
// task data is now
console.log(bot.webhook.responseJson);
// {my_namespace: { data: { value2: "there" } }}
```

# Building Skills

"Skills" are sharable pieces of bot functionality. Skills can encapsulate everything they need (handlers, settings panels helper funcitons and UI elements) into a package that "just works" when installed. They are great for keeping your code organized and for sharing functionality with others.

A skill can share functionality in several ways:

## Using Handlers

We could better organize our handlers in the above examples by grouping them into different files. For example:

```javascript
// my-new-reminder-skill.js
module.exports = function(mailbot) {
  // Handlers can go here
  // mailbot.onCommand...
};
```

It can be loaded like this:

```javascript
// In top-level app.js
require("./my-new-skill")(mailbot);
```

Once loaded, all handlers within the file become active.

A directory of skill files (like the one above) can be loaded using the `loadSkill` helper:

```javascript
// Load all skill files in a directory
mailbot.loadSkill(__dirname + "/my/skill/");
```

`loadSkill` only looks for skill files in the top-level directory. This allows a skill to hide its implementation details in subdirectories.

A config object can optionally be passed.

```javascript
// app.js
mailbot.loadSkill(__dirname + "/my/skills/", config);
```

```javascript
// skill-file.js
module.exports = function(mailbot, config) {
  // All of your handlers can go here
};
```

Grouping your handlers into skills is a great way to keep your project organized. The down-side is that the skill owns each request from beginning to end – not very flexible.

The next section covers a more granular and composable technique for sharing functionality across multiple handlers or multiple MailBots.

## The "one-bot function"

A "one-bot function" is a function that takes a single `bot` object (an instance of BotRequest) which, itself, contains the request / response state and utilities to alter the request. It is one instance of a bot request, hence, a one-bot function.

One-bot functions are called within handlers, allowing for a top-level handler to compose multiple one-bot functions to get something done.

```javascript
// sayHi.js
// A simple "one-bot function"
function sayHi(bot) {
  bot.webhook.quickReply("hi");
}
module.exports = sayHi;
```

```javascript
// in main app.js
const sayHi = require("./sayHi.js");
//...
mailbots.onCommand("hi", function(bot) {
  sayHi(bot);
  bot.webhook.respond();
});
```

You can, of course, use both the one-bot function and a handler within one skill:

```javascript
// my-reminder-skill.js
module.exports = function(mailbot) {
  // Handles all triggering for this MailBot (/.*/ matches anything)
  mailbot.onTrigger(/.*/, funciton(bot) {
    // Do some useful things, send emails,etc.
    bot.webhook.respond();
  });

  return {
    remindTomorrow: function(bot) {
        bot.webhook.setTriggerTime("tomorrow");
    }
  };
};
```

```javascript
// Use the reminder skill
const { remindTomorrow } = require("./my-reminder-skill")(mailbot);

mailbot.onCommand("whatever-custom-command", function(bot) {
  // Set a reminder. When due, the skill automatically handles it.
  remindTomorrow(bot);
  bot.webhook.respond();
});
```

### Sharing UI Elements

Skills can use one-bot functions to share [UI elements](https://docs.mailbots.com/docs/email-ui-reference).

By convention, UI functions that output UI start with `render`. For example, `renderMemorizationControls`.

```javascript
  var memorizeSkill = require("gopher-memorize")(mailbot);
  mailbot.onCommand("remember", function(bot) {
    bot.webhook.addEmail({
      to: "you@email.com"
      from: "MailBots",
      subject: "Email Subject"
      body: [
        {
          type: 'title',
          text: 'A Title'
        },

        // Render JSON UI
        memorizeSkill.renderMemorizationControls(bot)
      ]
    })
    bot.webhook.respond();
  }
```

## Handling Web Requests

The `mailbots` framework relies on Express.js for many of its internals. Your skill can access the internal Express `app` object at `mailbot.app`, allowing your skill to do anything that can be done with Express: authenticate other services, interact with APIs, respond to webhooks and render web pages.

Just like in [handling routes in Express](https://expressjs.com/en/guide/routing.html):

```javascript
mailbot.app.get("/hi", function(req, res) {
  res.send("<h1>Hi http request!</h1>");
});
```

## Middleware

[Middlware](https://expressjs.com/en/guide/writing-middleware.html) can be exported and "used" by other skills. This is useful for implementing common functionality across multiple handlers.

```javascript
// Export middleware to log everything
function logEverythingMiddleware(req, res, next) {
  const bot = res.locals.bot; // bot lives here
  const emailSubject = bot.get("source.subject");
  require("my-great-logger").log(`Got an email about ${emailSubject}`);
  next(); // <-- Don't forget this!
}
module.exports = logEverythingMiddleware;
};
```

```javascript
// Using our middleware
const logEverythingMiddleware = require("./log-everything");

// Apply to all subsequent handlers
// Note: It does not apply to earlier handlers
mailbot.app.use(logEverythingMiddleware);

mailbot.onCommand("command-one", function(bot) {
  // everything is logged
});
mailbot.onCommand("command-two", function(bot) {
  // everything is logged
});
mailbot.onCommand("command-three", function(bot) {
  // everything is logged
});
```

## Namespacing Conventions

To prevent conflicts and facilitate debugging, it is helpful to follow these conventions. For examples below, our skill is `skill-name`.

- The module name
  ```
  # Example module name
  npm install mailbots-skill-name
  ```
- Store data against the task or bot in a subject with key of the skill name using underscores instead of dashes.
  ```json
  (task.stored_data = { "skill_name": { "key": "val" } })
  ```
- Preface event names and actions with the skill name or an abbreviation (accounting for [character limitations](http://www.rfc-editor.org/errata/eid1690))
  ```javascript
  mailbots.onAction("sn.do-action", bot => {});
  ```

# Installing Skills From npm

Skills can be installed from npm.

Here we will use `gopher-memorize`, a skill that creates reminders for any [task](https://docs.mailbots.com/reference) using [spaced repetition](https://www.wikiwand.com/en/Spaced_repetition), a memorization technique that increases the time between reminders as more reminders are sent.

In your cli, run:

`npm install --save gopher-memorize`

In our app.js file we will create a handler that uses our newly installed skill.

```javascript
// In main app.js file
var memorizeSkill = require("gopher-memorize")(mailbot);

mailbot.onCommand("remember", function(bot) {
  memorizeSkill.memorizeTask(bot); //  ⬅ Tell bot to memorize your task
  bot.webhook.quickResponse("Memorizing!");
  bot.webhook.respond();
});

// Called each time the reminder is triggered
mailbot.onTrigger("remember", function(bot) {
  memorizeSkill.memorizeTask(bot); // ⬅ Invoke skill to continue memorizing
  bot.webhook.quickResponse("An email with decreasing frequency");
  bot.webhook.respond();
});
```

## Skills With Side-Effects

Skills that accept the `mailbots` object may automatically alter requests, reply to webhooks or take other automatic action behind the scenes.

```javascript
// May automatically handle requets (ex, render settings pages, send emails)
var handleEverything = require("mailbots-handle-everything");
handleEverything(mailbot);
// or
require("handleEverything")(mailbot);
```

Skills that are not passed the `mailbot` object will export components (middleware, one-bot functions, etc) for you to explicitly use in your handlers.

```javascript
// These types of skills offer components to your handlers
var {
  someMiddleware,
  renderSomething
} = require("mailbots-provide-components");

mailbots.app.use(someMiddleware);

mailbots.onCommand("foo", function(bot) {
  doSomething(bot);
});
```

Skills will, themselves, document how they are used. Different approaches are right for different circumstances.

# Welcoming New Bot Users

When a new user installs your MailBot, they are directed to a settings page with the `welcome` namespace. Render a custom welcome message for your user by creating a settings page that targets this namespace.

```javascript
gopherApp.onSettingsViewed(function(bot)  {
    const welcomeSettings = bot.webhook.settingsPage({
      namespace: "welcome", // MailBots sends new users to this namespace automatically
      menuTitle: "Welcome"
    });

    welcomeSettings.text(`
# Welcome To My MailBot
_Markdown_ works here.`);
)}

```

Note: While in dev_mode, the MailBot owner is instead redirected to the sandbox.

Your bot receives the `extension.installed` webhook which can be used to schedule a series of welcome emails to the user.

# Testing

Export a testable instance of your MailBot by calling `mailbot.exportApp()` instead of calling `mailbot.listen()`. Below is an example of testing the exported app with [Supertest](https://www.npmjs.com/package/supertest).

For a sample request (the `./_fixtures/task.created.json` file below), fire a request and go to the sandbox. Click the "copy" icon that appears when you over over the the top-level key the request JSON.

Note: Set `NODE_ENV` to `testing` to disable webhook validation.

```javascript
const request = require("supertest");
const mocha = require("mocha");
const expect = require("chai").expect;
const MailBotsApp = require("mailbots");
let mailbot; // re-instantiated before each test

// Utility function to send webhook to our app
function sendWebhook({ exportedApp, webhookJson }) {
  return request(exportedApp)
    .post("/webhooks")
    .set("Accept", "application/json")
    .send(webhookJson);
}

describe("integration tests", function() {
  beforeEach(function() {
    mailbot = new MailBotsApp({ clientId: "foo", clientSecret: "bar" });
  });

  it("responds correctly to a webhook", async function() {
    const mailbot = new MailBotsApp({ clientId: "foo", clientSecret: "bar" });

    // set up handlers
    mailbot.onCommand("memorize", bot => {
      bot.webhook.quickReply("I dig email");
      bot.webhook.respond();
    });

    const exportedApp = mailbot.exportApp();
    const webhookJson = require("./_fixtures/task.created.json"); // Copy request from Sandbox
    let { body } = await sendWebhook({ exportedApp, webhookJson });

    // Test our webhook response
    expect(body.send_messages[0].subject).to.equal("I dig email");
  });
});
```

# Installing

The setup process on mailbots.com creates a pre-installed instance of your MailBot using [Glitch](https://glitch.com/).

For local development or production deployments:

**1. Install**

- `mkdir my-bot`
- `npm install mailbots`
- `touch app.js`

**2. Add Setup Code**

```javascript
var MailBot = require("mailbots");
var mailbot = new MailBot({
  clientId: "your_client_id",
  clientSecret: "your_secret",
  botUrl: "http://your_bot_url"
});
// You can also set CLIENT_ID, CLIENT_SECRET and BOT_URL environment vars
// as an alternative to explicitly passing them in.

mailbot.onCommand("hello", bot => {
  bot.webhook.quickReply("world");
  bot.webhook.respond();
});

mailbot.listen();
```

3. Use [ngrok](https://ngrok.com/) to set up a public-facing url that MailBots.com can reach.

4. Create a MailBot at mailbots.com. Click "Manual Setup" at the bottom and follow instructions from there.

# Contributions

Contributions are welcome in the form of PRs and / or Github tickets for issues, bugs, ideas and feature requests.
