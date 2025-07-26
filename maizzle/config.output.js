/** @type {import('@maizzle/framework').Config} */

export default {
  build: {
    content: ['emails/**/*.html'],
    output: {
      path: 'output',
      extension: 'hbs',
    },
  },
  inlineCSS: true,
  removeUnusedCSS: true,
  shorthandCSS: true,
  prettify: true,
};
