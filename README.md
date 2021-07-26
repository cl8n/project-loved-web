This project contains the web client (<https://loved.sh>), web server (<https://loved.sh/api>), and related tools for osu!'s [Project Loved](https://osu.ppy.sh/wiki/Project_Loved). See [cl8n/project-loved](https://github.com/cl8n/project-loved) for more management tools.

## Development with Docker

The provided `docker-compose` configuration sets up a development environment with the client, API, MySQL, and Nginx. The client is served from http://localhost:8080 by default. Server config options `db*`, `localInteropKey`, and `port` are overridden in this environment.

### Database migrations

`/server/migrations` contains SQL to create the `project_loved` database schema. There are no backward migrations.

On the first run of the database container, the `project_loved` user will be created with an empty password. MySQL is exposed to the host machine on port 3306. The `project_loved` database will be created and existing migrations will be applied, but future ones need to be run manually.

### Live data

Regular data exports (sans `logs`, `log_values`, and `sessions`) are posted to <https://loved.sh/exports>. Be aware that they will drop all tables and import new ones.

## Deployment

### Dependencies

- [Node.js](https://nodejs.org/en/download/) 14
  - Preferably with npm 7 to support the new lockfile format
- [MySQL](https://dev.mysql.com/downloads/mysql/) 8

### Client

- `cd client`
- `npm install && npm run build`

The built webpage will be in `/client/build`, it's an SPA.

### Server

- `cd server`
- `npm install && cp config.example.json config.json`
- Fill in provided config
- Run server
  - Directly: `NODE_ENV=production ./index.js`
  - With systemd: See provided `project-loved-web.example.service`

Request paths under `/api` should proxy to the server, paths exactly matching files should serve the files, and everything else should serve the client's `index.html`.
