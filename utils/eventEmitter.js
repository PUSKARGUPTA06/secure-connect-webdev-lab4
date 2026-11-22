const EventEmitter = require('events');

class AppEmitter extends EventEmitter {}
const appEmitter = new AppEmitter();

appEmitter.on('userRegistered', (user) => {
  console.log(`[EVENT] New user registered: ${user.username} (${user.email})`);
});

appEmitter.on('userLoggedIn', (user) => {
  console.log(`[EVENT] User logged in: ${user.username}`);
});

appEmitter.on('noteCreated', (note) => {
  console.log(`[EVENT] Note created: "${note.title}" by owner ${note.owner}`);
});

module.exports = appEmitter;