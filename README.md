**Note** MailBots version 4+ is tightly coupled with FollowUpThen to reflect our (and our user's!) priorities.
FollowUpThen lifecycle hooks (ex: `mailbot.onFutTriggerUser`) allow a developer to add value to FollowUpThen (the original, proto-MailBot) by modifying behavior or injecting UI elements at different points in the followup lifecycle.

MailBots still exists a platform to extend FollowUpThen. We may re-release it as an independent system in the future.
If you'd like to see that happen, or have any feedback in general, feel free to email help@humans.fut.io.

[MailBots](https://www.mailbots.com) is a platform for creating bots, AIs and assistants that get things done right from your inbox. Read more at [mailbots.com](https://www.mailbots.com).

# Quick Start (FollowUpThen Skills)

After you receive your FUT Skills Developer invitation simply:
1. `npm install --save mailbots@latest`
2. `touch app.js` copy/pate below example
4. Use [ngrok](https://ngrok.com/) to get a publicly accessible URL for your skill
5. Register your skill (instructions in your invitation)
6. Install and test your skill (instructions in your invitation)

```javascript
var MailBots = require("mailbots").default;
var mailbot = new MailBots();

// This skill schedules motivational high-fives 🤚
// Invoke it by appending your flag to the date format. Ex: 8am-hi5@fut.io

// Add to the FUT confirmation email
mailbot.onFutCreateUser((bot) => {
  bot.webhook.addFutUiBlocks([{
    type: "title",
    text: "High hive scheduled!"
  }])
  bot.webhook.respond();
});

// Add a high-five to the followup email
mailbot.onFutTriggerUser((bot) => {
  bot.webhook.addFutUiBlocks([{
    type: "title",
    text: "High five, right on time! 🤚"
  }])
  bot.webhook.respond();
});

// Start listening
mailbot.listen();
```

# Quick Start (MailBots)
Go to mailbots.com and create a MailBot. The bot creation process sets up a working instance of this framework.

Next, let's tell our MailBot what to do when it receives an email:

```javascript
var MailBots = require("mailbots");
var mailbot = new MailBots.default(); // assuming .env is set

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
  - [Tasks](#tasks)
  - [Commands](#commands)
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
  - [onSettingsSubmit](#onsettingssubmit)
  - [on](#on)
  - [Handling Errors](#handling-errors)
- [FollowUpThen Lifecycle Hook Handlers](#followupthen-lifecycle-hook-handlers)
  - [onFutCreateUser](#onfutcreateuser)
  - [onFutCreateNonUser](#onfutcreatenonuser)
  - [onFutPreviewUser](#onfutpreviewuser)
  - [onFutPreviewNonUser](#onfutpreviewnonuser)
  - [onFutViewUser](#onfutviewuser)
  - [onFutViewNonUser](#onfutviewnonuser)
  - [onFutTriggerUser](#onfuttriggeruser)
  - [onFutTriggerNonUser](#onfuttriggernonuser)
  - [onFutUpdate](#onfutupdate)
  - [onFutAction](#onfutaction)
- [The "bot" Object](#the-bot-object)
- [Building Skills](#building-skills)
  - [Sharing Handlers](#sharing-handlers)
  - [Sharing the "one-bot function"](#sharing-the-one-bot-function)
  - [Handling Web Requests](#handling-web-requests)
  - [Middleware](#middleware)
  - [Namespacing Conventions](#namespacing-conventions)
- [Installing Skills From npm](#installing-skills%C2%A0from-npm)
  - [Skills With Side-Effects](#skills-with-side-effects)
- [Welcoming New Users](#welcoming-new-users)
- [Connecting 3rd Party Services](#connecting-3rd-party-services)
  - [OAuth](#oauth)
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
    bot.webhook.sendEmail({
      to: bot.get('source.from')
      from: "MyBot",
      subject: bot.get('source.subject'),
      body: [

        // 👇 An email-action
        {
          type: "button",
          behavior: "action",
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
  const mailBotsClient = MailBotsClient.fromBot(bot);
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
  const todoSettings = bot.webhook.settingsPage({
    namespace: "todo",
    title: "Todo Settings", // Page title
    menuTitle: "Todo" // Name of menu item
  });
  todoSettings.setUrlParams({ foo: "bar" }); // send a URL param (useful for showing dialogs)
  const urlParams = bot.get("url_params"); // retrieve URL params (see below)
  todoSettings.input({ name: "first_name", title: "First name" });
  todoSettings.buton({ type: "submit" });

  // Populate form values
  todoSettings.populate(bot.get("mailbot.stored_data.todo"));
  // Note bot.webhook.respond() is NOT called
});
```

URL parameters are passed through to the settings webhook. Use this to pass data into your settings when linking to it or displaying dialogs to the users (see above handler)

```javascript
mailbot.onSettingsViewed(function(bot) {
  const settingsPage = bot.webhook.settingsPage({ namespace: "todo" });
  const urlParams = bot.get("url_params", {}); //defualts to empty object

  if (urlParams.linkInstructions)) {
    settings.text(`# Instructions to link your account!`);
  }
  // Note that there is no submit button. It's just an informational page.
});
```

You can also pass URL params via the `urlParams` key in the `button` form element (it must be type:`submit`);

```javascript
// within a onSettingsViewed form as shown above
settings.button({
  submitText: "Save Notification Settings",
  type: "submit",
  urlParams: { saveSettings: 1 }
  // Tip: Pass through all URL current params, but use caution! (see note)
  // urlParams: {saveSettings: 1, ...bot.get("url_params", {})}
});
```

NOTE: URL parameters are an easy way to pass data into your bot settings, but **keep this in mind while using URL params**: Anyone can link a user to their settings page with _anything_ in URL. Do not, for example, create a url like: `/settings?delete_everything=true` that deletes all their tasks. An unsuspecting user may arrive on their settings page from an external link, not see this in the URL and submit the form only find themselves without any data. [Read more](<https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)>).

## onSettingsSubmit

```
mailbot.onSettingsSubmit(handlerFn)
```

Handle when the user submits their settings.

To persist the newly saved data, it must be explicitly saved. Use `bot.webhook.saveMailBotData()` or
`bot.set("mailbot.stored_data")` or API calls to do this.

Newly submitted values are available under `settings`.

Previously saved values are available under the `mailbot.stored_data`.

Every instance of this handler is called when any settings form is saved (similar to the above `onSettingsViewed` handler)

This handler is a good place begin an oauth handshake, set up data in other system or perform API calls to
other systems.

```javascript
mailbot.onSettingsSubmit(bot => {
  // assuming the same "todo" namespace as shown in the above examples
  const data = bot.get("settings.todo");

  // handler is fired any times settings are saved, even if its not our form
  if (!data) return;

  // perform API calls, validate connections, update external systems here

  // validate or modify data, then save it.
  bot.set("mailbot.store_data.todo", data);

  // This error would show to the user
  if (error) {
    bot.webhook.respond({
      webhook: {
        status: "error",
        message: "This is  a warning message"
      }
    });
  }
  return;
});
```

### URL Params

URL params are useful for passing data into settings handlers, showing dialogs and more. We tried to preserve the mental model of URL parameters while working with settings forms, but but it does not always apply exactly.

In the onSettingsSubmit handler, you need to pass `url_params` parameters through the webhoook response:

```javascript
// in onSettingsSubmit handler
bot.set("url_params", { show_success_dialog: "true" });
```

This is now accessible as a "url_param" in your `onSettingsViewed` handler. You will also see it as a URL
param in the settings UI:

```javascript
// in the onSettingsViewed handler, render a dialog with a button that dismisses the dialog
// const settingsForm set up earlier
const urlParams = bot.get("url_params", {});
if (urlParams.show_success_dialog) {
  settingsForm.text("# Success \nYour todo list has been set up!");
  settingsForm.button({ type: "submit",  text: "dismiss", urlParams({ dismissSuccess: true }) });
};
```

You can also set URL parameters using the `button` element which can trigger different actions based on the URL
(Note the CSR caution above).

```javascript
// back ino onSettingsSubmit handler.
if (bot.get("url_params.dissmissSuccess")) {
  bot.saveMailBotData("todo.show_success_dialog", null); // set to null to clear the value
}
```

Setting URL parameters in the `onSettingsViewed` hook requires a different method:

```javascript
// onSettingsViewed
// Force the page to have specific URL params
settingsPage.setUrlParams({ key: "value" });

