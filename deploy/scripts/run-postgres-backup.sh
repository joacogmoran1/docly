#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
POSTGRES_PASSWORD_FILE="${POSTGRES_PASSWORD_FILE:-/run/docly-secrets/postgres_password}"

if [ ! -f "$POSTGRES_PASSWORD_FILE" ]; then
	echo "No se encontro POSTGRES_PASSWORD_FILE en $POSTGRES_PASSWORD_FILE" >&2
	exit 1
fi

export PGPASSWORD="$(tr -d '\r\n' < "$POSTGRES_PASSWORD_FILE")"

mkdir -p "$BACKUP_DIR"

while true; do
	timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
	target="$BACKUP_DIR/${PGDATABASE:-docly}_${timestamp}.sql.gz"

	echo "[$(date -u +%FT%TZ)] Generando backup en $target"

	pg_dump \
		--clean \
		--if-exists \
		--no-owner \
		--no-privileges \
		-h "${PGHOST:?PGHOST requerido}" \
		-p "${PGPORT:-5432}" \
		-U "${PGUSER:?PGUSER requerido}" \
		"${PGDATABASE:?PGDATABASE requerido}" \
	| gzip -9 > "$target"

	chmod 600 "$target"

	find "$BACKUP_DIR" -type f -name '*.sql.gz' -mtime +"$BACKUP_RETENTION_DAYS" -delete

	echo "[$(date -u +%FT%TZ)] Backup completado"
	sleep "$BACKUP_INTERVAL_SECONDS"
done
