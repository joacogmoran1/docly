# Frontend Security Notes

Este frontend evita almacenar secretos o credenciales privadas en cliente.
La autenticacion se apoya en cookies `HttpOnly` emitidas por backend y el cliente solo conserva metadata minima de sesion cuando hace falta para UX.

## Mitigaciones aplicadas

- CSP estricta para build y headers defensivos para preview/deploy estatico.
- CSP reforzada con `child-src 'none'`, restricciones explicitas para atributos/script/style y `require-trusted-types-for 'script'`.
- `frame-ancestors 'none'` y `X-Frame-Options: DENY` para reducir clickjacking.
- `object-src 'none'`, `base-uri 'self'` y `form-action 'self'`.
- Referrer minimizado con `no-referrer`.
- `X-DNS-Prefetch-Control: off` y `Origin-Agent-Cluster: ?1`.
- Logs limitados al entorno de desarrollo y con metadata reducida.
- Sesion con expiracion, timeout por inactividad y sincronizacion entre pestanas.
- Limpieza de sesion ante `401`.
- Sanitizacion de inputs en schemas de auth y registro clinico.
- Validacion estricta de uploads PDF y filtrado defensivo de URLs renderizadas.
- Integracion CSRF con backend: el cliente obtiene el token desde cookie legible, fuerza la emision cuando falta y lo envia en `x-csrf-token` para requests mutantes.
- Sin `dangerouslySetInnerHTML` ni renderizado de HTML no confiable.
- Script de auditoria estatica (`npm run security:static-check`) para detectar sinks peligrosos y storage persistente no autorizado.

## Suposiciones operativas de produccion

- La topologia recomendada es mismo sitio (`https://app.midominio.com` y `/api` por reverse proxy) para mantener cookies y CSRF simples y robustos.
- Si frontend y API se separan por dominio, hay que revisar de nuevo `SameSite`, CORS, proxy y la politica CSRF antes de desplegar.
- Los headers definitivos deben vivir en reverse proxy, CDN o servidor web, no solo en Vite preview.

## Pendientes que siguen viviendo en backend / infraestructura

- Invalidacion real de sesion entre dispositivos distintos.
- Validacion definitiva del lado servidor.
- Sanitizacion y antivirus de uploads del lado servidor.
- Rate limiting perimetral y antifraude adicional.
- Rotacion y revocacion real de tokens.
- HTTPS real, HSTS y secure headers en el reverse proxy / CDN / servidor productivo.

## Checklist de auditoria

- [x] No se exponen secretos en el bundle.
- [x] No se usa `dangerouslySetInnerHTML`.
- [x] No se usa `localStorage` para tokens.
- [x] Rutas privadas protegidas por guards.
- [x] Sesion expira y se limpia al vencer o al recibir `401`.
- [x] Upload restringido a PDF y tamano acotado.
- [x] Logs de cliente reducidos.
- [x] CSP y secure headers preparados para despliegue.
- [x] Integracion CSRF cliente-servidor para requests mutantes.
- [x] Auditoria estatica local contra `dangerouslySetInnerHTML`, `innerHTML`, `eval` y storage persistente no permitido.
- [x] Smoke e2e configurable para `staging` en navegador real con verificacion de login, refresh, logout, cookies y CSRF.
- [ ] Ejecutar `npm run security:check` en un entorno con acceso a red.

## Referencias operativas

- React: [DOM Components / `dangerouslySetInnerHTML`](https://react.dev/reference/react-dom/components)
- MDN: [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- OWASP: [Secure Headers Project](https://owasp.org/www-project-secure-headers/)

## Smoke de staging

El frontend ahora incluye una suite Playwright en `tests/e2e` para validar el dominio final de `staging` y no solo el proxy local de Vite.

Preparacion:

- Copiar `client/.env.e2e.example` a un archivo local y exportar esas variables.
- Usar `DOCLY_E2E_BASE_URL` con el dominio real servido por el reverse proxy final.
- Cargar credenciales reales de paciente y profesional de `staging`.
- Opcionalmente definir `DOCLY_E2E_BROWSER_CHANNEL=msedge` o `chrome` para correr contra un browser instalado.
- El flujo de reset queda opt-in y requiere una URL/token de reseteo valido para una cuenta descartable.

Comandos:

- `npm run test:staging`
- `npm run test:staging:headed`

Cobertura:

- `login`, `refresh`, `logout` y `forgot-password` contra `staging`.
- Verificacion de atributos de cookies (`HttpOnly`, `Secure`, `SameSite`, path del `refresh_token`).
- Verificacion de CSRF real: POST mutante sin header debe responder `403`.
- Verificacion de trafico API mismo-origen detras del proxy final.
- Smoke de rutas clinicas principales de paciente y profesional.
