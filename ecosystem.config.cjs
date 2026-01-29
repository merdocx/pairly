const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'pairly-backend',
      cwd: path.join(root, 'backend'),
      script: 'dist/index.js',
      interpreter: 'node',
      env: { NODE_ENV: 'production' },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
    {
      name: 'pairly-web',
      cwd: path.join(root, 'web'),
      script: 'node_modules/.bin/next',
      args: 'start',
      interpreter: 'node',
      env: { NODE_ENV: 'production', PORT: 3000 },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
