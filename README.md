This project contains the web client (<https://loved.sh>), web server (<https://loved.sh/api>), and related tools for osu!'s [Project Loved](https://osu.ppy.sh/wiki/Project_Loved). See [cl8n/project-loved](https://github.com/cl8n/project-loved) for more management tools.

## Development with Docker

The provided Docker Compose configuration sets up a development environment with the client, API, MySQL, and Nginx. The website is exposed to the host on port 8080, and the MySQL server on port 3306.

### Environment variables

Server environment variables can be written to `server/.env`. If this file doesn't exist, it will be created as a copy of `server/.env.example` during the containers' startup. Variables under "API server options" and "MySQL connection options" are overridden by the containers.

### Live data

Regular database exports are posted to <https://loved.sh/exports>. They can be imported with the following command. **This will drop and re-create all tables!**

```
docker compose exec database import [<export URL>]
```

This will be run automatically to get the latest live data on the first run of the database container.

### Creating an admin user

```
docker compose exec api build/bin/create-admin.js <osu! username>
```

### Translations

Translations need to be extracted from the app and recompiled whenever English strings change. This is done automatically during the assets container's startup.

```
docker compose exec assets sh -c 'npm run extract-translations && npm run compile-translations'
```

### Database migrations

`server/migrations` contains SQL to create the `project_loved` database schema. There are no backward migrations. Normally, running all migrations is not necessary, because the live data import on first run will create an up-to-date schema.

### Bridge package

The `bridge` directory contains a package required by both the client and server. It's built automatically during the containers' startup, but you will need to rebuild it yourself if changes are made:

```
docker compose exec assets sh -c 'cd /app/bridge && npm install && npm run build-no-lint'
```

...and reinstall it in `client` and `server`, if its dependencies change:

```
docker compose exec assets npm install
docker compose exec api npm install
```

### File permissions

Note that the docker containers are running their commands as root, and any files created by them (build artifacts, Node packages, etc.) will be owned by the user with the matching ID on the host (typically also root). Different hosts may behave differently in this case. It's safe to claim ownership of these files on the host if necessary.

## Deployment

The `build.sh` script's `publish` target can be used to help automate deployments. Please read the script for more details.

### Dependencies

- [Node.js](https://nodejs.org/en/download/) 18
- [MySQL](https://dev.mysql.com/downloads/mysql/) 8

### Client

- `./build.sh client`

The built webpage will be in `client/build`; it's an SPA.

### Server

- `./build.sh server`
- Copy `.env.example` to `.env` and fill in the options, or export the environment variables separately
- Run the server: `NODE_ENV=production server/build/bin/server.js`

Request paths under `/api` should proxy to the server, paths exactly matching files should serve the files, and everything else should serve the client's `index.html`.

Also note that the `loved-bridge` package is installed from `../bridge`, so it will need to be deployed either at that path or at the target of a symbolic link from that path.
