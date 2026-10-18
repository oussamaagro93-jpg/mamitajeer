// Vercel Serverless Function entry point.
//
// Vercel's Node builder treats this file as the handler for every request
// (see vercel.json). We simply re-export the already-configured Express app
// from src/app.js.
//
// Note: we intentionally do NOT call app.listen() here. On Vercel the platform
// owns the HTTP server and invokes this export per request. The local dev
// server (src/server.js) still calls app.listen() for `npm run dev` / `npm start`.
const app = require('../src/app');

module.exports = app;
