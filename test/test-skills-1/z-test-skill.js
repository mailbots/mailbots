module.exports = function(mailbot) {
  mailbot.app.use((req, res, next) => {
    const bot = res.locals.bot;
    bot.skills.overwrite = "z-test-skill";
    next();
  });
};
