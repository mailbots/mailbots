# Gopher App

GopherApp is the open-source counterpart to Gopher.email. It provides an easy-to-use framework to create, add and an install 3rd party Gopher "skills" that get things done with email.

## Quick Start

Go through the extension setup process at gopher.email. This will provide a working, authenticated instance of GopherApp in under a minute. (See below for local install instructions).

Then, add a skill.

Let's tell what Gopher what do to when it receives the [email command](https://docs.gopher.email/reference#section-email-commands) "hi":

```javascript
var GopherApp = require("gopher-app");
var gopherApp = new GopherApp();

// When someone emails: hi@your-extension.gopher.email, respond "Hello world!"
gopherApp.onCommand("hi", function(gopher) {
  gopher.webhook.addQuickReply("Hello world!");
  gopher.webhook.respond();
});

gopherApp.listen();
```

Anyone on any email platform, anywhere in the world can use this email command. There is nothing new to install – it's just email!

### Overview

Gopher.email helps you get things done without leaving your email, like an exceptionally skilled lovable rodent that digs tunnels from your inbox to your other systems.

**Core API**
The Gopher.email core API provides core email APIs for sending email, receiving and parsing email, storing data, and setting reminders.

**Extensions**
Creating a Gopher Extension grants developer access to Gopher's Core APIs, allowing someone to create an email-only utility (like followupthen.com). Extensions, are set up to be publishable, but they can also be kept private.

**Skills**
Extensions are composed of one or more "skills". GopherApp (this project) provides a framework to create and install skills that accomplish specific email-based tasks. For example:

- Telling Gopher how to respond to an email address to your extension
- Rendering a set of email UI elements
- Parsing email
- Submitting data to CRMs, project management systems, etc
- Scheduling team email reminders
- Tracking a team todo item

Skills can register "handlers" (ie, functions that tell Gopher what to do when certain events occur), respond to emails or just provide components to other other skills.

## Handlers, Reminder Example

The first handler creates the reminder. The second one handles the reminder when it becomes due.

```javascript
// Inside app.js
// Schedule "task.triggered to fire in 1 minute
var GopherApp = require("gopher-app");
var gopherApp = new GopherApp();

gopherApp.onCommand("hi", function(gopher) {
  gopher.webhook.setTriggerTime("1min");
  gopher.webhook.respond();
});

// Handle task.triggered event when it happens
gopherApp.on("task.triggered", function(gopher) {
  gopher.webhook.addQuickReply("Hi 1 minute later!");
  gopher.webhook.respond();
});

gopherApp.listen();
```

## Handlers: An Action Email Example

Here an example of handling
an [Action Email](https://docs.gopher.email/reference#email-based-actions).

The interaction would start with emailing `hi-example@your-ext.gopher.email`. This email would render a button to `Say Hi` which, when clicked, would trigger an action email.

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
    gopher.webhook.respond();
  });

  gopherApp.listen();
