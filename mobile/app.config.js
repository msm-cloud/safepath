// Dynamic Expo config. Everything static still lives in app.json — this
// wrapper only exists to source the Firebase google-services.json from an
// env var so cloud builds work too.
//
//   * Local dev / `expo prebuild`: GOOGLE_SERVICES_JSON is set in
//     mobile/.env to ./google-services.json (the file is on disk,
//     gitignored). If unset, we fall back to the app.json value, which is
//     the same path.
//   * EAS Build: the GOOGLE_SERVICES_JSON "file" secret is materialised to
//     a temp path and that path is put in process.env for us.
//
// The file itself is never committed (see mobile/.gitignore).

const base = require('./app.json');

module.exports = () => ({
  ...base,
  expo: {
    ...base.expo,
    android: {
      ...base.expo.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? base.expo.android.googleServicesFile,
    },
  },
});
