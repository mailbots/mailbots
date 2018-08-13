# Gopher App

Gopher.email helps you get things done without leaving your email, like an exceptionally skilled little rodent that digs tunnels from your inbox to all your other systems.

GopherApp is the open-source counterpart to Gopher.email. It provides an easy-to-use framework to create, add and an install 3rd party Gopher "skills" that get things done with email.

Skills can include:

- Parsing emails and submitting them to CRMs, project management systems, etc
- Scheduling email-based reminders
- Tracking tasks and todos via email
- Creating email-based internal tool
- Coordinate team projects and actions

The Gopher.email core API provides core email APIs for handling email, storing data and setting reminders. GopherApp provides the framework for an ecosystem of skills that can be created, installed and shared with others.

## Quick Start

Go through the extension setup process at gopher.email. This will provide a working, authenticated instance of GopherApp in under a minute. (See below for local install instructions).

Then, add a skill.

## Example 1: A Simple Response

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

Anyone on any email platform, anywhere in the world can use this email command. There is nothing new to install – it's just email.

## Example 2: A Reminder

The first handler creates the reminder. The second one handles the reminder when it becomes due.

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

Think of the `gopherApp` variable like a container for numerous gophers, each having special skills to handle email-related actions.

## Example 3: Installing Skills

Skills can make use of other skills. Let's install one from npm.

Run `npm install --save gopher-memorize` in your CLI, then..