```

## Organizing Skills

Skills can have multiple handlers (like in the last examples). To keep things organized, we can group a collection of skill handlers into their own files, and group multiple files for a skill into a directory. For example:

```javascript
// In my-new-reminder-skill.js, wrap your code like this:
module.exports = function(gopherApp) {
  // Same code as previous example
  // gopherApp.onCommand("hi", function(gopher) {}
  // gopherApp.on("task.triggered", function(gopher) {}
};
```

Then load your skill file like this:

```javascript
require("./my-new-skill")(gopherApp);
```

There is also a helper method that makes it easy to load groups of skills:

```javascript
// Install all skills in a directory (but not its directories)
gopherApp.loadSkill(__dirname + "/my/skills/");
```

Note that this does not load skills in subdirectories. This lets you use the subdirectories for libs, tests and sub-skills that only are needed in certain places.

## Composing Skills

Gopher Skills are easier to write when they are organized into self-contained components containing everything needed to accomplish a function: UI elements, events handlers, settings, even authenticating with 3rd party APIs.

Here is our previous example, encapsulated a simple, isolated skill:

```javascript
// hi-skill.js (Self-contained)
module.exports = function(gopherApp) {
  // Handle UI events
  gopherApp.onAction("say.hi", function(gopher) {
    gopher.webhook.quickReply("hi");
    gopher.webhook.respond();
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

Use our isolated skill in any other component like this:

```javascript
// This gets the UI buttons and also activates its handler
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

Isolating skills as components has the side-benefit of making them easily sharable with others.

## Installing and Using 3rd Party Skills

Skills can make use of other skills. Let's install one from npm.

You would furst run `npm install --save gopher-memorize` in your CLI.

The `gopher-memorize` skill sets reminders for any task using [spaced repetition](https://www.wikiwand.com/en/Spaced_repetition), a memorization technique that increases the time between reminders as more reminders are sent.
We are going to use that to create a custom "remember" command for our Gopher App.

```javascript
// In main app.js file
var memorizeSkill = require("gopher-memorize")(gopherApp);

gopherApp.onCommand("remember", function(gopher) {
  memorizeSkill.memorizeTask(gopher); //  ⬅ Tells Gopher to memorize your task
  gopher.webhook.quickResponse("Memorizing!");
  gopher.webhook.respond();
});

// Called each time the reminder is triggered
gopherApp.on("task.triggered", function(gopher) {
  memorizeSkill.memorizeTask(gopher); // ⬅ Gopher continues to memorize
  gopher.webhook.quickResponse("An email with decreasing frequency");
  gopher.webhook.respond();
});
```

### Rendering UI Components

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

When a skill is required as shown it is "activated".

```javascript
var memorizeSkill = require("gopher-memorize")(gopherApp);
```

Its handlers and middleware (more on this below) become active from this point forward in the request.

If a skill requires configuration, a second, config object can be passed:

```javascript
var memorizeSkill = require("gopher-memorize")(gopherApp, config);
```

## Using Express.js Middlware and Routes

GopherApp wraps an instance of Express.js. The Express.js `app` object is available for use at `gopherApp.app`, which allows your sharable skill to do anything that can be done with Express: Authentiate with APIs, respond to webhooks and render web pages.

### Adding to gopher.skills with middlware

The `gopher` object passed into your handlers can be modified with middlware. Internally, GopherApp actually uses middlware to pre-load this object with with useful various functions. You can take this further. For example:

```javascript
// Configure logging object
gopherApp.app.use(function(req, res, next) {
  var gopher = res.locals.gopher; // the gopher object is available here
  var logger = require("./logger");
  logger.setup({ key: "123" });

  // add our custom logger skill to the Gopher object
  gopher.skills.myCustomSkill.logger = logger;
  next(); // Don't forget this!
});

// Anywhere afterwards..
gopherApp.onCommand("hi", function(gopher) {
  gopher.skills.myCustomSkill.logger.log("Log with my pre-configured logger");
});
```

Explicitly `require` your skills to make your code more self-documenting. For some cases (loggers, configuraed object) passing a skill via via gopher.skills can come in handy.

Finally, an important note from Express.js:

> Middleware is like a plumbing pipe: requests start at the first middleware function defined and work their way “down” the middleware stack processing for each path they match.

> They [middleware handlers] are invoked sequentially, thus the order defines middleware precedence. For example, usually a logger is the very first middleware you would use, so that every request gets logged.

In short, make sure you load your middlware before using it in a handler.

### Handling routes

Easily handle http routes just as with [Express.js routes](https://expressjs.com/en/guide/routing.html):

```javascript
gopherApp.app.get("/hi", function(req, res) {
  res.send("<h1>Hi http request!</h1>");
});
```

Http route handling lets your extension contain its own authentication / login workflows even serve its own publicly accessible pages.

## Testing

Export your gopher app by calling `gopherApp.exportApp()` instead of calling `gopherApp.listen()`. This gives you a testable instance of the Express App that Gopher builds, which can be used with any number of existing testing frameworks, for example, [Supertest](https://www.npmjs.com/package/supertest).

## Setup on Other Hosts

If you went through the setup process on gopher.email, GopherApp comes pre-configured using Glitch. This is a great way to get started.

If you are setting it up elsewhere (for example, for local development, or when you'd like to make your extension live), you can set up another environment easily:

### 1. Install

- `mkdir my-skill`
- `npm install gopher-app`
- `touch app.js`

### 2. Add minimal code

```javascript
var GopherApp = require("GopherApp");
var gopherApp = newGopherApp();

//handlers, etc as above go here

gopherApp.listen();
```

### 3. Configure

Create an .env file with these options (which you can find in your extension details page) and use [dotenv](https://www.npmjs.com/package/dotenv') to load them:

```
CLIENT_ID=
CLIENT_SECRET=
SCOPE=
EXTENSION_URL=
REDIRECT_URI=
EXT_ID=
```

You can also pass a config object to GopherApp to override any settings within `lib/config-defaults.js`.

### 4. Connect Gopher + Your Code

Gopher needs to send HTTP POSTs to your extension, which means it will need a public URL. For local development, you can use use something like [ngrok](https://ngrok.com/).

Once you have your public URL, go back go app.gopher.email and adjust your settings to point to your install.

### 5. Install and Start

Authenticate your extension with Gopher by visiting http://your-extension-url/auth/login. If your extension is still in "dev mode", you'll end up on the Sandbox, which should look familiar.

## Naming Conventions

If you are planning to share your skill with others, there are a few naming conventions that can improve your skill's usability:

Try to use the same unique string (ex: "skill-name") for:

- If you publish your skill to npm, name the module "gopher-skill-name"
- The name of the skill on the gopher object, camelCased. For example `gopher.skills.skillName`
- Preface your event names, commands and actions with your skill name, or an
  abbreviation if it is long (due to character limitations in the part of
  of email addresses before the @ sign)
- When storing data against the task or extension, put your skill data
  in an object with a key of this same name.

Using these conventions improves usability and trackability of your extension.

### Skill naming conventions.

This applies only to skills that are added to the `gopher.skills` object via middleware.

By convention, skills should be invokable with sensible defaults by calling them with no parameters.

```javascript
gopher.skills.memorize.memorizeTask();
```

Call a skill with additional options by passing a configuration object:

```javascript
gopher.skills.memorize.memorizeTask({ frequencyPref: 0.1 });
```

This method signatures the makes for a simple, consistent developer experience and keeps the metaphor of our (literal) gopher being ordered around.

## Design Philosophy

Gopher App was created with two types of developers in mind:

1.  "Low-Code" developers that want to throw together an extension as quickly as possible.
2.  More experineced skill developers that wish to encapsulate some complex task as an easy-to-use Gopher Skill.

For category 1, we employ the metaphorical gopher to invoke skills that "just work" with a single, intuitive command. Code is deliberately hidden from this type of user. Sensible defaults are used for skills so the user's first-time-use is a positive experience. The conceptual model for this user is a lovable rodent that digs tunnels and gets things done for you. What's not to like?

For category 2, the more experience user, we don't try to hide Gopher App's internals. Gopher App is, essentially, an Express middleware stack along with some conventions to load and share this middlware. This familiar environment makes skill authoring a breeze for more experienced developers.

## Contributions

Contributions are welcome in the form of PRs and / or Github tickets for issues, bugs, ideas and feature requests.
