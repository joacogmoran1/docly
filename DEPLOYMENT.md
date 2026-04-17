# Infraestructura Operable

Si queres arrancar en Render con la variante de menor costo y dejar luego el salto abierto a VPS, seguí [RENDER.md](/C:/Users/joaco/Documents/Proyectos/docly/RENDER.md:1). Este documento queda para el stack propio con Docker Compose, Nginx, TLS y secretos por archivo.

La infraestructura queda dividida en dos niveles:

- `docker-compose.yml`: stack local/simple para desarrollo.
- [deploy/compose/docker-compose.app.yml](/C:/Users/joaco/Documents/Proyectos/docly/deploy/compose/docker-compose.app.yml): stack real de `staging` y `production`.

Con esto ya quedan cubiertos en repo:

- `staging` separado de `production`
- secretos leidos por archivo fuera del repo usando `*_FILE`
- HTTPS real con redirect `HTTP -> HTTPS`
- HSTS configurable por entorno
- dominio/subdominio configurable (`DOCLY_SERVER_NAME`)
- `TRUST_PROXY` parametrizado al numero real de saltos
- plataforma base de logs/monitoreo/alertas
- backups automaticos de PostgreSQL
- restore verificado en entorno aislado

## Topologia recomendada

1. `reverse-proxy` termina TLS y publica `/` y `/api`.
2. `api` corre detras del proxy con `TRUST_PROXY` configurado segun los saltos reales.
3. `postgres` guarda datos persistentes.
4. `redis` comparte rate limiting.
5. `postgres-backup` genera dumps comprimidos con retencion.
6. `Grafana + Loki + Promtail` centralizan logs.
7. `Uptime Kuma` hace monitoreo y alertas operativas.

## Entornos separados

Hay ejemplos separados para cada entorno:

- [deploy/environments/staging/stack.env.example](/C:/Users/joaco/Documents/Proyectos/docly/deploy/environments/staging/stack.env.example)
- [deploy/environments/production/stack.env.example](/C:/Users/joaco/Documents/Proyectos/docly/deploy/environments/production/stack.env.example)

Cada uno define:

- `COMPOSE_PROJECT_NAME` distinto, para no compartir volumenes ni redes
- dominio/subdominio propio
- carpeta de secretos distinta
- carpeta TLS distinta
- archivo `api.env` distinto
- politica HSTS y retencion de backups distinta

Copialos a `stack.env` y completalos. Ese archivo queda ignorado por git.

## Secretos Fuera Del Repo

El backend ahora acepta variables tipo `*_FILE` desde [api/src/config/env.js](/C:/Users/joaco/Documents/Proyectos/docly/api/src/config/env.js), por ejemplo:

- `DB_PASSWORD_FILE`
- `JWT_SECRET_FILE`
- `CSRF_SECRET_FILE`
- `SMTP_PASS_FILE`

La idea operativa es:

1. Crear un archivo externo como `/etc/docly/staging/api.env` o `/etc/docly/production/api.env`.
2. Partir de [api/.env.example](/C:/Users/joaco/Documents/Proyectos/docly/api/.env.example).
3. Reemplazar secretos inline por paths internos del contenedor:

```dotenv
NODE_ENV=production
FRONTEND_URLS=https://staging.docly.example.com
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAME_SITE=lax
DB_PASSWORD_FILE=/run/docly-secrets/postgres_password
JWT_SECRET_FILE=/run/docly-secrets/jwt_secret
CSRF_SECRET_FILE=/run/docly-secrets/csrf_secret
SMTP_PASS_FILE=/run/docly-secrets/smtp_pass
LOG_TO_FILES=false
```

4. Guardar los archivos reales en el host, fuera del repo:

```text
/etc/docly/staging/secrets/postgres_password
/etc/docly/staging/secrets/jwt_secret
/etc/docly/staging/secrets/csrf_secret
/etc/docly/staging/secrets/smtp_pass
/etc/docly/staging/secrets/grafana_admin_password
```

## TLS, Dominio Y Proxy

El proxy real usa [deploy/nginx/templates/reverse-proxy.conf.template](/C:/Users/joaco/Documents/Proyectos/docly/deploy/nginx/templates/reverse-proxy.conf.template):

- escucha en `80` y redirige todo a `443`
- sirve TLS desde `${DOCLY_TLS_DIR}/fullchain.pem` y `${DOCLY_TLS_DIR}/privkey.pem`
- publica HSTS con `DOCLY_HSTS_VALUE`
- reenvia `X-Forwarded-*` al backend

