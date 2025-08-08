// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide XHR requests from command log
const app = window.top;
if (app) {
    app.console.log = () => {};
}

// You can modify the config values here:
// Cypress.config('defaultCommandTimeout', 10000)
