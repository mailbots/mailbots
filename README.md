<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Gopher App](#gopher-app)
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
    - [on](#on)
    - [onSettingsViewed](#onsettingsviewed)
  - [Organizing Skills](#organizing-skills)
    - [Making Reusable Skills](#making-reusable-skills)
  - [Gopher API](#gopher-api)
  - [Installing 3rd Party Skills](#installing-3rd-party-skills)
    - [Publishing Skills](#publishing-skills)
      - [Naming Conventions](#naming-conventions)
    - [Sharing UI Elements](#sharing-ui-elements)
    - [Activating Skills](#activating-skills)
  - [Using Express.js Middlware and Routes](#using-expressjs-middlware-and-routes)
    - [Adding to gopher.skills with middlware](#adding-to-gopherskills-with-middlware)
    - [Handling routes](#handling-routes)
    - [Install Flow](#install-flow)
  - [Testing](#testing)
  - [Installing](#installing)
  - [Design Philosophy](#design-philosophy)
  - [Contributions](#contributions)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Gopher App

GopherApp is the open-source counterpart to Gopher.email. It provides an easy-to-use framework to create, add and an install 3rd party Gopher "skills" that get help people things done without leaving email.

## Quick Start

Go through the extension setup process at gopher.email. This will provide a working, authenticated instance of GopherApp in about one minute. (See below for local install instructions).

Then, add a skill.

Let's tell what Gopher what do to when it receives the [email command](https://docs.gopher.email/reference#email-commands) "hi":

```javascript
var GopherApp = require("gopher-app");
var gopherApp = new GopherApp();

// When someone emails: hi@your-extension.gopher.email, respond "Hello world!"
gopherApp.onCommand("hi", function(gopher) {
  gopher.webhook.quickReply("Hello world!");
});

gopherApp.listen();
```

Now when anyone\* emails `hi@your-extension.gopher.email` they will get this email back.

\*"Anyone" means anyone with an email address, regardless of email client, language, geography, platform (mobile, tablet, Raspberry Pi, etc). It's just email!

## Overview

Gopher.email helps you get things done without leaving your email, like an exceptionally skilled lovable rodent that digs tunnels from your inbox to your other systems.

**Core API**

The Gopher.email core API provides core email APIs for sending email, receiving and parsing email, storing data, and setting reminders.

**Extensions**

Creating a Gopher Extension grants developer access to Gopher's Core APIs, allowing someone to create an email-only utility (like followupthen.com). Extensions, are set up to be publishable, but they can also be kept private.

**Webhook Based**

When events happen in the core API (ex: email is received), it sends webhooks to your Gopher Extension. Your extension responds with JSON that tells Gopher what to do next (ex: send an email, store data, set a reminder, etc). JSON in, JSON out. What happens in between those points is the business of this project.

**Skills**

Extensions are composed of one or more "skills". GopherApp (this project) provides a framework to create and install skills that accomplish specific email-based tasks. For example:

- Parsing inbound email
- Sending email at exactly the right moment
- Querying APIs to put useful information in an email
- Submitting data to CRMs, project management systems, etc
- Handling commands and actions using purely email
- Rendering email UI elements

Skills can register "handlers" – functions that tell Gopher what to do when certain events occur. Skills can respond to emails and / or provide components to other skills.

## Example: Hello World

Create an [email command](https://docs.gopher.email/reference#email-commands) that says hi

```javascript
// Inside app.js
var GopherApp = require("gopher-app");
var gopherApp = new GopherApp();

gopherApp.onCommand("hi", function(gopher) {
  gopher.webhook.quickReply("Hi back!");
});

gopherApp.listen();
```

## Example: A Reminder

The first handler creates the reminder. The second one handles the reminder when it becomes due.

```javascript
// Inside app.js
// Schedule the task to trigger in 1 minute
var GopherApp = require("gopher-app");
var gopherApp = new GopherApp();

gopherApp.onCommand("hi", function(gopher) {
  gopher.webhook.setTriggerTime("1min");
});

// When a task with "hi" command triggers, run this function
gopherApp.onTrigger("hi", function(gopher) {
  gopher.webhook.quickReply("Hi 1 minute later!");
});

gopherApp.listen();
```

## Example: Handle Email Actions

Here an example of handling
an [Action Email](https://docs.gopher.email/reference#email-based-actions).

The interaction would start with emailing `hi-example@your-ext.gopher.email`. This email would render a button to `Say Hi` which, when clicked, would trigger an Action.

```javascript
var GopherApp = require("gopher-app");
var gopherApp = new GopherApp();

 gopherApp.onCommand("hi-example", function(gopher) {
    gopher.webhook.addEmail({
      to: gopher.get('source.from')
      from: "Hi Gopher",
      subject: gopher.get('source.subject'),
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
    })
  };

  // Handle the event created by our UI above
  gopherApp.onAction('say.hi', function(gopher) {
    gopher.webhook.quickReply('hi');
  });

  gopherApp.listen();
```

## Handlers

The Gopher Core API sends a webhook webhooks to your Gopher App extension when certain events occur (for example, an email is received). These events are handled by the following handlers.

Note: The first matching event handler ends the request, even if subsequent handlers also match, except where otherwise noted.

### onCommand

Handle when a new task is created either via an [email command](https://docs.gopher.email/reference#email-commands) or via the API. For example, add an item to a todo list.

Note that a task always has a command.

```javascript
gopherApp.onCommand("todo", function(gopher) {
  //handle when a task is created with this command string
});
```

Regular expressions work, too. RegEx expressions work other handlers as well.

```javascript
gopherApp.onCommand(/todo.*/, function(gopher) {
  //Handle todo.me@my-ext.gopher.email, todo.you@my-ext.gopher.email, todo.everyone@my-ext.gopher.email
});
```

### onTrigger

When a task "[triggers](https://docs.gopher.email/reference#perfect-timing)", it becomes relevant to the user and should be sent to their email inbox. The most common trigger (currently) is a when a scheduled task becomes due.

Tasks with different commands may trigger differently. For example:

```javascript
gopherApp.onTrigger("todo.me", function(gopher) {
  // Assigned to myself, so only remind me
});
```

```javascript
gopherApp.onTrigger("todo.assign", function(gopher) {
  // Assigned to the person in the 'to' field, so remind them
});
```

```javascript
gopherApp.onTrigger("todo.crm", function(gopher) {
  // Query CRM API, populate email followup with contact data
});
```

### onAction

When a user clicks a mailto link within a Gopher email to accomplish an action ([Email Based Actions](https://docs.gopher.email/reference#email-based-actions)) the onAction handler is received. For example, postponing a reminder or completing a todo item.

```javascript
gopherApp.onAction("complete", function(gopher) {
  // Complete the related todo
});
```

### onTaskViewed

Handle when a task is viewed in the Gopher Web UI, allowing a user to view and interact with a future Gopher email.

```javascript
gopherApp.onTaskViewed("todo.me", function(gopher) {
  // Show a preview of the future email
});
```

Different task commands may render differently. For example a task with command `todo.crm` may query and render current CRM data within the preview.

### onEvent

Handle when the extension receives an inbound webhok about about an external occurrence. For example, a support ticket is created or a lead is added to a CRM.

Note: This action does not automatically create a Gopher Task. One can be created with the pre-authenticated API client, `gopher.api`, as shown below.

```javascript
gopherApp.onEvent("issue.created", function(gopher) {
  // Handle event, for example, create a Gopher Task.
  // gopher.api.createTask();  // Pre-authenticated API client
});
```

### onSettingsViewed

When a user loads the extension settings page on gopher.email, this handler responds with a [JSON form schema](https://mozilla-services.github.io/react-jsonschema-form/) to render a settings form and pre-populate it with values.

A Gopher skill can render its own settings pages. Unlike the other handlers, every instance of this handler is called. All settings pages are rendered.

The first parameter is the `namespace` for the data stored in `extension.stored_data`. This is also used in the URL on the settings page so it can be linked to directly.

The second param is a function that is passed 3 arguments:

- The `gopher` helper object
- The settings for that data namespace
- The complete webhook (with extension and user data)

  This function should return a [JSON schema](https://mozilla-services.github.io/react-jsonschema-form/) to render a settings form. See the settings example in Gopher Skills Kit. (Note all JSON Form Schema UI options are supported)

```javascript
// Render a settings field for the user to enter their first name
gopherApp.onSettingsViewed(function(gopher) {
  const settingsPage = gopher.webhook.settingsPage({
    namespace: "todo",
    title: "Todo Settings", // Page title
    menuTitle: "Todo" // Name of menu item
  });
  settingsPage.input({ name: "first_name", title: "First name" });
  settingsPage.submitButton();

  // Populate form values
  settingsPage.populate(gopher.get("extension.saved_data.todo"));
});
```

The viewer's URL parameters are passed through to the settings webhooks. Use this to pass data into your settings when you link to it.

```javascript
gopherApp.onSettingsViewed(function(gopher) {
  const settingsPage = gopher.webhook.settingsPage({ namespace: "todo" });

  // It was just installed, welcome the user!
  if (gopher.get("url_params.linkInstructions", false)) {
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
  // urlParams: {saveSettings: 1, ...gopher.get("url_params", {})}
});
```

### beforeSettingsSaved

This is called when the user saves their settings, before settings are actually saved.

Similar to the above `onSettingsViewed` handler, every instance of this handler is called when settings are saved.

Validate user data, perform API calls to keep other systems in sync. Return an error
to abort the settings process.

```javascript
  gopherApp.beforeSettingsSaved(gopher =>

    // assuming the same "todo" namespace as shown in the above examples
    const data = gopher.get("settings.todo");

    // handler is fired any times settings are saved, even if its not our form
    if(!data) return;

    // perform API calls, synchronize systems, etc.
    if(!isvalid(data)) {

    // abort the saving process
    gopher.webhook.respond({
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

This is a generic, low-level handler that can handle any webhook.

The first paramater can be:

- a string that matches the webhook `type`. (ie. [`extension.installed`](https://docs.gopher.email/reference#extensioninstalled))
- A regular expression that matches on webhook `type`
- A function that takes the incoming webhook as the only parameter and returns a boolean value indicating whether or not that webhook should be handled by that function handler.

THe second parameter is the function handler that runs based on the matching condition of the first parameter.

```javascript
gopherApp.on("extension.installed", function(gopher) {
  // Handle when an extension is installed
  // gopher.api.createTask();  // Pre-authenticated API client
});
```

## Organizing Skills

Skills can have multiple handlers (like in the last examples). To keep things organized, we can group a collection of skill handlers into their own files, and group multiple files for a skill into a directory. For example:

```javascript
// In my-new-reminder-skill.js, wrap your code like this:
module.exports = function(gopherApp) {
  // Same code as previous example
  // gopherApp.onCommand("hi", function(gopher) {}
  // gopherApp.onTrigger("hi", function(gopher) {}
};
```

Then load your skill file like this:

```javascript
require("./my-new-skill")(gopherApp);
```

There is a helper method that makes it easy to load multiple skills at once:

```javascript
// Install all skills in a directory (but not its directories)
gopherApp.loadSkill(__dirname + "/my/skills/");
```

The `loadSkill` helper does not load skills in subdirectories. Subdirectories are reserved for libs, tests and sub-skills that can themesleves be explicitly loaded.

Pass an optional config object to each loaded skill.

```javascript
// Pass optional config object
gopherApp.loadSkill(__dirname + "/my/skills/", config);
```

### Making Reusable Skills

Gopher Skills can be organized into reusable components that have everything they need for a particular function: UI elements, events handlers and settings.

Here is our [previous example](https://github.com/gopherhq/gopher-app#example-handle-email-actions), this time in its own stand-alone, reusable skill:

```javascript
// hi-skill.js (As an isolated component)
module.exports = function(gopherApp) {
  // Handle UI events
  gopherApp.onAction("say.hi", function(gopher) {
    gopher.webhook.quickReply("hi");
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

Any [handler](https://github.com/gopherhq/gopher-app#handlers) can be included in our skill – settings, actions, email commands, etc.

Use our stand-alone skill like this:

```javascript
// Get UI elements and activate all handlers
const { hiButton } = require('./hi-skill')(gopherApp);

gopherApp.onCommand("remember", function(gopher) {
  gopher.webhook.addEmail({
    // to, cc, etc
    body: [
      hiButton() // <-- A self-contained UI component
    ]
  })
};
```

Continue to share the same element and logic across different handlers and files. GopherApp doesn't mind the handlers being re-activated.

```javascript
// different file
const { hiButton } = require('./hi-skill')(gopherApp);

gopherApp.onAction("say.hi", function(gopher) {
  gopher.webhook.addEmail({
    // to, cc, etc
    body: [
      hiButton() // <-- Same button, DRY
    ]
  })
};
```

Organizing skills as above makes them portable. Use them across different components, projects or publish them to npm.

## Gopher API

A pre-authenticated [Gopher API client](https://github.com/gopherhq/gopherhq-js) is available within every handler at `gopher.api`.

```javascript
gopherApp.onCommand("remember", function(gopher) {
  // An authenticated API Client is available on gopher.api
  gopher.api.getExtensionData(); // this just works!
};

// See https://github.com/gopherhq/gopherhq-js for api
```

## Installing 3rd Party Skills

Skills can be installed from npm.

Here we will use `gopher-memorize`, a skill that creates reminders for any [task](https://docs.gopher.email/reference) using [spaced repetition](https://www.wikiwand.com/en/Spaced_repetition), a memorization technique that increases the time between reminders as more reminders are sent.

In your cli, run:

`npm install --save gopher-memorize`

In our app.js file we will create a handler that uses our newly installed skill.

```javascript
// In main app.js file
var memorizeSkill = require("gopher-memorize")(gopherApp);

gopherApp.onCommand("remember", function(gopher) {
  memorizeSkill.memorizeTask(gopher); //  ⬅ Tells Gopher to memorize your task
  gopher.webhook.quickResponse("Memorizing!");
});

// Called each time the reminder is triggered
gopherApp.onTrigger("remember", function(gopher) {
  memorizeSkill.memorizeTask(gopher); // ⬅ Invoke skill to continue memorizing
  gopher.webhook.quickResponse("An email with decreasing frequency");
});
```

### Publishing Skills

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

Skills added to the `gopher.skills` object via middleware should be camelCased version of their skill name (ie, `gopher.skills.skillName`). They should also be invokable with no parameters.

```javascript
gopher.skills.memorize.memorizeTask();
```

Add additional options by passing a configuration object:

```javascript
gopher.skills.memorize.memorizeTask({ frequencyPref: 0.1 });
```

This method signatures the makes for a simple, consistent developer experience and maintains the metaphor of our gopher being ordered around.

### Sharing UI Elements

Skills can render UI elements by returning [JSON UI elements](https://docs.gopher.email/docs/email-ui-reference). For example, our memorizaiton skill has a UI element that changes the memorizaiton frequency.

By convention, methods that render UI elements start with `render`. For example, `renderMemorizationControls`.

```javascript
  var memorizeSkill = require("gopher-memorize")(gopherApp);
  gopherApp.onCommand("remember", function(gopher) {
    gopher.webhook.addEmail({
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
  }
```

### Activating Skills

A skill becomes "activated" the moment it is required.

```javascript
var memorizeSkill = require("gopher-memorize")(gopherApp);
```

From this point on, its handlers and middleware are active.

If a skill requires configuration, a second, config object can be passed:

```javascript
var memorizeSkill = require("gopher-memorize")(gopherApp, config);
// optional config object would be defined by each skill
```

## Using Express.js Middlware and Routes

GopherApp is a wrapper for an instance of Express.js. The Express.js `app` object is available for use at `gopherApp.app`. This allows your sharable skill to do anything that can be done with Express: Authentiate other services, interact with APIs, respond to webhooks and render web pages.

### Adding to gopher.skills with middlware

The `gopher` object passed into your handlers can be modified with middlware. Internally, GopherApp uses middlware to pre-load the `gopher` object with with various functions. You can take this further. For example:

```javascript
// Configure a logging object
gopherApp.app.use(function(req, res, next) {
  var gopher = res.locals.gopher; // gopher object lives here
  var logger = require("./logger");
  logger.setup({ key: "123" });

  // configure and add our custom logger skill
  gopher.skills.myCustomSkill.logger = logger.config({ key: "123" });
  next(); // Don't forget this!
});

gopherApp.onCommand("hi", function(gopher) {
  // The configured skill is available in subsequent handlers
  gopher.skills.myCustomSkill.logger.log("Log with my pre-configured logger");
});
```

For some cases (loggers, configuraed object) passing a skill via via gopher.skills can come in handy. For most cases, explicitly `require` your skills to make your code more self-documenting.

Note that middleware runs for _all_ requests. Run the middleware for only certain cases like this:

```javascript
gopherApp.app.use(function(req, res, next) {
  // Only execute middleware for webhooks that have the word `task` in them
  const taskWebhook =
    gopher.get("event") && !gopher.get("event").includes("task");
  if (!gopher.isWebhook || !taskWebhook) {
    return next();
  }
  // your logic here
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
gopherApp.app.get("/hi", function(req, res) {
  res.send("<h1>Hi http request!</h1>");
});
```

### Install Flow

When the extension has just been installed, the user will be directed to the `welcome` settings URL. Create a settings form with the namespace `welcome` to welcome the new user. Ex:

Note: When your extension is in `dev_mode` the extension owner is automatically directed to the sandbox.

## Testing

Export a testable instance of your Gopher app by calling `gopherApp.exportApp()` instead of calling `gopherApp.listen()`. Below is an example of testing the exported app with [Supertest](https://www.npmjs.com/package/supertest).

Note: Set `NODE_ENV` to `testing` to disable webhook validation.

```javascript
const request = require("supertest");
const mocha = require("mocha");
const expect = require("chai").expect;
const GopherApp = require("gopher-app");
let gopherApp; // re-instantiated before each test

// Utility function to send webhook to our app
function sendWebhook({ app, webhookJson }) {
  return request(app)
    .post("/webhooks")
    .set("Accept", "application/json")
    .send(webhookJson);
}

describe("integration tests", function() {
  beforeEach(function() {
    gopherApp = new GopherApp({ clientId: "foo", clientSecret: "bar" });
  });

  it("responds correctly to a webhook", async function() {
    const gopherApp = new GopherApp({ clientId: "foo", clientSecret: "bar" });

    // set up handlers
    gopherApp.onCommand("memorize", gopher => {
      gopher.webhook.quickReply("I dig email");
    });

    const app = gopherApp.exportApp();
    const webhookJson = require("./_fixtures/task.created.json");
    let { body } = await sendWebhook({ app, webhookJson });

    // Test our webhook response
    expect(body.send_messages[0].subject).to.equal("I dig email");
  });
});
```

## Installing

The setup process from gopher.email creates a pre-installed instance of Gopher App using [Glitch](https://glitch.com/) to get started quickly.

Here are install instructions for local development or production deployments:

**1. Install**

- `mkdir my-skill`
- `npm install gopher-app`
- `touch app.js`

**2. Add handlers**

```javascript
var GopherApp = require("GopherApp");
var gopherApp = newGopherApp();

//handlers, etc as above go here

gopherApp.listen();
```

**3. Configure**

Create an .env file with these options (which you can find in your extension details page). Use something like [dotenv](https://www.npmjs.com/package/dotenv') to load them:

```
CLIENT_ID=
CLIENT_SECRET=
SCOPE=
EXTENSION_URL=
REDIRECT_URI=
EXT_ID=
```

You can also pass a config object to GopherApp to override any settings within `lib/config-defaults.js`.

**4. Connect Gopher + Your Code**

Gopher needs to send HTTP POSTs to your extension, which means it will need a public URL. For local development, you can use use something like [ngrok](https://ngrok.com/).

Once you have your public URL, go back go app.gopher.email and adjust your settings to point to your install.

**5. Install and Start**

Authenticate your extension with Gopher by visiting http://your-extension-url/auth/login. If your extension is still in "dev mode", you'll end up on the Sandbox, which should look familiar.

## Design Philosophy

Gopher App was created with two types of developers in mind:

1.  "Low-Code" developers that want to throw together an extension as quickly as possible.
2.  More experineced skill developers that wish to encapsulate some complex task as an easy-to-use Gopher Skill.

For category 1, we employ the metaphorical gopher to invoke skills that "just work". Code is deliberately hidden. Sensible defaults are used so the user's first-time use makes sense. The conceptual model for this user is a lovable rodent that digs tunnels and gets things done for you. What's not to like?

For category 2, the more experience user, we don't try to hide Gopher App's internals. Gopher App is, essentially, an Express middleware stack along with some conventions to load and share this middlware – a familiar stack for most experienced Node.js developers.

## Contributions

Contributions are welcome in the form of PRs and / or Github tickets for issues, bugs, ideas and feature requests.
