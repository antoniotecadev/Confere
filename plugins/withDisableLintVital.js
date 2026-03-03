const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Disables lintVitalAnalyzeRelease task that causes release builds to fail
 * when lint errors exist in third-party dependencies.
 */
const withDisableLintVital = (config) => {
  return withGradleProperties(config, (gradleConfig) => {
    const properties = gradleConfig.modResults;

    // Remove existing entry if present (avoid duplicates on repeated prebuild)
    const index = properties.findIndex(
      (item) => item.type === 'property' && item.key === 'android.disableLintVital'
    );
    if (index !== -1) {
      properties.splice(index, 1);
    }

    properties.push({
      type: 'property',
      key: 'android.disableLintVital',
      value: 'true',
    });

    return gradleConfig;
  });
};

module.exports = withDisableLintVital;
