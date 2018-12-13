module.exports = function(mailbot) {
  mailbot.app.use((req, res, next) => {
    const bot = res.locals.bot;
    bot.skills.testing2 = false;
    next();
  });
};
