const { withProjectBuildGradle } = require('@expo/config-plugins');

// play-services-ads 25.x (pulled in by react-native-google-mobile-ads 16.5) ships Kotlin
// 2.3 metadata, but Expo SDK 54 compiles with Kotlin 2.1, which refuses to read it
// ("binary version of its metadata is 2.3.0, expected version is 2.1.0"). The library only
// calls the SDK's Java API, so skipping the metadata version check is safe. Remove this
// once Expo's Kotlin version catches up.
const MARKER = '// withKotlinMetadataFix';
const SNIPPET = `
${MARKER}
subprojects {
  tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    compilerOptions.freeCompilerArgs.add("-Xskip-metadata-version-check")
  }
}
`;

module.exports = function withKotlinMetadataFix(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy' && !cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += SNIPPET;
    }
    return cfg;
  });
};
