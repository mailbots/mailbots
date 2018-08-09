# Gopher App

Gopher.email helps you get things done without leaving your email, like an exceptionally skilled little rodent that digs tunnels from your inbox to
all your other systems.

Gopher App allows you to easily create and install Gopher skills that accomplish things no gopher should ever be able to do. For example:

- Parse emails and submit them to CRMs, project management systems, etc
- Schedule email-based reminders
- Track tasks via email
- Create email-based internal tools
- Coordinate group activities

## Quick Start

First, create a Gopher Extension at gopher.email. You'll get an email domain
that looks something like this: `{command}@your-ext.gopher.email` (`{command}`
can be anything), and a working install of this lib available at a publicly
accessible URL.

Then, add a skill. For example, let's tell what Gopher what do to when
it receives the [email command](https://docs.gopher.email/reference#section-email-commands) "hi",
ie, hi@your-ext.gopher.email.

### Example 1: A Simple Response

```javascript
// require("dotenv").config(); // Uncomment if you running outside Glitch
var GopherApp = require("gopher-app");
var gopherApp = new GopherApp();

// This is a Gopher Skill
gopherApp.onCommand("hi", function(gopher) {
  gopher.webhook.addQuickReply("Hi back!");
  gopher.webhook.respond();
});

gopherApp.listen();
```

Now, if anyone emails `hi@your-ext.gopher.email` they will get a response! (Side-note: "Anyone" means anyone with an email address. A lot of people can use your email-only utility without installing anything new).

Think of the `GopherApp` above like a container for numerous gophers, each having special skills to handle email-related actions.

### Example 2: A Reminder

Here is another example, this one having two parts:
Scheduling a reminder and handling a reminder:

```javascript
// Inside app.js
// Schedule "task.triggered to fire in 1 minute
gopherApp.onCommand("hi", function(gopher) {
  gopher.webhook.setTriggerTime("1min");
  gopher.webhook.respond();
});

// Handle task.triggered event when it happens
gopherApp.on("task.triggered", function(gopher) {
  gopher.webhook.addQuickReply("Hi 1 minute later!");
  gopher.webhook.respond();
});
```

# Example 3: Installing Skills

Skills can make use of other skills. For example, the `gopher-memorize` skill
sets reminders for a task using spaced repetition, a memorization technique that increases
the time between reminders as more reminders are sent. This skill can be used within
any other skill. For example...

Run `npm install --save gopher-memorize` in your CLI, then..

```javascript
// In main app.js file
var gopherMemorize = require("gopher-memorize");
gopherApp.loadSkill(gopherMemorize);

gopherApp.onCommand("remember", function(gopher) {
  gopher.skills.memorize.memorizeTask(); //        ⬅ Gopher can now memorize
  gopher.webhook.quickResponse("Memorizing!");
  gopher.webhook.respond();
});

gopherApp.on("task.triggered", function(gopher) {
  gopher.skills.memorize.memorizeTask(); //        ⬅ Gopher continues to memorize
  gopher.webhook.quickResponse("An email with decreasing frequency");
  gopher.webhook.respond();
});
```

## Organizing Skills

Because skills can have multiple handlers (like the reminder examples),
it often makes sense to put skills into in their own file. GopherApp can then
load your skill.

```javascript
// In app.js
gopherApp.loadSkill(__dirname + "/skills/my-skill.js");
```

```javascript
// In my-reminder-skill.js
module.exports = function(gopherApp) {
  // Same code as Example 2
  gopherApp.onCommand("hi", function(gopher) {
    gopher.webhook.setTriggerTime("1min");
    gopher.webhook.respond();
  });

  gopherApp.on("task.triggered", function(gopher) {
    gopher.webhook.addQuickReply("Hi 1 minute later!");
    gopher.webhook.respond();
  });
};
```

Load all skills in a directory like this.

```javascript
// In app.js
gopherApp.loadSkill(__dirname + "/skills");
```

More details on this below.

Skills can have:

- UI components (Ex, rendering buttons)
- Global event handlers (Ex, always handle )
- Commands to operate on the task

For examples

// End-User Examples Showing each...

## Loading Skills

Skills can can be loaded in different ways:

```javascript
// Install from npm..
var gopherMemorize = require("gopher-memorize");
gopherApp.loadSkill(gopherMemorize);

// Install from file
gopherApp.loadSkill(__dirname + "/path/to/my_skill.js");

// Install all skills in a directory (but not its directories)
gopherApp.loadSkill(__dirname + "/my/skills/");
```

[Express terminolory: A skill is a function that can add routes to
gopherApp, and appends functionality onto the gopher object]

The event handler can handle the events created by the UI portion. For example,
if email-based actions are rendered, the event handlers would handle the actions.

You can install 3rd party skills with just a couple lines of code.

```javascript
// in app.js
// Install a skill from npm (ie, npm install memorize)
const memorizeSkill = require("memorize");

 // Load the skill
 gopherApp.use(memorizeSkill());

 gopherApp.onCommand('remember', function(gopher) {
  gopher.skills.memorize.memorizeTask(); <- A handy new skill!
   gopher.webhook.respond();
 });
```

## Setting up outside Glitch

If you went through the setup process on gopher.email, GopherApp has already been configured.
If you are setting it up elsewhere, you can set up your own environment. You can also pass configuration
options in `gopherApp = new GopherApp(options)` or you can set the following environment variables.
You can use [dotenv](https://www.npmjs.com/package/dotenv) or some similar tool load your environment.

```
CLIENT_ID=
CLIENT_SECRET=
SCOPE=
EXTENSION_URL=
REDIRECT_URI=
EXT_ID=
```

# Skill Authoring

Creating a new Gopher Extension consists of composing 3rd party skills into a new Gopher Skill. These Gopher Skills can, in turn, be published and shared
with others.

- UI components
- Global event handlers
- Commands to operate on the task

```javascript
module.exports = function(gopherApp) {
  //   gopherApp.use(require("gopher-confirmation-emails")());

  /**
   Add Cancel Button to UI Middlware
   */
  gopherApp.use(function(req, res, next) {
    const gopher = res.locals.gopher;
    gopher.skills.memorize.cancel = {
      type: "button",
      action: "task.cancel",
      text: "Cancel",
      subject: "Hit 'send' to cancel this task'"
    };
    next();
  });

  /**
   * Handle Cancellation Event
   */
  gopherApp.onAction("task.cancel", function(gopher) {
    gopher.webhook.completeTask();
    // if (gopher.skills.confirmationEmails.on) {
    //   gopher.skills.confirmationEmails.email("Task Completed");
    // }
    gopher.webhook.respond();
  });
};
```

## Skill Order Matters

When a skill depends on an another skill being already loaded, you can
explicitly load the dependent skill, even if it was loaded previously in an earlier skill. This makes your skill more portable, durable and self-documenting.

```javascript
// Be explicit about dependent skills, even if you seem repetative
gopherApp.loadSkill(__dirname + "./dependentSkill.js");
```

## Loading Skill Sets

Load all skills in a directory using `gopherApp.loadSkill()`. This does NOT recursively load skills from subdirectories. These are reserved for libs, tests or other sub-skills that can be loaded by the skill.

```javascript
// Be explicit about dependent skills, even if you seem repetative
gopherApp.loadSkill(__dirname + "./dependentSkill.js");
```

## Middleware

Gopher App uses Express.js. If you are not familiar with Express it would be good to get a [brief introduction](https://expressjs.com/), then have a look at [using middleware](https://expressjs.com/en/guide/using-middleware.html) and [writing middleware](https://expressjs.com/en/guide/writing-middleware.html).

https://expressjs.com/en/api.html

> Middleware is like a plumbing pipe: requests start at the first middleware function defined and work their way “down” the middleware stack processing for each path they match.

> The order in which you define middleware with router.use() is very important. They are invoked sequentially, thus the order defines middleware precedence. For example, usually a logger is the very first middleware you would use, so that every request gets logged.

A Gopher is, essentially, middleware that adds additional functionality to the
`gopher` object that is passed with the the handler functions.

```javascript
gopherApp.onCommand("test-skill", function(gopher) {
  gopher.skills.amazingNewSkillset.doit(); // <-- Your skills are added to the gopher.skills object
});
```

## Writing Portable Skills

A Gopher Skill can be written as an isolated component that contains everything it needs to accomplish a task for the user – UI elements, events handlers, settings, even authentication.

```javascript
// Show task cancelled example
```

The UI-skill portion of a skill can be used by later skills, allowing for a component-based composition of skills. For example...

```javascrsipt
Show example of skill.task.handler
New skill
// gopher.skills.newComponent  // <-- UI Elements are composable!
```

The handler / controllers for those components exist globally, so name your events thoughtfully.

```javascript
gopherApp.onCommand("task.cancelled", function(gopher) {}); // global event
```

## Naming Conventions

- If you are planning ot share your skill with others, there are a few naming convnetions that can
- improve your skill's usability:
- - Register an extension dedicated your published skill.
- - Try to use the same unique string (ex: "skill-name") for:
-     * Your skill / extension's subdomain. (skill-name.gopher.email)
-     * The name of the skill on the gopher object, camelCased. For example `gopher.skills.skillName`
-     * If you publish your skill to npm, name the module "gopher-skill-name"
-     * Preface your event names, commands and actions with your skill name, or an
-       abbreviation if it is long (due to character limitations in the part of
-       of email addresses before the @ sign)
-
- Following this convention allows someone to use and see track skill's activity in their extension
- Sandbox by name.

## TODO

- [ ] loadSkills() should load a file or directory

## Design Philosophy

Gopher App was created with two types of developers in mind:

1.  "Low-Code" developers that want to throw together an extension as quickly as possible.
2.  More experineced skill developers that wish to encapsulate some complex task as an easy-to-use Gopher Skill.

For category 1, we employ the metaphorical gopher to cancapsulate skills that "just work" with
a single, intuitive command. Code is deliberately hidden from this type of user. Sensible defaults are used for
skills so the user's first-time-use is a positive experience. The conceptual model for this user is a lovable rodent that digs tunnels and gets things done for you. What's not to like?

For category 2, the more experience user, we don't try to hide Gopher App's internals. Gopher App is,
essentially, an Express middleware stack along with some conventions to load and share this middlware. This
familiar environment makes skill authoring a breeze for more experienced developers.

## Testing

A testable Gopher App, complete with all your custom handlers and skills, can
be exported for use in any number of testing frameworks by calling `gopherApp.exportApp()`. Call this instead of `listen`, then run it through your testing framework.
