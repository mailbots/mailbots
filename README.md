# Gopher App

Gopher.email helps you get things done without leaving your email, like an exceptionally
skilled little rodent that digs tunnels from your inbox to all your other systems.

Gopher App allows you to easily create and install Gopher skills that accomplish things no gopher
should ever be able to do. For example:

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

Then, add a skill:

```javascript
// require("dotenv").config(); // Alternatively, pass config to GopherApp()
var GopherApp = require("gopher-app");
var gopherApp = new GopherApp();

gopherApp.onCommand("hi", function(gopher) {
  var subject = gopher.get("task.reference_email.subject");
  gopher.webhook.setTriggerTime("3days");
  gopher.webhook.addEmail({
    to: gopher.get("source.from"),
    subject: "Hi back!",
    body: [
      {
        type: "html",
        text: "I see you sent me an email about " + subject
      }
    ]
  });
  gopher.webhook.respond();
});

gopherApp.listen();
```

This is email command handler tells Gopher to reply to anyone when they
email `{command}@your-ext.gopher.email`. (Anyone, as in, anyone with an email address, meaning a
lot of people can use your extension). It will also trigger a followup event in 3 days.

You can think of the `GopherApp` above like a container for numerous gophers, each one
of which can be with specially tuned skills to handle specific email-related actions.

## Installing Skills

(todo)

## Writing Custom Skills

Gopher Skills can be created and added to the `gopher` object.
Let's turn our above handler into a useful skill that can be reused and shared
with others.

[Note: If you are familiar with [Express Middleware](https://expressjs.com/en/guide/writing-middleware.html), this will look familiar.]

### Define Skill

A new skill usually is defined in a separate file or npm module, but just as
easily can live in the same file.

```javascript
gopherApp.use(function(request, response, next) {
  var gopher = response.locals.gopher;
  var subject = gopher.get("task.reference_email.subject");

  // New skill 🎓 👏
  gopher.skills.hiBackWithReminder = function() {
    gopher.webhook.setTriggerTime("3days");
    gopher.webhook.addEmail({
      to: gopher.get("source.from"),
      subject: "Hi back!",
      body: [
        {
          type: "html",
          text: "I see you sent me an email about " + subject
        }
      ]
    });
  };
  next(); // <-- Don't forget this
});
```

### Use Skill

Same outcome, now using Gopher Skills.

```javascript
gopherApp.onCommand("hi", function(gopher) {
  gopher.skills.hiBackWithReminder(); // Does all of the above, now a nice elegant command
  gopher.webhook.respond();
});
```

## Composing Skills

Skills can make use of other skills. For example, an [Evercontact](https://www.evercontact.com/developers)
skill (todo!) may only parse email signatures. A CRM skill could compose the Evercontact skill
and any others to augment contact information before entering the data into a CRM.

## Publishing Skills

Gopher Skills can be easily packaged and shared on npm. If you create a skill please let us know
so we can add it to our skills directory.

## Env

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

## Docs

The code is well commented. Until more docs are written, look there.

## Todo

- [ ] Docs
- [ ] Improve config handling
- [ ] Test coverage
- [ ] Extract Glitch helpers
- [ ] Extension settings
