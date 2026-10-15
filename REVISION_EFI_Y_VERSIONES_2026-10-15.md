# Revisión de tarifas comerciales, EFI Export e historial — v1.5.6

## Tarifas PDF: reglas recuperadas

Se auditaron el código anterior a v1.5.5 y las asignaciones actuales guardadas en PostgreSQL. Las reglas existentes mandan sobre las equivalencias generales:

- AMAEXO y E100 siguen Tarifa 36; T18/T36/T60 Pista de Silla siguen sus columnas respectivas, incluidas las fórmulas por estación.
- HIQI, TARJETERA y TORTUGA tienen asignaciones a Tarifa 36.
- NORPETROL 24 y VRIO tienen asignaciones a Tarifa 24.
- DORADO combina Especial Esteban con excepciones por estación a Precio Referencia.
- ROR conserva sus asignaciones por estación a Tarifa 24 o Precio Referencia; las demás siguen Especial ROR.
- ECO sigue ECOTRANS salvo la excepción guardada de PETREM FIGUERES a Precio Referencia.
- TAX MOVING 24 conserva la referencia especial de Compras que estaba guardada. Se corrige la equivalencia general a Tarifa 24 introducida en v1.5.5.

Los dos precios de Sábana se publican después de sus fórmulas. Las excepciones de Compras se resuelven con la misma regla de Precio Actual/Referencia de la estación. No se sustituye una regla guardada por un número del día ni por otra tarifa. HVO sigue leyendo los resultados finales de Postes como en v1.5.5. El contador de estaciones excluye nombres de estaciones que ya no existen.

## EFI Export

El exportador ignoraba `sourceType` y utilizaba `pvp`, una copia numérica guardada al modificar. El modal también resolvía fuentes con su propia lógica y varios precios fijos de respaldo. Ahora modal, vista previa y exportación comparten un resolvedor de fuentes que consulta los valores actuales de Compras, Sábana y Postes.

- Los registros antiguos con `sourceType` se reinterpretan como enlaces sin migrar ni borrar las reglas guardadas. Por ejemplo, TALAEXPRESS/Torrejón/producto 1/código 93 sigue Precio Referencia con IVA.
- Los nuevos enlaces guardan origen y diferencial; no guardan `pvp` como sustituto de la fórmula.
- Reabrir Modificar recupera modo, origen, diferencial, producto, código y pago. Los datos no se reinician al cambiar el valor de origen.
- Modo Señalar guarda un enlace a la estación y fuente elegidas, en vez de capturar un precio fijo.
- Las referencias entre tarifas EFI se resuelven incluso si la tarifa de origen aparece después. Las referencias circulares o ausentes quedan pendientes y bloquean la descarga.
- Los valores elegidos expresamente en modo manual se conservan. Se elimina la excepción que descartaba ciertos precios manuales de Prepago por coincidir con números concretos.
- Las fechas de todas las filas siguen las columnas INICIAL/FINAL; las fechas externas persisten en PostgreSQL. Los registros de 2025 por fila dejan de bloquear los cambios de fecha actuales.
- Los ámbitos por tarifa/estación conservan el producto elegido y usan el catálogo actual.
- Guardar solo muestra confirmación tras recibir éxito de PostgreSQL. Un error mantiene el aviso de cambios pendientes.
- Excel y CSV reciben la misma tabla de la vista previa. El CSV mantiene códigos e identificadores enteros, precios con tres decimales y escapa texto con separadores o comillas.

## Novedades e historial

`src/lib/releases.ts` contiene las versiones v1.5.1 a v1.5.6 y sus cambios. El botón Historial de versiones permite consultarlas en cualquier momento. La API autenticada guarda la confirmación de lectura por usuario en la tabla PostgreSQL `efi_release_reads`; otro usuario no pierde su aviso. Un fallo de guardado no marca la versión como leída.

Desde v1.5.6, una aplicación que queda abierta consulta nuevas publicaciones cada minuto y al recuperar el foco. Si la compilación del servidor es distinta, ofrece guardar los cambios pendientes y actualizar. El historial conserva las entradas anteriores. `AGENTS.md` exige una nueva entrada y versión en cada publicación futura.

## Validación

Pruebas unitarias y de navegador contra PostgreSQL aislado para precios dinámicos, cero, fórmulas de IVA independientes, fechas, reglas antiguas, importación/exportación, ciclos, guardado real y confirmaciones de novedades. La revisión usa también una copia privada del estado de producción para comprobar rendimiento, sin editar precios reales.

Resultado: 31 pruebas unitarias, compilación y TypeScript correctos; 16 pruebas de navegador correctas. Se compararon 2.600 celdas PDF y se verificó que Precio Referencia cambiara las tarifas comerciales enlazadas. TALAEXPRESS probado con fórmula, diferencial, código 93, pago mensual, fechas externas, recarga, precio manual, Modo Señalar y errores reales de guardado simulados. Novedades probadas por usuario, historial, fallo de confirmación y anuncio de una versión posterior. Rendimiento con copia del estado de producción y CPU ×4: 177–233 ms por edición.
