/** @type {import('@maizzle/framework').Config} */

/*
|-------------------------------------------------------------------------------
| Production config                       https://maizzle.com/docs/environments
|-------------------------------------------------------------------------------
|
| This is where you define settings that optimize your emails for production.
| These will be merged on top of the base config.js, so you only need to
| specify the options that are changing.
|
*/

module.exports = {
  build: {
    templates: [
      {
        source: 'src/templates',
        destination: {
          path: 'production/html',
          extension: 'html',
        },
        plaintext: true,
      },
      {
        source: 'src/templates',
        destination: {
          path: 'production/hbs',
          extension: 'hbs',
        },
        plaintext: true,
      },
    ],
  },
  inlineCSS: true,
  removeUnusedCSS: true,
  shorthandCSS: true,
  prettify: true,
};
