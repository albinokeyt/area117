# Instrucciones del proyecto

- Persistir datos de negocio, fórmulas, orígenes, fechas de exportación y confirmaciones de novedades en PostgreSQL. No añadir archivos JSON de negocio en el servidor ni persistencia de negocio en localStorage.
- Conservar las reglas y excepciones guardadas por estación, tarifa y producto. Un precio calculado no sustituye a su fórmula u origen: resolver la referencia con los valores actuales cada vez. Los valores elegidos expresamente en modo manual se conservan hasta una nueva edición.
- En cada cambio publicado, añadir una entrada nueva al principio de `src/lib/releases.ts` con versión incrementada, fecha, título y cambios concretos en español. Conservar las versiones anteriores. `src/lib/version.ts` obtiene la versión desde ese catálogo; la API de novedades y el historial lo usan automáticamente.
- Describir los cambios para Yanfri en lenguaje de usuario, incluyendo qué cambió y cómo se usa. No presentar como desplegado un cambio sin verificar la versión que sirve producción.
- Validar con `npm test`, `npm run typecheck`, `npm run build` y las pruebas de navegador pertinentes. Playwright usa exclusivamente PostgreSQL aislado, nunca la base de producción.
