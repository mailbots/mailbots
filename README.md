# Gopher App

Gopher.email helps you get things done without leaving your email, like an exceptionally
skilled little rodent that digs tunnels from your inbox to all your other systems.

Gopher App allows you to easily create and install Gopher skills that accomplish things no gopher
should ever be able to do. For example:

- Parse emails and submit them to CRMs, project management systems and more
- Schedule email-based reminders
- Create email-based internal tools
- Track tasks via email
- Coordinate group activities

## Quick Start

First, create a Gopher Extension. You'll get a domain at gopher.email
that looks something like this: `{command}@your-ext.gopher.email` (`{command}`
can be anything), and a working install of this lib available at a publicly
accessible URL.

Then, add a skill:

```javascript
var GopherApp = require("gopher-app");
var gopherApp = new GopherApp(); // If you went through install process, your env would be set up

gopherApp.onCommand('hi', function(gopher) {
    var subject = gopher.get("task.reference_email.subject");
    gopher.webhook.setTriggerTime('3days');
    gopher.webhook.addEmail({
        to: gopher.get("source.from");
        subject: "Hi back!",
        body: [{
            type: 'html',
            text: "I see you sent me an email about " + subject
        }]
    })
    gopher.webhook.respond()
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

Gopher Skills can be created and stored for later use on the `gopher` object. For example,
we can turn the above into a useful skill that can be used throughout our app or even shared with others!.

[Note: If you are familiar with [Express Middleware](https://expressjs.com/en/guide/writing-middleware.html), this will look familiar.]

```javascript
// This function can live in a different file, module or even published to npm
function hiBackWithReminder(request, response, next) {
    var gopher = response.locals.gopher;
        gopher.skills.remember = function() {
                gopher.webhook.hiBackWithReminder('3days');
        gopher.webhook.addEmail({
            to: gopher.get("source.from");
            subject: "Hi back!",
            body: [{
                type: 'html',
                text: "I see you sent me an email about " + subject
            }]
        })
    }
});

// Load the skill
gopherApp.use(hiBackWithReminder);

// In a separate file, anywyere else, you can use the skill as easy as this:
gopherApp.onCommand('hi', function(gopher) {
    gopher.skills.hiBackWithReminder(); // Does all of the above, now a nice elegant command
    gopher.webhook.respond()
});
gopherApp.listen();
```

## Shared Skills

Gopher Skills can be easily packaged and shared.

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
EXT_ID=15
```

## Docs

The code is well commented. Until more docs are written, look there.

## Todo

- [ ] Docs
- [ ] Improve config handling
- [ ] Test coverage
- [ ] Extract Glitch helpers
- [ ] Implement web / UI core skills
- [ ] Implement extension settings
