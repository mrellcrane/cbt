const { withInfoPlist } = require('@expo/config-plugins');

// Runs last in the plugin chain to ensure these keys survive any plugin that
// might not merge infoPlist correctly (e.g. expo-speech-recognition 3.x).
const withRequiredPrivacyStrings = (config) =>
  withInfoPlist(config, (c) => {
    c.modResults.NSPhotoLibraryUsageDescription =
      c.modResults.NSPhotoLibraryUsageDescription ||
      'CBT Friend does not access your photo library. This string is required because an included native library references the Photos API.';
    return c;
  });

module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), withRequiredPrivacyStrings],
});
