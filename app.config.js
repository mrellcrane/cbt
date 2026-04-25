const { withInfoPlist } = require('@expo/config-plugins');

// Runs last in the plugin chain. Forces these keys regardless of what other
// plugins may have written, ensuring they appear in the final Info.plist.
const withRequiredPrivacyStrings = (config) =>
  withInfoPlist(config, (c) => {
    c.modResults.NSPhotoLibraryUsageDescription =
      'CBT Friend does not access your photo library. This string is required because an included native library references the Photos API.';
    c.modResults.NSPhotoLibraryAddUsageDescription =
      'CBT Friend does not save anything to your photo library. This string is required because an included native library references the Photos API.';
    c.modResults.NSCameraUsageDescription =
      'CBT Friend does not use the camera. This string is required because an included native library references the Camera API.';
    c.modResults.NSMicrophoneUsageDescription =
      c.modResults.NSMicrophoneUsageDescription ||
      'CBT Friend uses the microphone so you can speak your journal entries and thought records out loud instead of typing.';
    c.modResults.NSSpeechRecognitionUsageDescription =
      c.modResults.NSSpeechRecognitionUsageDescription ||
      'CBT Friend uses speech recognition to turn your spoken reflections into text for thought records and journaling.';
    c.modResults.NSFaceIDUsageDescription =
      c.modResults.NSFaceIDUsageDescription ||
      'CBT Friend uses Face ID to keep your private journal and mood history secure.';
    return c;
  });

module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), withRequiredPrivacyStrings],
});
