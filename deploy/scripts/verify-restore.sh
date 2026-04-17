#!/bin/sh
set -eu

if [ "$#" -lt 2 ]; then
	echo "Uso: $0 <stack.env> <backup.sql|backup.sql.gz>" >&2
	exit 1
fi

STACK_ENV_FILE="$1"
BACKUP_FILE="$2"
KEEP_RUNNING="${KEEP_RUNNING:-false}"
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"

if [ ! -f "$STACK_ENV_FILE" ]; then
	echo "No existe el archivo de stack: $STACK_ENV_FILE" >&2
	exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
	echo "No existe el backup: $BACKUP_FILE" >&2
	exit 1
fi

compose() {
	docker compose --env-file "$STACK_ENV_FILE" -f "$ROOT_DIR/deploy/compose/docker-compose.restore-check.yml" "$@"
}

cleanup() {
	if [ "$KEEP_RUNNING" = "true" ]; then
		return
	fi

	compose down -v >/dev/null 2>&1 || true
}

wait_for_healthy() {
	service_name="$1"
	container_id="$(compose ps -q "$service_name")"

	if [ -z "$container_id" ]; then
		echo "No se pudo obtener el contenedor de $service_name" >&2
		exit 1
	fi

	attempt=0
	while [ "$attempt" -lt 60 ]; do
		status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"
		if [ "$status" = "healthy" ]; then
			return
		fi

		attempt=$((attempt + 1))
		sleep 2
	done

	echo "Timeout esperando que $service_name quede healthy" >&2
	exit 1
}

trap cleanup EXIT

compose up -d postgres-restore redis-restore >/dev/null
wait_for_healthy postgres-restore
wait_for_healthy redis-restore

postgres_container="$(compose ps -q postgres-restore)"
backup_name="$(basename "$BACKUP_FILE")"

docker cp "$BACKUP_FILE" "$postgres_container:/tmp/$backup_name"

case "$backup_name" in
	*.gz)
		restore_command="gunzip -c /tmp/$backup_name | psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\""
		;;
	*)
		restore_command="psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" < /tmp/$backup_name"
		;;
esac

docker exec "$postgres_container" sh -lc "$restore_command"

compose up -d api-restore >/dev/null
wait_for_healthy api-restore

echo "Restore verificado correctamente. API disponible en http://127.0.0.1:${DOCLY_RESTORE_API_PORT:-14000}"
