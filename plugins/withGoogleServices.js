const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

function addClasspath(buildGradle) {
  const classpath = `classpath 'com.google.gms:google-services:4.4.2'`;
  if (!buildGradle.includes(classpath)) {
    return buildGradle.replace(
      /dependencies\s*{/,
      `dependencies {\n        ${classpath}\n`
    );
  }
  return buildGradle;
}

function addApplyPlugin(buildGradle) {
  const applyPlugin = `apply plugin: 'com.google.gms.google-services'`;
  if (!buildGradle.includes(applyPlugin)) {
    return `${buildGradle}\n${applyPlugin}`;
  }
  return buildGradle;
}

const withGoogleServices = (config) => {
  config = withProjectBuildGradle(config, (config) => {
    config.modResults.contents = addClasspath(config.modResults.contents);
    return config;
  });

  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = addApplyPlugin(config.modResults.contents);
    return config;
  });

  return config;
};

module.exports = withGoogleServices;