The `gopher-memorize` skill sets reminders for any task using [spaced repetition](https://www.wikiwand.com/en/Spaced_repetition), a memorization technique that increases the time between reminders as more reminders are sent.
We are going to use that to create a custom "remember" command for our Gopher App.

```javascript
// In main app.js file
var gopherMemorize = require("gopher-memorize");
gopherApp.loadSkill(gopherMemorize);

gopherApp.onCommand("remember", function(gopher) {
  gopher.skills.memorize.memorizeTask(); //        ⬅ Gopher has memorization skills
  gopher.webhook.quickResponse("Memorizing!");
  gopher.webhook.respond();
});

// Called each time the reminder is triggered
gopherApp.on("task.triggered", function(gopher) {
  gopher.skills.memorize.memorizeTask(); //        ⬅ Gopher continues to memorize
  gopher.webhook.quickResponse("An email with decreasing frequency");
  gopher.webhook.respond();
});
```

## Loading Skills

Skills can have multiple handlers (like in the last two examples). To keep things organized, we can group a collection of skill handlers into a skill module.

```javascript
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

Load skills using `gopherApp.loadSkill()`

```javascript
// In main app.js, we can load our skill.
gopherApp.loadSkill(__dirname + "/skills/customMemorySkill.js");
```

You can also load all skills in a directory (a skillset):

```javascript
// Install all skills in a directory (but not its directories)
gopherApp.loadSkill(__dirname + "/my/skills/");
gopherApp.onCommand("hi", function(gopher) {
  // gopher has all skills in the skills directory
});
```

### Rendering UI

Skills can render UI elements. For example, our memorizaiton
skill has a UI element that changes the memorizaiton frequency.

```javascript
  // the memorize skill has already been loaded
  gopherApp.onCommand("remember", function(gopher) {
    gopher.skills.memorize.memorizeTask();
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
        ...gopher.skills.memorize.renderMemorizationControls()
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

### Latent vs. Active Skills

The above examples show two types of Gopher Skills.

#### 1. Active Skills

Active skills takes action the moment they are loaded. For example:

```javascript
// hello-world.js
module.exports = function(gopherApp) {
  gopherApp.onCommand("hi", function(gopher) {
    gopher.webhook.addQuickReply("Hello world!");
    gopher.webhook.respond();
  });
};
```

As soon as the above skill is loaded, it starts responding to webhooks.

```javascript
gopherApp.loadSkill(__dirname + "/hello-world.js");
```

#### 2. Latent Skills

Latent skills do nothign until they are invoked. Latent skills are added to `gopher.skills` for use within other handlers. For example:

```javascript
gopherApp.loadSkill(require("gopher-memorize"));
gopherApp.onCommand("hi", function(gopher) {
  gopher.skills.memorize.memorizeTask(); // Only starts memorizing when called
  gopher.webhook.addQuickReply("Hello world!");
  gopher.webhook.respond();
});
```

Reusable UI Elements are typically created as latent skills, as shown a few examples ago when when we called `...gopher.skills.memorize.renderMemorizationControls()`

## Composing Skills

You can create complex skills by loading and organizing simpler skills, each of which may, themselves also load their own skills.

A Gopher Skill can be written as an isolated component that contains everything it needs to accomplish a task – UI elements, events handlers, settings, even authenticating with 3rd party APIs.

Let's take our example from the "Handling UI Events" section and make a self-contained "Cancel Reminder" button skill, with all logic built-in.

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
  gopher.skills.mySkillName.cancelButton; // This a "Latent Skill" (See above)
  next();
});

// Handle our "Cancel Reminder" event created by our UI above
// This is an "Active Skill". Once the skill is loaded, the "memorize.off"
// always goes to this handler
gopherApp.onAction("memorize.off", function(gopher) {
  gopher.webhook.completeTask();
  gopher.webhook.respond();
});
```

Now we can drop in our isolated "cancel button skill" within any handler that has our skill and it will Just Work.

```javascript
  // Load and use the "Cancel Button" skill anywhere
  gopherApp.load(__dirname + "/skills");  // cancel-button.js is in this dir
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

Isolating skills as components has the side-benefit of making them easily sharable with others.

## Skill Order Matters

When a skill depends on an another skill having been previously loaded, you should explicitly load the dependent skill (even if it was loaded previously). This makes your skill more portable, durable and self-documenting.

```javascript
// Be explicit about dependent skills, even if you seem repetative
gopherApp.loadSkill(__dirname + "./dependentSkill.js");
```

Side-note: under the hood, Gopher uses a pattern called "Middleware". To quote the Express.js documentation (the framework with which GopherApp is created):

> Middleware is like a plumbing pipe: requests start at the first middleware function defined and work their way “down” the middleware stack processing for each path they match.

> They [middleware handlers] are invoked sequentially, thus the order defines middleware precedence. For example, usually a logger is the very first middleware you would use, so that every request gets logged.

### Loading Skill Directory Does Not Load Subdirectory's Skills

Load all skills in a directory using `gopherApp.loadSkill()`. This does NOT load skills from subdirectories. Subdirectories can be used for libs, tests or sub-skills that need to be loaded in a specific order.

## Testing

Export your gopher app by calling `gopherApp.exportApp()` instead of calling `gopherApp.listen()`. This gives you a testable instance of the Express App that Gopher builds, which can be used with any number of existing testing frameworks, for example, [Supertest](https://www.npmjs.com/package/supertest).

## Setup on Other Hosts

If you went through the setup process on gopher.email, GopherApp comes pre-configured using Glitch. This is a great way to get started.

If you are setting it up elsewhere (for example, for local development, or when you'd like to make your extension live), you can set up another environment easily:

### 1. Install

- `mkdir my-skill`
- `npm install gopher-app`
- `touch app.js`

### 2. Minimal code

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

If you are planning to share your skill with others, there are a few naming convnetions that can improve your skill's usability:

First Register an extension dedicated your published skill.

Try to use the same unique string (ex: "skill-name") for:

- Your skill / extension's subdomain. (skill-name.gopher.email)
- The name of the skill on the gopher object, camelCased. For example `gopher.skills.skillName`
- If you publish your skill to npm, name the module "gopher-skill-name"
- Preface your event names, commands and actions with your skill name, or an
  abbreviation if it is long (due to character limitations in the part of
  of email addresses before the @ sign)
- When storing data against the task or extension, put your skill data
  in an object with a key of this same name.

This way, someone can use and track your skill's activity by name.

### Skill Method Conventions

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

For category 1, we employ the metaphorical gopher to cancapsulate skills that "just work" with a single, intuitive command. Code is deliberately hidden from this type of user. Sensible defaults are used for skills so the user's first-time-use is a positive experience. The conceptual model for this user is a lovable rodent that digs tunnels and gets things done for you. What's not to like?

For category 2, the more experience user, we don't try to hide Gopher App's internals. Gopher App is, essentially, an Express middleware stack along with some conventions to load and share this middlware. This familiar environment makes skill authoring a breeze for more experienced developers.
