<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Quick Start](#quick-start)
- [Overview](#overview)
- [Example: Hello World](#example-hello-world)
- [Example: A Reminder](#example-a-reminder)
- [Example: Handle Email Actions](#example-handle-email-actions)
- [Handlers](#handlers)
  - [onCommand](#oncommand)
  - [onTrigger](#ontrigger)
  - [onAction](#onaction)
  - [onTaskViewed](#ontaskviewed)
  - [onEvent](#onevent)
  - [onSettingsViewed](#onsettingsviewed)
  - [beforeSettingsSaved](#beforesettingssaved)
  - [on](#on)
- [Organizing Skills](#organizing-skills)
  - [Making Modular Skills](#making-modular-skills)
  - [Ways of Sharing Functionality](#ways-of-sharing-functionality)
    - [1. Directly handling requests](#1-directly-handling-requests)
    - [2. Export a "Gopher function"](#2-export-a-gopher-function)
    - [3. Export Middleware](#3-export-middleware)
    - [4. Automatically Applying Middleware](#4-automatically-applying-middleware)
  - [Configurable Milddeware and Functions](#configurable-milddeware-and-functions)
- [Installing 3rd Party Skills](#installing-3rd-party-skills)
- [Publishing Skills](#publishing-skills)
  - [Sharing UI Elements](#sharing-ui-elements)
  - [Activating Skills](#activating-skills)
- [Using Express.js Middlware and Routes](#using-expressjs-middlware-and-routes)
  - [Adding to bot.skills with middlware](#adding-to-botskills-with-middlware)
  - [Handling routes](#handling-routes)
- [The "Gopher Object" Reference](#the-gopher-object-reference)
- [Install Flow](#install-flow)
- [Testing](#testing)
- [Installing](#installing)
- [Handling Errors](#handling-errors)
- [Design Philosophy](#design-philosophy)
- [Contributions](#contributions)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

An easy-to-use, open-source framework to create and install skills for your [MailBots.com](https://www.mailbots.com) email bot.

## Quick Start

Go through the extension setup process at mailbots.com. This will provide a fully editable, working and authenticated instance of this framework within about one minute. You can also install [locally](<(<(#installing)>)>).

Let's tell our bot what do to when it receives the [email command](https://docs.mailbots.com/reference#email-commands) "hi":

```javascript
var MailBot = require("mailbots");
var mailbot = new MailBot();

// When someone emails: hi@my-bot.eml.bot, respond "Hello world!"
mailbot.onCommand("hi", function(bot) {
  bot.webhook.quickReply("Hello world!");
  bot.webhook.respond();
});

mailbot.listen();
```

Now when anyone\* emails `hi@my-bot.eml.bot` they will get this email back.

\*"Anyone" means anyone with an email address, regardless of email client, language, geography, platform (mobile, tablet, Raspberry Pi, etc). It's just email!

## Overview

MailBots help you get things done without leaving your email, like an exceptionally skilled lovable rodent that digs tunnels from your inbox to your other systems.

**Core API**

The MailBots core API provides core email APIs for sending email, receiving and parsing email, storing data, and setting reminders.

**MailBots**

Creating a MailBot grants developer access to Gopher's Core APIs, allowing someone to create an email-only utility (like followupthen.com). MailBots, are set up to be publishable, but they can also be kept private.

**Webhook Based**

When events happen in the core API (ex: email is received), it sends webhooks to your MailBot. Your extension responds with JSON that tells Gopher what to do next (ex: send an email, store data, set a reminder, etc). JSON in, JSON out. What happens in between those points is the business of this project.

**Skills**

MailBots are composed of one or more "skills". This project provides a framework to create and install skills that accomplish specific email-based tasks. For example:

- Parsing inbound email
- Sending email at exactly the right moment
- Querying APIs to put useful information in an email
- Submitting data to CRMs, project management systems, etc
- Handling commands and actions using purely email
- Rendering email UI elements

Skills can register "handlers" – functions that tell Gopher what to do when certain events occur. Skills can respond to emails and / or provide components to other skills.

## Example: Hello World

Create an [email command](https://docs.mailbots.com/reference#email-commands) that says hi

```javascript
// Inside app.js
var MailBotsApp = require("mailbots");
var app = new MailBotsApp();

mailbot.onCommand("hi", function(bot) {
  bot.webhook.quickReply("Hi back!");
  bot.webhook.respond();
});

mailbot.listen();
```

## Example: A Reminder

The first handler creates the reminder. The second one handles the reminder when it becomes due.

```javascript
// Inside app.js
// Schedule the task to trigger in 1 minute
var MailBotsApp = require("mailbots");
var app = new MailBotsApp();

mailbot.onCommand("hi", function(bot) {
  bot.webhook.setTriggerTime("1min");
  bot.webhook.respond();
});

// When a task with "hi" command triggers, run this function
mailbot.onTrigger("hi", function(bot) {
  bot.webhook.quickReply("Hi 1 minute later!");
  bot.webhook.respond();
});

mailbot.listen();
```

## Example: Handle Email Actions

Here an example of handling
an [Action Email](https://docs.mailbots.com/reference#email-based-actions).

The interaction would start with emailing `hi-example@my-bot.eml.bot`. This email would render a button to `Say Hi` which, when clicked, would trigger an Action.

```javascript
var MailBotsApp = require("mailbots");
var app = new MailBotsApp();

 mailbot.onCommand("hi-example", function(bot) {
    bot.webhook.addEmail({
      to: bot.get('source.from')
      from: "Hi Gopher",
      subject: bot.get('source.subject'),
      body: [
        {
          type: 'title',
          text: 'Click button to say hi'
        },

        // An email based action
        {
          type: "button",
          text: "Say Hi",
          action: 'say.hi',
          subject: "Hit Send to Say hi"
        }
      ]
    });
    bot.webhook.respond();
  };

  // Handle the event created by our UI above
  mailbot.onAction('say.hi', function(bot) {
    bot.webhook.quickReply('hi');
    bot.webhook.respond();
  });

  mailbot.listen();
```

## Handlers

The Gopher Core API sends a webhook webhooks to your Gopher App extension when certain events occur (for example, an email is received). These events are handled by the following handlers.

Note: The first matching event handler ends the request, even if subsequent handlers also match, except where otherwise noted.

### onCommand

Handle when a new task is created either via an [email command](https://docs.mailbots.com/reference#email-commands) or via the API. For example, add an item to a todo list.

Note that a task always has a command.

```javascript
mailbot.onCommand("todo", function(bot) {
  //handle when a task is created with this command string
});
```

Regular expressions work, too. RegEx expressions work other handlers as well.

```javascript
mailbot.onCommand(/todo.*/, function(bot) {
  //Handle todo.me@my-ext.eml.bot, todo.you@my-ext.eml.bot, todo.everyone@my-ext.eml.bot
});
```

### onTrigger

Handle when a task "[triggers](https://docs.mailbots.com/reference#perfect-timing)", it becomes relevant to the user and should be sent to their email inbox. The most common trigger (currently) is a when a scheduled task becomes due.

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

### onAction

Handle when a user clicks a mailto link within a Gopher email to accomplish an action ([Email Based Actions](https://docs.mailbots.com/reference#email-based-actions)) the onAction handler is received. For example, postponing a reminder or completing a todo item.

```javascript
mailbot.onAction("complete", function(bot) {
  // Complete the related todo
});
```

### onTaskViewed

Handle when a task is viewed in the Gopher Web UI, allowing a user to view and interact with a future Gopher email.

```javascript
mailbot.onTaskViewed("todo.me", function(bot) {
  // Show a preview of the future email
});
```

Different task commands may render differently. For example a task with command `todo.crm` may query and render current CRM data within the preview.

### onEvent

Handle when the extension receives an inbound webhok from a 3rd party system about an external event. For example, a support ticket is created or a lead is added to a CRM.

Note: This action does not automatically create a Gopher Task. One can be created with [mailbots-sdk](https://www.npmjs.com/package/@mailbots/mailbots-sdk)

```javascript
MailBotsClient = require("@mailbots/mailbots-sdk");

mailbot.onEvent("issue.created", async function(bot) {
  // Handle event, for example, create a Gopher Task.
  const mailBotsClient = new MailBotsClient.fromBot(bot);
  await mailBotsClient.createTask({
    // Pre-authenticated API client
  });
  bot.webhook.respond({ webhook: { status: "success" } });
});
```

### onSettingsViewed

Handle when a user views this extension's settings.

The handler's only parameter is a callback function that responds with a [JSON form schema](https://mozilla-services.github.io/react-jsonschema-form/) to render a settings form. The callback function is passed the `bot` object as usual.

This function should return a [JSON schema](https://mozilla-services.github.io/react-jsonschema-form/) to render a settings form. See the settings example in Gopher Skills Kit. (Note: Not all JSON Form Schema UI options are supported)

Unlike the other handlers, every instance of this handler is called. (ie, all settings pages from all extensions are rendered).

Do not call `bot.webhook.respond()` at the end of this particular request. Gopher App's internals take care of compiling the JSON and responding.

```javascript
// Render a settings field for the user to enter their first name
mailbot.onSettingsViewed(async function(bot) {
  // const myAsyncThing = await getAsyncThing();
  const settingsPage = bot.webhook.settingsPage({
    namespace: "todo",
    title: "Todo Settings", // Page title
    menuTitle: "Todo" // Name of menu item
  });
  settingsPage.input({ name: "first_name", title: "First name" });
  settingsPage.submitButton();

  // Populate form values
  settingsPage.populate(bot.get("extension.saved_data.todo"));
});
```

The viewer's URL parameters are passed through to the settings webhooks. Use this to pass data into your settings when you link to it.

```javascript
mailbot.onSettingsViewed(function(bot) {
  const settingsPage = bot.webhook.settingsPage({ namespace: "todo" });

  // It was just installed, welcome the user!
  if (bot.get("url_params.linkInstructions", false)) {
    settings.text(`# Instructions to link your account!`);
  }
  // Note that there is no submit button. It's just an informational page.
});
```

Pass URL params to your `beforeSettingsSaved` handler using the `urlParams` key in the `submit` form element. This appends the url parameter to the settings form.

NOTE: Depending on how you are using this URL parameter, you may wish to confirm actions iwth users to guarad against (cross site forgery)[https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)].

```javascript
// within a onSettingsViewed form as shown above
settings.submitButton({
  submitText: "Save Notification Settings",
  urlParams: { saveSettings: 1 }
  // Tip: Pass through all URL current params like so (note these should be sanitized)
  // urlParams: {saveSettings: 1, ...bot.get("url_params", {})}
});
```

### beforeSettingsSaved

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

### on

This is a generic handler for any webhook. It can be used to handle any inbound webhook – mainly ones that are not covered by the handlers above. (Of note: The handlers above are simply wrappers for this lower-level handler).

Example:

```javascript
mailbot.on("extension.installed", function(bot) {
  // Handle when an extension is installed
  // Create task with MailBots SDK
  // bot.webhook.respond();
});
```

The first paramater can be:

- A string that matches the webhook `type`. (ie. [`extension.installed`](https://docs.mailbots.com/reference#extensioninstalled))
- A regular expression that matches on webhook `type`
- A function that takes the incoming webhook as the only parameter and returns a boolean value indicating whether or not that webhook should be handled by that function handler.

The second parameter is the function handler that runs if the matching condition (the first parameter) is met.

```javascript
mailbot.on("extension.installed", function(bot) {
  // Handle when an extension is installed
  // Create at ask from mailbots sdk
  // bot.webhook.respond();
});
```

## Organizing Skills

Skills can have multiple handlers (like in the last examples). To keep things organized, we can group a collection of skill handlers into their own files, and group multiple files for a skill into a directory. For example:

```javascript
// In my-new-reminder-skill.js, wrap your code like this:
module.exports = function(app) {
  // Same code as previous example
  // mailbot.onCommand("hi", function(bot) {}
  // mailbot.onTrigger("hi", function(bot) {}
};
```

Then load your skill file like this:

```javascript
require("./my-new-skill")(mailbot);
```

There is a helper method that makes it easy to load multiple skills at once:

```javascript
// Install all skills in a directory (but not its directories)
mailbot.loadSkill(__dirname + "/my/skills/");
```

The `loadSkill` helper does not load skills in subdirectories. Subdirectories are reserved for libs, tests and sub-skills that can themesleves be explicitly loaded.

Pass an optional config object to each loaded skill.

```javascript
// Pass optional config object
mailbot.loadSkill(__dirname + "/my/skills/", config);
```

### Making Modular Skills

Gopher Skills can be organized into reusable components that have everything they need for a particular function: UI elements, events handlers and settings.

Here is our [previous example](https://github.com/mailbots/mailbots#example-handle-email-actions), this time in its own stand-alone, reusable skill:

```javascript
// hi-skill.js (As an isolated component)
module.exports = function(mailbot) {
  // Handle UI events
  mailbot.onAction("say.hi", function(bot) {
    bot.webhook.quickReply("hi");
    bot.webhook.respond();
  });

  return {
    // Return UI elements
    renderHiButton: function() {
      return {
        type: "button",
        text: "Say Hi",
        action: "say.hi",
        subject: "Hit Send to Say hi"
      };
    }
  };
};
```

Any [handler](https://github.com/mailbots/mailbots#handlers) can be included in our skill – settings, actions, email commands, etc.

Use our stand-alone skill like this:

```javascript
// Get UI elements and activate all handlers
const { hiButton } = require('./hi-skill')(mailbot);

mailbot.onCommand("remember", function(bot) {
  bot.webhook.addEmail({
    // to, cc, etc
    body: [
      hiButton() // <-- A self-contained UI component
    ]
  });
  bot.webhook.respond();
};
```

Continue to share the same element and logic across different handlers and files. MailBotsApp doesn't mind the handlers being re-activated.

```javascript
// different file
const { hiButton } = require('./hi-skill')(mailbot);

mailbot.onAction("say.hi", function(bot) {
  bot.webhook.addEmail({
    // to, cc, etc
    body: [
      hiButton() // <-- Same button, DRY
    ]
  });
  bot.webhook.respond();
};
```

### Ways of Sharing Functionality

Ther are different ways a component-skill (a skill designed to be used as a component of other skills) can share functionality with other skills.

#### 1. Directly handling requests

The example above shows a skill directly handling an email command directly (`mailbot.onCommand("remember"...`). This is simplest method, but not always desirable because it handles the complete request without the knowledge of the top-level skill. It's good for your own sub-skills where are you are in control, but for sharing reusable components there are emore granular and composable techniques.

#### 2. Export a "Gopher function"

A skill can export a function that:

1. Directly returns json (like our `hiButton` example above) and / or
2. Alters alters the response object in some way (example below).

```javascript
// Create sharable Gopher function that emails "hi" when called
module.exports = function(mailbot) {
  return {
    sayHi: function(bot) {
      bot.webhook.quickReply("hi");
    }
  };
};
```

```javascript
// Use the Gopher function
const { sayHi } = require("./hi-skill")(mailbot);

mailbot.onCommand("whatever-custom-command", function(bot) {
  sayHi(bot); // Sends an email that says "hi"
  bot.webhook.respond();
});
```

As convention, these functions take the `bot` object which contains the request / response state, utilities to alter the request.

#### 3. Export Middleware

Middlware can be exported and "used" by the top-level skill. This has the advantage of applying some action or behavior across multiple handlers.

```javascript
// Export middleware to log everything
module.exports = function(mailbot) {
  function logEverythingMiddleware(req, res, next) {
    const bot = res.locals.bot; // Gopher lives here
    const emailSubject = bot.get("source.subject");
    require("my-great-logger").log(`Got an email about ${emailSubject}`);
    next(); // <-- Don't forget this!
  }
  return { logEverythingMiddleware };
};
```

```javascript
// Using our middleware
const { logEverythingMiddleware } = require("./log-everything")(mailbot);

// Apply to all subsequent handlers
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

#### 4. Automatically Applying Middleware

Middlware may be automatically invoked, which can be useful in some situations. Generally, it is advisable to export middleware so it can be explicitly "used" by the top-level skill.

```javascript
// Automatically log everything
module.exports = function(mailbot) {
  function logEverythingMiddleware(req, res, next) {
    const bot = res.locals.bot;

    // Prevent middleware from running multiple times
    if (bot.alreadyRan(logEverything)) return next();
    const emailSubject = bot.get("source.subject");
    require("my-great-logger").log(`Got an email about ${emailSubject}`);
    next(); // <-- Again, don't forget this!
  }

  // Automatically apply middleware the moment the skill is required
  mailbot.app.use(logEverything);
};
```

Use middleware:

```javascript
// middleware is automatically activated (use with caution)
require("./log-everything")(mailbot);
```

### Configurable Milddeware and Functions

If a skill or function requires configuration, a second, config object can be passed:

```javascript
// Configure a skill
var memorizeSkill = require("gopher-memorize")(mailbot, config);
```

```javascript
// Configure a Gopher Function
var { hiButton } = require("gopher-memorize")(mailbot);

mailbot.onCommand("hi", bot => {
  hiButton(bot, { text: });
  bot.webhook.respond();
});
```

Use skills across different components, projects or publish them to npm.

## Installing 3rd Party Skills

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

## Publishing Skills

Stand-alone skills (as shown above) can be published to npm and shared with others.

**Naming Conventions**

Try to use the same unique string (ex: "skill-name") for:

- The module "gopher-skill-name"
- Preface your event names, commands and actions with your skill name, or an
  abbreviation if it is long (due to character limitations in the part of
  of email addresses before the @ sign)
- When storing data against the task or extension, put your skill data
  in an object with a key of the skill name.

These conventions improve usability and trackability of your extension.

**Skill naming conventions**

Skills added to the `bot.skills` object via middleware should be camelCased version of their skill name (ie, `bot.skills.skillName`). They should also be invokable with no parameters.

```javascript
bot.skills.memorize.memorizeTask();
```

Add additional options by passing a configuration object:

```javascript
bot.skills.memorize.memorizeTask({ frequencyPref: 0.1 });
```

This method signatures the makes for a simple, consistent developer experience and maintains the metaphor of our bot being ordered around.

### Sharing UI Elements

Skills can render UI elements by exporting function that return [JSON UI elements](https://docs.mailbots.com/docs/email-ui-reference). For example, our memorizaiton skill has a UI element that changes the memorizaiton frequency.

By convention, methods that render UI elements start with `render`. For example, `renderMemorizationControls`.

```javascript
  var memorizeSkill = require("gopher-memorize")(mailbot);
  mailbot.onCommand("remember", function(bot) {
    bot.webhook.addEmail({
      to: "you@email.com"
      from: "Gopher",
      subject: "Email Subject"
      body: [
        {
          type: 'title',
          text: 'A Title'
        },

        // UI Components in a Gopher skill
        memorizeSkill.renderMemorizationControls()
      ]
    })
    bot.webhook.respond();
  }
```

### Activating Skills

A skill becomes "activated" the moment it is required.

```javascript
var memorizeSkill = require("gopher-memorize")(mailbot);
```

From this point on, its handlers and middleware are active.

If a skill requires configuration, a second, config object can be passed:

```javascript
var memorizeSkill = require("gopher-memorize")(mailbot, config);
// optional config object would be defined by each skill
```

## Using Express.js Middlware and Routes

MailBotsApp is a wrapper for an instance of Express.js. The Express.js `app` object is available for use at `mailbot.app`. This allows your sharable skill to do anything that can be done with Express: Authentiate other services, interact with APIs, respond to webhooks and render web pages.

### Adding to bot.skills with middlware

The `bot` object passed into your handlers can be modified with middlware. Internally, MailBotsApp uses middlware to pre-load the `bot` object with with various functions. You can take this further. For example:

```javascript
// Configure a logging object
mailbot.app.use(function(req, res, next) {
  var bot = res.locals.bot; // bot object lives here
  var logger = require("./logger");
  logger.setup({ key: "123" });

  // configure and add our custom logger skill
  bot.skills.myCustomSkill.logger = logger.config({ key: "123" });
  next(); // Don't forget this!
});

mailbot.onCommand("hi", function(bot) {
  // The configured skill is available in subsequent handlers
  bot.skills.myCustomSkill.logger.log("Log with my pre-configured logger");
  bot.webhook.respond();
});
```

For some cases (loggers, configuraed object) passing a skill via via bot.skills can come in handy. For most cases, explicitly `require` your skills to make your code more self-documenting.

Note that middleware runs for _all_ requests.

Here is an example of running middleware that appends stored data to the task object only in certain cases.

```javascript
mailbot.app.use(function(req, res, next) {
  // Only execute middleware for webhooks that have the word `task` in them
  const taskWebhook = bot.get("event") && !bot.get("event").includes("task");
  if (!bot.isWebhook || !taskWebhook) {
    return next();
  }
  // your logic here
  bot.set("task.stored_data.todo", { done: false });
  next();
});
```

Finally, an important note from Express.js:

> Middleware is like a plumbing pipe: requests start at the first middleware function defined and work their way “down” the middleware stack processing for each path they match.

> They [middleware handlers] are invoked sequentially, thus the order defines middleware precedence. For example, usually a logger is the very first middleware you would use, so that every request gets logged.

In short, make sure you load your middlware before trying to use it in a handler.

One way to do this is to use the `loadSkill` helper first on a middleware directory, then again on the rest of your skills.

### Handling routes

Handle http routes the same as you would in [Express.js](https://expressjs.com/en/guide/routing.html):

```javascript
mailbot.app.get("/hi", function(req, res) {
  res.send("<h1>Hi http request!</h1>");
});
```

## The "Gopher Object" Reference

The bot object passed into the handlers above is an instance of BotRequest. Documentation will soon follow. For now read through the bot-request.test.js file.

** Setting Data Works By Shallow Merging **
Similar to React, data is set by shallow merging. For example.

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

## Install Flow

When the extension has just been installed, the user will be directed to the `welcome` settings URL. Create a settings form with the namespace `welcome` to welcome the new user. Ex:

Note: When your extension is in `dev_mode` the extension owner is automatically directed to the sandbox.

## Testing

Export a testable instance of your Gopher app by calling `mailbot.exportApp()` instead of calling `mailbot.listen()`. Below is an example of testing the exported app with [Supertest](https://www.npmjs.com/package/supertest).

Note: Set `NODE_ENV` to `testing` to disable webhook validation.

```javascript
const request = require("supertest");
const mocha = require("mocha");
const expect = require("chai").expect;
const MailBotsApp = require("mailbots");
let mailbot; // re-instantiated before each test

// Utility function to send webhook to our app
function sendWebhook({ app, webhookJson }) {
  return request(app)
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

    const app = mailbot.exportApp();
    const webhookJson = require("./_fixtures/task.created.json");
    let { body } = await sendWebhook({ app, webhookJson });

    // Test our webhook response
    expect(body.send_messages[0].subject).to.equal("I dig email");
  });
});
```

## Installing

The setup process from mailbots.com creates a pre-installed instance of Gopher App using [Glitch](https://glitch.com/) to get started quickly.

Here are install instructions for local development or production deployments:

**1. Install**

- `mkdir my-skill`
- `npm install mailbots`
- `touch app.js`

**2. Basic Handler**

```javascript
var MailBot = require("mailbots");
var mailbot = new MailBot({
  clientId: "your_client_id",
  clientSecret: "your_secret",
  botUrl: "http://your_extension_url" // See step #3
});

mailbot.onCommand("hello", bot => {
  bot.webhook.quickReply("world");
  bot.webhook.respond();
});

mailbot.listen();
```

**3. Create MailBot**

Create an extension at mailbots.com(https://app.mailbots.com/developer/create). Click "Manual Setup" at the bottom.

Gopher needs to send HTTP POSTs to your extension, which means it will need a public URL. Use [ngrok](https://ngrok.com/) to set up a public-facing url to your extension. Enter the base URL on your edit page.

**4. Install and Go to Sandbox**

Click the "Install" button on your extension's developer page. After you've authenticated, go back to the extension's developer page and click "Sandbox". Send a test "hello" command and your handler should run!

## Handling Errors

Set a custom error handling function to catch errors within your handlers. Ideally, error conditions are handled within the normal application flow. Use this handler to intercept unexpected errors. You can add your own custom logging, alerting or cutom error messaging for users.

If you want to send the user your own error message, use the[sendEmail](https://mailbots-sdk-js.mailbots.com/#sendemaill) method from the MailBots SDK. Not all webhook responses send emails.

```javascript
// define a custom error handler
app.setErrorHandler(function(error, bot) {
  // myCustomLogger.log(error);
  // send email with mailbots sdk
  // send a custom error email to user
  // bot.response.status(500); // 5xx status code sends generic error to user
  bot.webhook.respond({
    status: "error",
    message: "A custom error message" // Shown to user if in the web UI.
  }); // A webhook response must be sent
});
```

## Design Philosophy

Gopher App was created with two types of developers in mind:

1.  "Low-Code" developers that want to throw together an extension as quickly as possible.
2.  More experineced skill developers that wish to encapsulate some complex task as an easy-to-use Gopher Skill.

For category 1, we employ the metaphorical bot to invoke skills that "just work". Code is deliberately hidden. Sensible defaults are used so the user's first-time use makes sense. The conceptual model for this user is a lovable rodent that digs tunnels and gets things done for you. What's not to like?

For category 2, the more experience user, we don't try to hide Gopher App's internals. Gopher App is, essentially, an Express middleware stack along with some conventions to load and share this middlware – a familiar stack for most experienced Node.js developers.

## Contributions

Contributions are welcome in the form of PRs and / or Github tickets for issues, bugs, ideas and feature requests.