// Force the settings page to have no URL params
settingsPage.setUrlParams({});
```

## on

```
mailbot.on(webhookEvent, handlerFn)
```

This is a generic handler for any webhook. It can be used to handle any inbound webhook – mainly ones that are not covered by the handlers above. (Of note: The handlers above are simply wrappers for this lower-level handler).

Example:

```javascript
mailbot.on("mailbot.installed", function(bot) {
  // Handle when a MailBot is installed
  // Create task with MailBots SDK
  // bot.webhook.respond();
});
```

The first paramater can be:

- A string that matches the webhook `type`. (ie. [`mailbot.installed`](https://docs.mailbots.com/reference#mailbotinstalled))
- A regular expression that matches on webhook `type`
- A function that takes the incoming webhook as the only parameter and returns a boolean value indicating whether or not that webhook should be handled by that function handler.

The second parameter is the function handler that runs only if the matching condition (the first parameter) is met.

```javascript
mailbot.on("mailbot.installed", function(bot) {
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

# FollowUpThen Lifecycle Hook Handlers

The below handlers are fired in response to FollowUpThen lifecycle events. Their response signature
differs from the native MailBots handlers above since it is injecting UI elements and behavioral changes
into the followup cycle.

The response style for all FollowUpThen Lifecycle Hook handlers is shown in onFutCreateUser below.

Available options for the response are described in the `ISkillReturnValue` interface within `types.ts`

## onFutCreateUser

Modify the FollowUpThen user's confirmation email or modify the task object when a followup is created.

```javascript
mailbot.onFutCreateUser(bot => {
  bod.webhook.addFutUiBlocks([
    {
      type: "text",
      text: "Text block"
    }
  ]);
});

// using native JSON response with TypeScript
mailbot.onFutCreateUser(bot => {
  const ISkillReturnValue: response = {
    futUiAddition: [
      {
        type: "text",
        text: "Text block"
      }
    ]
  };
  bot.responseJson = response;
  return;
});
```

## onFutCreateNonUser

In rare cases (currently only when a [task (-t)](http://help.followupthen.com/knowledge-base/tasks/) type
followup is being created, a non-FUT user receives an email which can be modified using the above hook.

## onFutPreviewUser

Render of UI elements into the preview email. (Shown when when a FUT user clicks "preview"
to see what a reminder format will do). These elements are usually identical to the ones shown in the
`onFutViewUser` and `onFutTriggerUser` hooks.

## onFutPreviewNonUser

If a preview will trigger the a followup to a non-FUT user (ie, when used in "cc"), this allows allows
for a preview of what this will look like.

## onFutViewUser

Render UI elements when a user is viewing a followup.

## onFutViewNonUser

If a FUT has emails sent to non-users, use this to render UI elements for only the non-user email.

## onFutTriggerUser

Render UI elements that are only visible to the FollowUpThen user when a followup becomes due.

## onFutTriggerNonUser

Render UI elements that are only for the non-user when a followup becomes due (if the followup format has
a non-user email component).

## onFutUpdate

Take action when a task is edited. This may involve creating, removing or unlinking a linked resource.

## onFutAction

The UI elements above may trigger email-based actions (fired from email, or from the FUT UI). This handler
allows for the handling of these actions.

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

"Skills" are sharable pieces of bot functionality. Skills can encapsulate everything they need (handlers, settings panels helper funcitons and UI elements) so they are ready for use installed. They are great for keeping your code organized and for sharing functionality with others.

## Sharing Handlers

We could better organize our handlers in the above examples by grouping them into different files. For example:

```javascript
// my-new-reminder-skill.js
module.exports.activate = function(mailbot) {
  // Handlers can go here
  // mailbot.onCommand...
};
```

Activate the skill's handlers like this (normally done in the top-level to ensure the skill is activated only once):

```javascript
// In top-level app.js
const myNewReminderSkill = require("./my-new-skill")(mailbot);
myNewReminderSkill.activate(mailbot);
```

Isolating your handlers within skills is a great way to keep your project organized. The down-side is that the skill owns each request from beginning to end – not very flexible.

The next sections cover more granular and composable technique. for sharing functionality across multiple handlers or multiple MailBots.

## Sharing the "one-bot function"

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

### Sharing UI Elements

Skills can also share [UI elements](https://docs.mailbots.com/docs/email-ui-reference).

By convention, UI functions that output UI start with `render`. For example, `renderMemorizationControls`.

```javascript
  var memorizeSkill = require("mailbots-memorize");
  memorizeSkill.activate(mailbot); // activate handlers

  mailbot.onCommand("remember", function(bot) {
    bot.webhook.sendEmail({
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

  ### Use of "MailBot", "mailbot", "MailBots" and "bots"

  For clarity and to reduce ambiguity, follow these conventions:

  - User-Facing: The name of the platform (and company) is "MailBots". Always studly-cased. Always plural.
  - User-Facing: One email-based bot is a "MailBot". Always studly-cased.
  - Code: `mailbot` (all lowercased) is an acceptable variable name, but...
  - Code: When the first "M" is capitalized, always capitalize the second. Ex: `createMailBot()`. `Mailbot` (lowercase "b") never exists.
  - Code: `bot` is only used for the bot helper object passed to handler functions.

# Installing Skills From npm

Skills can be installed from npm.

Here we will use `mailbots-memorize`, a skill that creates reminders for any [task](https://docs.mailbots.com/reference) using [spaced repetition](https://www.wikiwand.com/en/Spaced_repetition), a memorization technique that increases the time between reminders as more reminders are sent.

In your cli, run:

`npm install --save mailbots-memorize`

In our app.js file we will create a handler that uses our newly installed skill.

```javascript
// In main app.js file
var memorizeSkill = require("mailbots-memorize")(mailbot);

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

Skills that accept the `mailbots` object may automatically alter requests, reply to webhooks or take other action automatically behind the scenes.

> ⚠️ When building sharable skills, use this "automatic" method with caution. Invoking functionality with one line can be both magical and confusingly opaque. The second example below shows an alternative that keeps code more self-documenting and testable.

```javascript
// May automatically handle requets (ex, render settings pages, send emails)
var handleEverything = require("mailbots-handle-everything");
handleEverything(mailbot);
// or
require("handleEverything")(mailbot);
```

Alternatively, skills can export components (middleware, one-bot functions, etc) for you to explicitly use in your handlers.

> 👍 A more self-documenting and testable method.

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

Different approaches work well for different circumstances. For example, a bot analytics system would be well suited for automatic activation. A toolkit for integrating with a CRM, on the other hand, might make sense as an exported collection of useful middleware and functions.

# Welcoming New Users

When a new user installs your MailBot, they are directed to a settings page with the `welcome` namespace. Render a custom welcome message for your user by creating a settings page that targets this namespace.

```javascript
mailbot.onSettingsViewed(function(bot)  {
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

Your bot receives the `mailbot.installed` webhook which can be used to schedule a series of welcome emails to the user.

# Connecting 3rd Party Services

Connecting a 3rd party system ( CRMs, todo lists, etc) usually requires an access token or similar information from the 3rd party. The easiest way to connect is to ask the user to copy / paste some generated key, token or URL into their [settings page](#onsettingsviewed). A more friendly user experience is to use OAuth.

## OAuth

Use MailBot's internal Express app to provide begin the OAuth process and receive the OAuth callback. Save information on the user's account using the [setMailBotData](#) method (as shown below).

Note: The user's Bearer token is [saved as a cookie on your bot's URL](https://github.com/mailbots/mailbots/blob/56396fb3d6c00b1895533f9aee3193ae96ac9b45/lib/core-skills-first.js#L104) when the user first authorizes your MailBot. This allows you to use the [MailBots SDK](https://www.npmjs.com/package/@mailbots/mailbots-sdk) when you send a user to a specific URL. (Keep in mind security [XSRF implications](https://www.wikiwand.com/en/Cross-site_request_forgery) if you are doing something sensitve here, like deleting an account). For example:

```javascript
mailbot.app.get("/do-something-for-user", (req, res) => {
  // user's cookies, bearer token, etc are available here
  // redirect elsewhere
});
```

### OAuth Example

Here is is an example OAuth flow, minus the provider-specific logic:

```javascript
// 1. start OAuth handshake, set OAuth state, etc
mailbot.app.get("/connect_provider", (req, res) => {
  res.redirect(providerRedirectUri);
});
```

After the user authorizes with the 3rd party service (todo list, repo, CRM, etc) they are redirected to a callback URL, which does most the work, saves the access token, then redirects the user to their settings page with a success message.

```javascript
// 2. Handle callback after user authorizes on 3rd party site
mailbot.app.get("/provider_callback", async (req, res) => {
  // verify state
  // exchange auth code for token from provider
  // authorize the client SDK and save user's new auth code
  const MailBotsClient = require("@mailbots/mailbots-sdk");
  const mbClient = new MailBotsClient();
  await mbClient.setAccessToken(req.cookies.access_token);
  res.redirect(`${res.locals.bot.config.mailbotSettingsUrl}/success`);
});
```

The work is performed only on your MailBot's url, but to a user, they just click an "Authorize" button on their MailBots settings, connect a 3rd party account and ended up back on their settings page. Service connected, minimal hassle.

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
- `npm init -y`
- `npm install mailbots`
- `touch app.js`

**2. Add Setup Code**

```javascript
const MailBot = require("mailbots");
const mailbot = new MailBot({
  clientId: "your_client_id",
  clientSecret: "your_secret",
  mailbotUrl: "http://your_bot_url"
});
// NOTE: The recommended way to set up your MailBot is to set
// CLIENT_ID, CLIENT_SECRET and MAILBOT_URL in env and use dotenv

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
Please follow the [MailBot naming conventions](https://github.com/mailbots/mailbots#use-of-mailbot-mailbot-mailbots-and-bots).
We use ngrok to mock API requests, included in the test package here. This can be disabled to test against the live
API (see package.json).
