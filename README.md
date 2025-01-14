This project contains the web client (<https://loved.sh>), API server (<https://loved.sh/api>), and related tools for osu!'s [Project Loved](https://osu.ppy.sh/wiki/Project_Loved). See [cl8n/project-loved](https://github.com/cl8n/project-loved) for more management tools.

> [!IMPORTANT]
> This project is no longer maintained. You may reference or clone it if you want, but I don't recommend it.
>
> Tools for Project Loved were some of the first programs I built with the intention of helping users beyond myself. This codebase began in 2021, but some form of what eventually became this website was developed and used since at least a few years prior.
>
> In its final state, there are many clear shortcomings of the design here. I would have liked to improve the state management in the client and systems for data integrity in the server but never got around to it. I had big ideas for the UI that I similarly didn't end up investing my time in. Overall the code quality is poor but I think that's par for the course in little hobby projects.
>
> The Project Loved website taught me a lot about web technology, the osu! social landscape, and myself. Thank you for helping and thank you for using my software —Clayton

## Development with Docker

The provided Docker Compose configuration sets up a development environment with the client, API, MySQL, and Nginx. By default, Nginx is exposed to the host on port 8080, and MySQL on port 3306 (see [§ Environment variables](#environment-variables)).

### Environment variables

Two sets of environment variables are available at `.env` and `server/.env`. The former can be used to configure the Docker Compose environment, and the latter can be used to configure the API server.

During the containers' startup, each file will be created with a default configuration if it doesn't already exist. API server variables under "API server options" and "MySQL connection options" are overridden by the container.

### Live data

Regular database exports are posted to <https://archive.loved.sh>. They can be imported with the following command. **This will drop and re-create all tables!**

```
docker compose run --rm database import [<export URL>]
```

This will be run automatically to get the latest live data on the first run of the database container.

### Creating an admin user

```
docker compose run --rm api build/bin/create-admin.js <osu! username>
```

### Translations

Translations need to be extracted from the app and recompiled whenever English strings change.

```
docker compose run --rm assets sh -c 'npm run extract-translations && npm run compile-translations'
```

### Database migrations

`server/migrations` contains SQL to create the `project_loved` database schema. There are no backward migrations. Normally, running all migrations is not necessary, because the live data import on first run will create an up-to-date schema.

### Bridge package

The `bridge` directory contains a package required by both the client and server. You will need to rebuild it yourself if changes are made:

```
docker compose run --rm assets sh -c 'cd /app/bridge && npm install && npm run build-no-lint'
```

...and reinstall it in `client` and `server`, if its dependencies change:

```
docker compose run --rm assets npm install
docker compose run --rm api npm install
```

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

Request paths under `/api` should proxy to the server, paths exactly matching files should serve the files, and everything else should serve the client's `index.html`. See `docker/nginx.conf` for additional recommended configuration (but keep in mind that it's set up for a development environment).

Also note that the `loved-bridge` package is installed from `../bridge`, so it will need to be deployed either at that path or at the target of a symbolic link from that path.
