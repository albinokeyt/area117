# Rutas enlazadas y PDF de Compras · v1.6.6

Preparación y pruebas: 20/10/2026. Publicación: 21/10/2026.

## Uso

- En Compras, **Rutas y etiquetas** abre la misma gestión de etiquetas que PDFs y Clientes. Cada estación con etiqueta tiene además una casilla **Ruta** junto a su nombre.
- Activar una ruta marca en verde las filas de esa estación en GOA, Gasolina, AdBlue, Todos los Productos y Tarifas Especiales. El amarillo de las celdas modificadas sigue teniendo prioridad.
- La activación es común para todas las tarifas PDF. Allí se conservan la etiqueta naranja y el resaltado amarillo originales. Activar una etiqueta no cambia la selección de estaciones incluidas en cada tarifa.
- Desactivar una ruta oculta su etiqueta en los PDF y retira el verde en Compras. Conserva la asignación: Torrejón sigue teniendo MADRID aunque esté inactiva. Desactivar todas también conserva las asignaciones. No hay borrado implícito al cerrar el día.
- Cada uno de los tres cuadros de Compras tiene **Descargar PDF**. Incluye únicamente ese cuadro y su filtro de producto actual, todas las filas, precios visibles, costes, margen, fechas, verde de rutas y amarillo de modificaciones. Usa A4 horizontal, cabeceras repetidas y páginas numeradas. No abre el diálogo de impresión ni modifica los PDF de clientes.

## Persistencia y compatibilidad

Se conserva `efi_pdf_station_labels_v1`, incluido el formato antiguo de etiquetas como texto o listas. La activación se guarda por estación en `efi_station_labels_active_v1`, mediante el mismo servicio transaccional de PostgreSQL. Una asignación anterior sin activación explícita conserva su estado activo previo. No se añade almacenamiento de negocio en archivos del servidor ni en localStorage.

Ambas ventanas comparten un lector reactivo y un índice por estación, sin efectos que reescriban los datos al renderizar. Una edición no convierte las asignaciones antiguas de otras estaciones a otro formato. Los guardados fallidos permanecen pendientes en el sistema de sincronización existente.

El PDF se construye desde una captura de los valores visibles al pulsar el botón, antes de cargar el generador. El generador se carga bajo demanda para conservar la velocidad de entrada y edición. No duplica cálculos de precios ni consulta precios de ejemplo.

## Validación

- 41 pruebas unitarias correctas, comprobación de tipos y compilación de producción correctas.
- 10 regresiones de navegador correctas: precios y cierre, conflictos y errores de PostgreSQL, autorización, margen y Excel, 2.600 celdas PDF, EFI/CSV/Excel, novedades y rendimiento con 190 fórmulas. En la prueba con CPU ralentizada, el mayor tiempo hasta pintar una edición fue 472,5 ms (límite existente: 500 ms).
- Las cuatro pruebas específicas de rutas pasan en PostgreSQL aislado: compatibilidad de asignaciones antiguas, todas las tarifas (sin alterar estaciones excluidas), ambas ventanas, tres productos, cierre, recarga, otra sesión, asignación nueva, activación masiva, error y reintento de guardado, descargas y diálogo móvil con restauración del foco.
- Se descargan cinco PDF de prueba: los tres grupos con todos los productos, AdBlue y GOA tras una nueva edición. Extracción independiente con pypdf/pdfplumber para comprobar filas, grupos, precios recién escritos, fechas, A4 horizontal, cabeceras repetidas y numeración. Revisión visual de las páginas renderizadas con Poppler.

## Mensaje para Yanfri

Ya añadimos Rutas y etiquetas en Compras. Activa la casilla Ruta de una estación y sus filas se pondrán verdes; al mismo tiempo aparecerá su etiqueta en todas las tarifas de PDFs y Clientes, con el color naranja habitual. Si la desactivas, el nombre asignado se conserva: Torrejón seguirá teniendo MADRID y al reactivarla aparecerá esa misma etiqueta. Los precios editados siguen en amarillo.

También tienes Descargar PDF en Estaciones Propias, Colaboradoras Fijas y Colaboradoras Restantes. Cada botón descarga solo su cuadro, con el producto o todos los productos que tengas seleccionados y los valores actuales. Las rutas y etiquetas quedan guardadas en PostgreSQL y la explicación está en las novedades y el Historial de versiones.
