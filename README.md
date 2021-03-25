This project contains the web client (<https://loved.sh>), web server (<https://loved.sh/api>), and related tools for osu!'s [Project Loved](https://osu.ppy.sh/wiki/Project_Loved). See [cl8n/project-loved](https://github.com/cl8n/project-loved) for more management tools.

## Dependencies

- [Node.js](https://nodejs.org/en/download/) 12+
- [MySQL](https://dev.mysql.com/downloads/mysql/) 5.7+

## Usage

### Client

- `npm install && npm run build`

Built webpage will be in `build/`, it's an SPA.

### Server

- `npm install && cp config.example.json config.json`
- Fill in provided config
- Run server
  - Directly: `NODE_ENV=production ./index.js`
  - With systemd: See provided `project-loved-web.example.service`

Request paths under `/api` should proxy to the server, paths exactly matching files should serve the files, and everything else should serve the client's `index.html`.

#### Migrations

Run the SQL under `migrations/` in order to migrate up. There are no migrations down.
