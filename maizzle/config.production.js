/** @type {import('@maizzle/framework').Config} */

export default {
  build: {
    content: ['emails/**/*.html'],
    output: {
      path: 'production',
      extension: 'html',
    },
  },
  inlineCSS: true,
  removeUnusedCSS: true,
  shorthandCSS: true,
  prettify: true,
};
