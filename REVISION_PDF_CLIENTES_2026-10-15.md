# Revisión PDF y clientes — 15/10/2026 (v1.5.5)

## Fallos y correcciones

- PDF reconstruía precios con lógica propia, márgenes del catálogo y valores de respaldo. Podía discrepar de los orígenes y fórmulas de Sábana. Ahora cada estación lee las dos celdas finales de su columna de Sábana: sin IVA y con IVA son independientes.
- HVO del PDF reconstruía datos crudos de Postes y omitía fórmulas personalizadas. Ahora Alfajarín y Valdemoro publican sus cuatro resultados calculados de Postes, y PDF los consume sin recalcularlos.
- La fecha de validez del documento podía confundirse con la fecha de los datos. Ahora cambiar la fecha del PDF no cambia el origen del precio.
- El selector de orígenes del PDF permitía precios manuales y referencias directas de Compras. Se sustituye por un selector de columnas de Sábana, por estación o para toda la tarifa. Las tarifas nuevas requieren un origen de Sábana.
- Un origen inexistente ya no se completa con un precio fijo: muestra «Sin origen» y bloquea imprimir hasta asignar la columna correcta. Los avisos quedan fuera del documento impreso.
- Se comparte el cálculo de cada par de celdas entre tabla y publicaciones durante un render. Esa memoria se descarta en cada render para que no retenga valores anteriores al editar.

## Correspondencias

Se conservan las asignaciones existentes `SABANA_*` por estación, antes del origen general de la tarifa. Se incluyen tarifas personalizadas y recuadros independientes de Sábana. Los antiguos orígenes directos de Compras o manuales dejan de usarse en PDF.

| Tarifas PDF | Columna de Sábana por defecto |
| --- | --- |
| TARIFA 12, 18, 24, 36, 40, 42, 47, 50, 60 | Columna del mismo número |
| T18 / T36 / T60 - PISTA DE SILLA | 18 / 36 / 60 |
| AMAEXO, E100, HIQI, TARJETERA, TORTUGA | 36 |
| NORPETROL 24, TAX MOVING 24, VRIO | 24 |
| ESPECIAL COMPLETO | Especial General C-0 |
| TARIFA ECO | ECOTRANS |
| DORADO | Especial Esteban |
| ROR | Especial ROR |

Los nombres comerciales sin columna propia mantienen las equivalencias anteriores que apuntaban a Sábana; TAX MOVING 24 usa la columna 24 en lugar del antiguo precio directo de Compras. Se pueden ajustar las correspondencias en «Modificar Origen de Datos». Una asignación explícita a una columna eliminada permanece pendiente de corregir: no se oculta el problema con otra tarifa.

## Validación

Pruebas unitarias de nombres, alias de estaciones, ceros, fechas, IVA independiente y prioridades de origen. Prueba de navegador con PostgreSQL aislado para todas las tarifas actuales, las primeras cinco estaciones comparadas con las celdas visibles de Sábana, una tarifa personalizada, un origen distinto por estación, fórmulas HVO, edición en directo, guardar y recargar, bloqueo por origen ausente e impresión PDF. También se ejecuta la batería existente de guardado, cierre de día, concurrencia y rendimiento.

Los datos de negocio continúan persistidos en PostgreSQL. No se añaden archivos JSON de datos al servidor ni guardados de negocio en localStorage.

Resultado: compilación y TypeScript correctos; 24 pruebas unitarias y 14 pruebas de navegador correctas. Comparación de 2.600 celdas (24 tarifas más una personalizada, 52 estaciones, dos precios). Selector de orígenes y creación de una tarifa enlazada también probados, incluido guardar y recargar. PDF de tres páginas revisado visualmente y mediante extracción de texto. Rendimiento con copia privada del estado actual y CPU ×4: 155–202 ms por edición; los datos de prueba se ejecutan únicamente contra PostgreSQL aislado.
