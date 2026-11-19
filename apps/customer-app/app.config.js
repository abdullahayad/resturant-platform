// Adds what app.json can't hold: the Google Maps key for the Android map
// (Explore > Map). It comes from the GOOGLE_MAPS_API_KEY environment
// variable - set on expo.dev for the preview/production builds - so it is
// never written in the code. The key is restricted in Google Cloud to this
// app's package name and signing certificate.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '' }],
  ],
});
