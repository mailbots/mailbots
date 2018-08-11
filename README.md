# Gopher App

Gopher.email helps you get things done without leaving your email, like an exceptionally skilled little rodent that digs tunnels from your inbox to all your other systems.

GopherApp is the open-source counterpart to Gopher.email. It provides an easy-to-use framework to create, add and an install 3rd party Gopher "skills" that get things done with email.

Skills can include:

- Parsing emails and submitting them to CRMs, project management systems, etc
- Scheduling email-based reminders
- Tracking tasks and todos via email
- Creating email-based internal tool
- Coordinate team projects and actions

The Gopher.email core API provides core email APIs for handling email, storing data and setting reminders. GopherApp provides a framework for an ecosystem of skills that can be created, installed and shared with others.

## Quick Start

Go through the extension setup process at gopher.email. This will provide a working, authenticated instance of GopherApp in under a minute. (See below for local install instructions).

Then, add a skill.

### Example 1: A Simple Response

Let's tell what Gopher what do to when
it receives the [email command](https://docs.gopher.email/reference#section-email-commands) "hi":

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

Your email command and skill handler is live and available to anyone on any platform, anywhere in the world with nothing new to install. It's just email.

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

Think of the `gopherApp` variable like a container for numerous gophers, each having special skills to handle specific email-related actions.

## Example 3: Installing Skills

Your skills can make use of other skills. For example, the `gopher-memorize` skill
sets reminders for a task using [spaced repetition](https://www.wikiwand.com/en/Spaced_repetition), a memorization technique that increases the time between reminders as more reminders are sent.

Run `npm install --save gopher-memorize` in your CLI, then..

```javascript
// In main app.js file
var gopherMemorize = require("gopher-memorize");
gopherApp.loadSkill(gopherMemorize);

gopherApp.onCommand("remember", function(gopher) {
  gopher.skills.memorize.memorizeTask(); //        ⬅ Gopher has memorization skills
  gopher.webhook.quickResponse("Memorizing!");
  gopher.webhook.respond();
});

gopherApp.on("task.triggered", function(gopher) {
  gopher.skills.memorize.memorizeTask(); //        ⬅ Gopher continues to memorize
  gopher.webhook.quickResponse("An email with decreasing frequency");
  gopher.webhook.respond();
});
```

## Loading Skills

Because a single skill can have multiple handlers (like in the last two examples),
it makes sense to separate skills into in their own files.

```javascript
// Put your skill in its own file...

// In my-reminder-skill.js
module.exports = function(gopherApp) {
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

```javascript
// In main-line app.js, we can load our skill
gopherApp.loadSkill(__dirname + "/skills/customMemorySkill.js");
gopherApp.onCommand("hi", function(gopher) {
  // your custom skill is already available here
});
```

Load all skills in a directory (a skillset) like this:

```javascript
// Install all skills in a directory (but not its directories)
gopherApp.loadSkill(__dirname + "/my/skills/");
gopherApp.onCommand("hi", function(gopher) {
  // gopher has all skills in the skills directory
});
```

You can create complex skills by loading and organizing simpler skills, each of which may,
themselves also load its own skills.

### Rendering UI

Skills can render UI elements. For example, our memorizaiton
skill has a UI element that changes the memorizaiton frequency.

```javascript
  // the memorize skill has already been loaded
  gopherApp.onCommand("remember", function(gopher) {
    gopher.webhook.memorize.memorizeTask();
    gopher.webhook.addEmail({
      to: gopher.get('source.from')
      from: "Memory Maker",
      subject: gopher.get('source.subject'),
      body: [
        {
          type: 'title',
          text: 'memorizing' + gopher.get('source.subject')
        },

        // UI Components in a Gopher skill
        ...gopher.webhook.memorize.renderMemorizationControls()
      ]
    })
  }
```

### Handling UI Events

Skills can handle the UI events they create. Here an example of handling
an [Action Email](https://docs.gopher.email/reference#email-based-actions):

```javascript
  gopherApp.onCommand("remember", function(gopher) {
    gopher.webhook.memorize.memorizeTask();
    gopher.webhook.addEmail({
      to: gopher.get('source.from')
      from: "Memory Maker",
      subject: gopher.get('source.subject'),
      body: [
        {
          type: 'title',
          text: 'memorizing' + gopher.get('source.subject')
        },

        // An email based action
        {
          type: "button",
          text: "Cancel Reminder",
          action: 'memorize.off',
          subject: "Hit Send to Cancel this reminder"
        }
      ]
    })
  };

  // Handle our "Cancel Reminder" event created by our UI above
  gopherApp.onAction('memorize.off', function(gopher) {
    gopher.webhook.completeTask();
    gopher.webhook.respond();
  });
```

### Different Forms of Skills

Skills can:

- Add make UI elemnts

```javascript
gopherApp.onCommand("test-skill", function(gopher) {
  gopher.skills.amazingNewSkillset.doit(); // <-- Your skills are added to the gopher.skills object
});
```

## Skill-Based Thinking

A Gopher Skill can be written as an isolated component that contains everything it needs to accomplish a task for the user – UI elements, events handlers, settings, even authenticating with
3rd party APIs during installation.

Complex skills by creating and composing simpler skills.

This "component-based" structure has the side-benefit of making skills that you created easily sharable with others.

Let's take the last example and make a self-contained "Cancel Reminder" button, with all logic built-in.

```javascript
// In a separate file just for this component: Ex: cancel-button.js
// Add the UI element:
var cancelButton = {
  type: "button",
  text: "Cancel Reminder",
  action: "memorize.off",
  subject: "Hit Send to Cancel this reminder"
};

// Add button to the Gopher object (This is Express Middleware syntax..more on this below)
gopherApp.use(function(request, response, next) {
  var gopher = response.locals.gopher;
  gopher.skills.mySkillName.cancelButton;
  next();
});

// Handle our "Cancel Reminder" event created by our UI above
gopherApp.onAction("memorize.off", function(gopher) {
  gopher.webhook.completeTask();
  gopher.webhook.respond();
});
```

Now we can drop in our isolated "cancel button skill" within any handler that has our skill and it will Just Work.

```javascript
  // Use the "Cancel Button" skill anywhere
  gopherApp.onCommand("remember", function(gopher) {
    gopher.webhook.memorize.memorizeTask();
    gopher.webhook.addEmail({
      to: gopher.get('source.from')
      from: "Memory Maker",
      subject: gopher.get('source.subject'),
      body: [
        {
          type: 'title',
          text: 'memorizing' + gopher.get('source.subject')
        },

        // The same UI button. All logic self-contained
        gopher.skills.mySkill.cancelButton
      ]
    })
  };
```

## Testing

Export your gopher app by calling `gopherApp.exportApp()` instead of calling `gopherApp.listen()`. This gives you a testable instance of the Express App that Gopher builds, which can be used with any number of existing testing frameworks, like Supertest.

## Skill Order Matters

You can only use a skill after it has been loaded. When a skill depends on an another skill being already loaded, you should explicitly load the dependent skill (even if it was loaded previously). This makes your skill more portable, durable and self-documenting.

```javascript
// Be explicit about dependent skills, even if you seem repetative
gopherApp.loadSkill(__dirname + "./dependentSkill.js");
```

Side-note: under the hood, Gopher uses a pattern called "Middleware". To quote the Express.js documentation (the framework with which GopherApp is created):

> Middleware is like a plumbing pipe: requests start at the first middleware function defined and work their way “down” the middleware stack processing for each path they match.

> They [middleware handlers] are invoked sequentially, thus the order defines middleware precedence. For example, usually a logger is the very first middleware you would use, so that every request gets logged.

### Loading Skill Directory Does Not Load Subdirectory's Skills

Load all skills in a directory using `gopherApp.loadSkill()`. This does NOT load skills from subdirectories. Subdirectories can be used for libs, tests or sub-skills that need to be loaded in a specific order.

## Installation

If you went through the setup process on gopher.email, GopherApp has already been configured.
If you are setting it up elsewhere, setting up you your own environment as follows:

- create a directory
- `npm install gopher-app`
- `touch app.js`

  ```javascript
  var GopherApp = require("GopherApp");
  var gopherApp = newGopherApp();

  //handlers, etc as above go here

  gopherApp.listen();
  ```

- Create an .env file with these options (which you can find in your extension details page) and use [dotenv](https://www.npmjs.com/package/dotenv') to load them:

  ```
  CLIENT_ID=
  CLIENT_SECRET=
  SCOPE=
  EXTENSION_URL=
  REDIRECT_URI=
  EXT_ID=
  ```

  You can also pass a config object to GopherApp.

- `node app.js`
- For local development, use [ngrok](https://ngrok.com/) to expose a public URL to a local port.

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

## Design Philosophy

Gopher App was created with two types of developers in mind:

1.  "Low-Code" developers that want to throw together an extension as quickly as possible.
2.  More experineced skill developers that wish to encapsulate some complex task as an easy-to-use Gopher Skill.

For category 1, we employ the metaphorical gopher to cancapsulate skills that "just work" with
a single, intuitive command. Code is deliberately hidden from this type of user. Sensible defaults are used for skills so the user's first-time-use is a positive experience. The conceptual model for this user is a lovable rodent that digs tunnels and gets things done for you. What's not to like?

For category 2, the more experience user, we don't try to hide Gopher App's internals. Gopher App is,
essentially, an Express middleware stack along with some conventions to load and share this middlware. This familiar environment makes skill authoring a breeze for more experienced developers.
