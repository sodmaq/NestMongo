/** @type {import('@maizzle/framework').Config} */

export default {
  build: {
    content: ['emails/**/*.html'],
    output: {
      path: 'development',
      extension: 'hbs',
    },
    summary: true,
    spinner: 'circleHalves',
  },
};
