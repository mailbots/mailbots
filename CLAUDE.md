# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Service Overview

**mailbots** is a TypeScript/Node.js framework for creating email-based bots and FollowUpThen (FUT) Skills. It's part of the FUT monorepo ecosystem where:

- **mailbots** provides the SDK/framework for building MailBot applications and FUT Skills
- Skills extend FollowUpThen functionality by injecting UI elements and behaviors into the email followup lifecycle
- The service receives webhooks from `fut-core-api` for task lifecycle events (`task.created`, `task.triggered`, etc.)
- Skills can interact with 3rd party services (SMS, Zapier, CRMs) to enhance email workflows

## Development Commands

### Build & Development
```bash
npm run build              # Compile TypeScript to dist/
npm run build:watch        # Build in watch mode  
npm test                   # Run full test suite (requires build)
npm run test:watch         # Run tests in watch mode
npm run test:inspect       # Debug tests with inspector
```

### Documentation
```bash
npm run docs:build         # Generate HTML docs to docs-html/ and markdown to docs.md
npm run dev:docs          # Serve live documentation at localhost
npm run toc:build         # Generate table of contents
```

### Publishing
```bash
npm run prepublishOnly     # Auto-runs before npm publish (builds dist/)
npm run publish:prod       # Push git, push tags, npm publish
```

## Architecture

### Core Framework Structure
- **`src/mailbots.ts`** - Main MailBots class with handler registration and Express app
- **`src/lib/bot-request.ts`** - BotRequest class wrapping webhook request/response logic
- **`src/lib/webhook-helpers.ts`** - Helper methods for responding to webhooks
- **`src/lib/settings-page.ts`** - Settings UI generation helpers
- **`src/types.ts`** - TypeScript interfaces for webhooks, tasks, UI blocks, etc.
- **`src/index.ts`** - Main exports

### Handler Types
The framework supports several webhook handler types:

#### MailBot Handlers (Traditional)
- `onCommand(command, handler)` - Handle email commands (todo@bot.eml.bot)
- `onTrigger(command, handler)` - Handle when scheduled tasks trigger
- `onAction(action, handler)` - Handle email-based actions (button clicks)
- `onTaskViewed(command, handler)` - Handle task preview in web UI
- `onEvent(event, handler)` - Handle 3rd party webhooks

#### FUT Lifecycle Handlers (Skills)
- `onFutCreateUser(handler)` - Modify task creation confirmation email
- `onFutTriggerUser(handler)` - Inject UI into triggered followup emails  
- `onFutViewUser(handler)` - Add UI when viewing tasks in web interface
- `onFutAction(handler)` - Handle actions from injected UI elements
- `onFutUpdate(handler)` - Handle task updates/edits

#### Settings Handlers
- `onSettingsViewed(handler)` - Render custom settings pages
- `onSettingsSubmit(handler)` - Handle settings form submissions

### Webhook Flow
1. `fut-core-api` sends POST to `/webhooks` endpoint
2. Framework routes to appropriate handler based on webhook type/command
3. Handler receives `BotRequest` instance with helper methods
4. Handler responds with JSON (UI blocks, emails, data updates, etc.)

### Skills System
Skills are reusable packages that can be installed via npm:
```javascript
const skillPackage = require('mailbots-skill-name');
skillPackage.activate(mailbot); // Auto-register handlers

// Or use skill components explicitly
const { renderSomething, middleware } = require('mailbots-skill-components');
mailbot.app.use(middleware);
mailbot.onCommand('test', bot => {
  renderSomething(bot);
  bot.webhook.respond();
});
```

## Testing

- Tests use Mocha with Chai assertions
- Test files: `test/mailbots.test.js`, `test/bot-request.test.js`
- Test fixtures in `test/fixtures/` contain sample webhook payloads
- Set `NODE_ENV=test` to disable webhook signature validation
- Use `mailbot.exportApp()` instead of `.listen()` to get testable Express app

Example test pattern:
```javascript
const request = require('supertest');
const mailbot = new MailBotsApp({ clientId: 'test', clientSecret: 'test' });
mailbot.onCommand('test', bot => { /* handler */ });
const app = mailbot.exportApp();
await request(app).post('/webhooks').send(webhookFixture);
```

## Key Configuration

### Environment Variables
- `CLIENT_ID` - MailBots client ID
- `CLIENT_SECRET` - MailBots client secret  
- `MAILBOT_URL` - Public URL for webhook delivery
- `NODE_ENV=test` - Disables webhook validation for testing

### TypeScript Configuration
- Targets ES6 with CommonJS modules
- Strict mode enabled with `noUnusedLocals`
- Outputs to `dist/` with declarations
- Source in `src/`, excludes `node_modules`

### Code Style
- Prettier with `trailingComma: "none"` and `arrowParens: "avoid"`
- Pre-commit hooks run tests via Husky

## Important Patterns

### Handler Response Pattern
All handlers must call `bot.webhook.respond()` to send response:
```javascript
mailbot.onCommand('hello', bot => {
  bot.webhook.quickReply('Hello back!');
  bot.webhook.respond(); // Required!
});
```

### Data Persistence
Use shallow merging pattern for task data:
```javascript
bot.webhook.setTaskData('namespace', { key1: 'value1' });
bot.webhook.setTaskData('namespace', { key2: 'value2' }); 
// Result: { namespace: { key1: 'value1', key2: 'value2' }}
```

### Settings Pages
Settings use namespace isolation:
```javascript
mailbot.onSettingsViewed(bot => {
  const page = bot.webhook.settingsPage({
    namespace: 'my-skill',
    title: 'My Skill Settings'
  });
  page.input({ name: 'api_key', title: 'API Key' });
  page.button({ type: 'submit' });
  // Don't call bot.webhook.respond() for settings handlers
});
```

### Error Handling
Set custom error handler for the entire application:
```javascript
mailbot.setErrorHandler((error, bot) => {
  // Custom logging, user notification
  bot.webhook.respond({ status: 'error', message: 'Custom error' });
});
```
