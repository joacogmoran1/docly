# Frontend Security Notes

Este frontend evita almacenar secretos o credenciales privadas en cliente.
Los tokens viven en memoria y solo se persiste metadata minima de sesion en `sessionStorage`.

## Mitigaciones aplicadas

- CSP estricta para build y headers defensivos para preview/deploy estatico.
- CSP reforzada con `child-src 'none'`, restricciones explicitas para atributos/script/style y `require-trusted-types-for 'script'`.
- `frame-ancestors 'none'` y `X-Frame-Options: DENY` para reducir clickjacking.
- `object-src 'none'`, `base-uri 'self'` y `form-action 'self'`.
- Referrer minimizado con `no-referrer`.
- `X-DNS-Prefetch-Control: off` y `Origin-Agent-Cluster: ?1`.
- Logs limitados al entorno de desarrollo y con metadata reducida.
- Sesion con expiracion, timeout por inactividad y sincronizacion entre pestañas.
- Limpieza de sesion ante `401`.
- Sanitizacion de inputs en schemas de auth y registro clinico.
- Validacion estricta de upload PDF para firma digital.
- Sin `dangerouslySetInnerHTML` ni renderizado de HTML no confiable.
- Script de auditoria estatica (`npm run security:static-check`) para detectar sinks peligrosos y storage persistente no autorizado.

## Pendientes que deben vivir en backend / infraestructura

- Invalidacion real de sesion entre dispositivos distintos.
- Cookies `HttpOnly`, `Secure`, `SameSite` si el backend las soporta.
- Validacion definitiva del lado servidor.
- Sanitizacion y antivirus de uploads del lado servidor.
- Rate limiting, CSRF y antifraude.
- Rotacion y revocacion real de tokens.
- Headers de seguridad en el reverse proxy / CDN / servidor productivo.

## Checklist de auditoria

- [x] No se exponen secretos en el bundle.
- [x] No se usa `dangerouslySetInnerHTML`.
- [x] No se usa `localStorage` para tokens.
- [x] Rutas privadas protegidas por guards.
- [x] Sesion expira y se limpia al vencer o al recibir `401`.
- [x] Upload restringido a PDF y tamano acotado.
- [x] Logs de cliente reducidos.
- [x] CSP y secure headers preparados para despliegue.
- [x] Auditoria estatica local contra `dangerouslySetInnerHTML`, `innerHTML`, `eval` y storage persistente no permitido.
- [ ] Ejecutar `npm run security:check` en un entorno con acceso a red.

## Referencias operativas

- React: [DOM Components / `dangerouslySetInnerHTML`](https://react.dev/reference/react-dom/components)
- MDN: [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- OWASP: [Secure Headers Project](https://owasp.org/www-project-secure-headers/)
