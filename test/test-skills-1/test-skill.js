module.exports = function(mailbot) {
  mailbot.app.use((req, res, next) => {
    const bot = res.locals.bot;
    bot.skills.testing1 = true;
    bot.skills.overwrite = "first-skill";
    bot.webhook.setTaskData({ skill: "test-skill-1" });
    next();
  });
};