En `staging`, usar un subdominio tipo `staging.docly.tu-dominio`.
En `production`, usar el dominio definitivo o `app.tu-dominio`.

`TRUST_PROXY` debe ser el numero real de hops hasta Express:

- `1`: Nginx directo delante de la app
- `2`: CDN/WAF + Nginx + app

Si luego agregas Cloudflare u otro borde, ese valor debe actualizarse.

## Arranque De Staging / Production

App base:

```bash
docker compose --env-file deploy/environments/staging/stack.env -f deploy/compose/docker-compose.app.yml up -d --build
docker compose --env-file deploy/environments/production/stack.env -f deploy/compose/docker-compose.app.yml up -d --build
```

Con monitoreo:

```bash
docker compose --env-file deploy/environments/production/stack.env -f deploy/compose/docker-compose.app.yml -f deploy/compose/docker-compose.monitoring.yml up -d
```

Verificaciones minimas:

```bash
curl -I http://tu-dominio
curl -I https://tu-dominio
curl https://tu-dominio/healthz
curl https://tu-dominio/api/health/ready
```

Se espera:

- `http://` respondiendo redirect a `https://`
- `https://` con header `Strict-Transport-Security`
- `ready` devolviendo `200`

## Logs, Monitoreo Y Alertas

La plataforma definida es:

- [deploy/compose/docker-compose.monitoring.yml](/C:/Users/joaco/Documents/Proyectos/docly/deploy/compose/docker-compose.monitoring.yml)
- [deploy/monitoring/loki/config.yml](/C:/Users/joaco/Documents/Proyectos/docly/deploy/monitoring/loki/config.yml)
- [deploy/monitoring/promtail/config.yml](/C:/Users/joaco/Documents/Proyectos/docly/deploy/monitoring/promtail/config.yml)
- [deploy/monitoring/grafana/provisioning/datasources/loki.yml](/C:/Users/joaco/Documents/Proyectos/docly/deploy/monitoring/grafana/provisioning/datasources/loki.yml)

Uso recomendado:

- `Grafana + Loki + Promtail` para logs centralizados
- `Uptime Kuma` para checks y alertas operativas

Primer bootstrap sugerido en Uptime Kuma:

1. Check HTTPS a `https://<dominio>/healthz`
2. Check API a `https://<dominio>/api/health/ready`
3. Configurar notificaciones por email, Slack o webhook segun el canal operativo del equipo

`Grafana` y `Uptime Kuma` quedan bindeados por defecto solo a `127.0.0.1`, pensado para acceso por SSH tunnel o VPN.

## Backups Y Restore

Los backups automaticos los hace el servicio `postgres-backup` con [deploy/scripts/run-postgres-backup.sh](/C:/Users/joaco/Documents/Proyectos/docly/deploy/scripts/run-postgres-backup.sh):

- genera `*.sql.gz`
- corre en el intervalo definido por `DOCLY_BACKUP_INTERVAL_SECONDS`
- elimina backups mas viejos que `DOCLY_BACKUP_RETENTION_DAYS`

La restauracion verificada se hace con [deploy/scripts/verify-restore.sh](/C:/Users/joaco/Documents/Proyectos/docly/deploy/scripts/verify-restore.sh) y [deploy/compose/docker-compose.restore-check.yml](/C:/Users/joaco/Documents/Proyectos/docly/deploy/compose/docker-compose.restore-check.yml):

```bash
./deploy/scripts/verify-restore.sh deploy/environments/staging/stack.env /ruta/al/backup.sql.gz
```

Ese flujo:

1. levanta Postgres y Redis aislados
2. restaura el dump
3. levanta una API separada
4. espera `200` en `/api/health/ready`

Ese es el check que conviene correr de forma periodica, no solo antes de release.

## WAF / CDN Opcional

El siguiente paso recomendado es poner un borde tipo Cloudflare delante del proxy.

Si lo haces:

- mantener el origen solo aceptando trafico del CDN o una VPN
- subir `TRUST_PROXY` de `1` a `2`
- dejar TLS tambien entre CDN y origen
- conservar HSTS en el dominio final

## Checklist Antes De Release

- `npm test` en [api/package.json](/C:/Users/joaco/Documents/Proyectos/docly/api/package.json)
- `npm test` en [client/package.json](/C:/Users/joaco/Documents/Proyectos/docly/client/package.json)
- `npm run smoke:load` contra staging con DB real
- validacion manual de login, refresh, logout, reset password, agenda, estudios y permisos
