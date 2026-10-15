# Corrección de guardado v1.5.3

## Fallo observado

Al cambiar las ventas sugeridas de TORREJON a `1,401` y ARCOS JALON a `1,411`, Guardar Precios fallaba con `Setting the value of 'efi_purchases_2026-10-15' exceeded the quota`.

El origen era la dependencia de `localStorage` como copia completa del estado, con históricos y tablas derivadas. Compras escribía primero allí y solo después llamaba al sincronizador. Una escritura que excedía la cuota interrumpía la operación antes de PostgreSQL. La carga inicial también ignoraba silenciosamente las escrituras rechazadas por cuota, con riesgo de mostrar una copia incompleta.

## Cambios

- Los editores, fórmulas, cierres, catálogo y exportaciones comparten `workspaceStorage`, una copia de trabajo en memoria que se carga desde PostgreSQL antes de montar los editores. No se escribe estado de negocio en el almacenamiento persistente del navegador.
- El sincronizador observa cambios de esa copia directamente; deja de interceptar el prototipo nativo de `Storage`. Mantiene la cola ordenada, los reintentos, la protección frente a confirmaciones antiguas y la detección de conflictos entre usuarios.
- La confirmación de Guardar sigue esperando la respuesta de PostgreSQL. No basta con modificar la copia en memoria para anunciar éxito.
- Los errores de Compras se muestran en rojo con un icono de alerta; ya no aparecen como una notificación verde con una marca de éxito.
- El servidor sigue usando PostgreSQL. No se añaden archivos JSON ni almacenamiento alternativo en disco.

## Verificación

La prueba nueva que agota la cuota real de Chromium reprodujo el fallo en v1.5.2 antes del cambio. Las pruebas nuevas verifican las dos ventas de la captura, persistencia tras recargar, navegación, conservación de marcas amarillas y carga de un histórico de más de 6 MiB con todas las escrituras nativas del navegador rechazadas. El resto de la suite cubre fórmulas, exportaciones, cierre de Compras/Postes, concurrencia, errores de base de datos y autenticación.

Resultado local: 18 pruebas de lógica y 12 pruebas de navegador aprobadas, comprobación de TypeScript y compilación de producción correctas. Todas las pruebas de escritura usan un PostgreSQL de pruebas aislado.

## Actualización de una pestaña antigua

Una edición que falló por cuota puede existir únicamente en el estado de React de esa pestaña. Antes de recargar una pestaña v1.5.2 con cambios pendientes, conserva sus valores para reintroducirlos en v1.5.3. La nueva versión carga lo confirmado en PostgreSQL y no importa una copia antigua del navegador que pudiera estar incompleta o desactualizada.
