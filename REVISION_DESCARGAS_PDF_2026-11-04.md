# Descargas y nombres PDF — v1.6.8

## Uso

En **PDFs y Clientes**, junto a **Generador Oficial de PDFs para Clientes**, abrir **Opciones y descargas**. El desplegable reúne restauración del catálogo, creación de tarifas, orígenes, validación, etiquetas, descargas, nombres de archivos e impresión.

- **Descargar PDF actual** descarga directamente el PDF de la tarifa seleccionada. Incluye todas sus estaciones activas, aunque la búsqueda de la vista previa tenga un filtro.
- **Descargar todos los PDF** descarga un único ZIP con un PDF por tarifa del catálogo actual, siguiendo su orden. Cada tarifa conserva sus estaciones activas, etiquetas activadas y configuración HVO. Una tarifa sin estaciones activas produce un documento que lo indica expresamente.
- **Nombres de archivos PDF** permite asignar un nombre de descarga a cada tarifa. **Guardar nombres PDF** espera la confirmación de PostgreSQL. Si falla, conserva el texto y permite reintentar. Dejar un campo vacío recupera el nombre original para sus descargas.
- **Imprimir tarifa actual** conserva la impresión desde el navegador como opción separada.

Los nombres elegidos no cambian el nombre original de la tarifa, el título interior del PDF, sus fórmulas ni sus orígenes. Se reutilizan al descargar individualmente o en lote y sobreviven a recargas y cierres de día.

## Formato de los archivos

`01 TARIFA NEXO VALIDA A PARTIR DE 04-11-2026.pdf`

El número se calcula a partir del orden actual en el programa. El nombre elegido se guarda por tarifa, mientras que el orden y la fecha se calculan de nuevo en cada descarga. La fecha procede de **Fecha de validez del documento**, cuya elección también se guarda en PostgreSQL y no cambia los precios de la fecha de trabajo.

Windows no permite `/` en nombres de archivo; por eso se utiliza `04-11-2026` en el archivo y `04/11/2026` dentro del PDF. Los caracteres de ruta u otros caracteres no válidos se sustituyen por guiones. Se conservan los acentos.

## Datos y documentos

Antes de generar los archivos se confirman los cambios pendientes y se comprueban ambos precios de cada estación activa contra sus orígenes actuales. Se captura el lote completo antes de construirlo para que todos los documentos correspondan al mismo estado. Si falta un origen o el HVO requerido, se indica la tarifa o estación y no se entrega un ZIP parcial.

La generación utiliza los precios calculados actuales sin sustituir sus definiciones. Los PDF incluyen el banner oficial, ambos precios independientes sin IVA y con IVA, etiquetas, HVO cuando corresponde, cabeceras repetidas y páginas numeradas. Se generan en el navegador; las preferencias de descarga se guardan en PostgreSQL mediante la sincronización existente. No se crean archivos JSON de negocio en el servidor ni persistencia en localStorage.

Las ediciones simultáneas de nombres de tarifas distintas se conservan. Un conflicto sobre el mismo nombre avisa para que se revise. Las cuentas de solo lectura pueden consultar los nombres, pero no guardarlos. La API rechaza nombres o fechas con formato no válido.

## Mensaje para Yanfri

Yanfri, en PDFs y Clientes tienes un menú «Opciones y descargas» con todos los botones. «Descargar todos los PDF» guarda un ZIP con un PDF por tarifa y sus estaciones activas. En «Nombres de archivos PDF» puedes elegir cómo se guarda cada archivo sin cambiar el nombre original de la tarifa. Guarda esos nombres una vez y se mantendrán para las descargas individuales y conjuntas. Los archivos llevan su número de orden, el nombre elegido, «VALIDA A PARTIR DE» y la fecha de validez del documento; por ejemplo: «01 TARIFA NEXO VALIDA A PARTIR DE 04-11-2026.pdf». Los precios siguen vinculados a sus orígenes actuales. El cambio también aparece en las novedades y en el historial de versiones.

## Entrega

Código preparado para desplegar desde GitHub. No se han cambiado datos de producción. Tras desplegar en Easypanel debe aparecer **v1.6.8**.

## Validación

- 51 pruebas unitarias correctas; comprobación de tipos y compilación de producción correctas.
- 10 pruebas de navegador correctas con PostgreSQL aislado: nombres persistentes, descarga individual y ZIP real, cambio de fecha y orden, recarga y cierre, precios dinámicos, reintento de guardado, edición simultánea de tarifas distintas, rechazo de preferencias inválidas, bloqueo del lote ante un origen ausente, móvil con teclado y temas, 2.600 celdas de precios, validador, etiquetas y PDF de Compras.
- Lectura independiente de los PDF descargados con pypdf y pdfplumber: 52 estaciones en la tarifa completa, dos en la selección reducida y ninguna en una tarifa vacía intencionada; ambos precios de todas las filas contrastados con el origen. Se comprueba el cambio de 1,512 a 1,712 sin IVA conservando el valor independiente de 1,999 con IVA, además del HVO y las etiquetas activadas. El ZIP pasa la comprobación CRC y conserva los nombres con acentos.
- Renderizado e inspección de todas las páginas de los ejemplos completo, reducido y vacío: banner, columnas, tarjetas HVO, etiquetas y paginación sin cortes. Revisión del menú y el editor en los temas Oscuro y Crema a 390 px.
- El servidor de pruebas permite elegir otro puerto local mediante `AREA117_TEST_PG_PORT` si Windows retiene el anterior tras terminar. Sigue creando una base temporal nueva y no utiliza `DATABASE_URL` de producción.
