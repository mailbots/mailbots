module.exports = function(gopherApp) {
  gopherApp.app.use((req, res, next) => {
    const gopher = res.locals.gopher;
    gopher.skills.testing2 = false;
    next();
  });
};
