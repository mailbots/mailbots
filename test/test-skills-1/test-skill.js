module.exports = function(gopherApp) {
  gopherApp.app.use((req, res, next) => {
    const gopher = res.locals.gopher;
    gopher.skills.testing1 = true;
    gopher.skills.overwrite = "first-skill";
    gopher.webhook.setTaskData({ skill: "test-skill-1" });
    next();
  });
};
