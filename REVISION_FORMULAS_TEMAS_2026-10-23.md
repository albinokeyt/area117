# Fórmulas permanentes y temas — v1.6.7

## Problemas corregidos

- Sábana y Postes cargaban primero las fórmulas de la fecha seleccionada. Una copia diaria antigua podía ocultar una modificación posterior. Ahora el registro global guardado es la fuente permanente; la fecha solo cambia el contexto de cálculo. Las instalaciones que solo conservan copias diarias leen sus celdas más recientes hasta el primer guardado explícito.
- El recálculo de precios volvía a escribir los registros completos de fórmulas, incluso desde gestores ocultos. Se eliminan esas escrituras automáticas. Las dependencias entre ventanas se resuelven en memoria con los datos actuales. La fórmula, su fecha de edición y sus referencias solo cambian mediante una acción de edición.
- Restablecer todo eliminaba el registro global y permitía recuperar fórmulas antiguas desde otra fecha. Ahora se guarda un registro vacío explícito. Eliminar una celda mantiene las demás reglas y no la recupera desde copias históricas.
- Abrir PDF y Clientes forzaba los márgenes de AMAEXO/E100 y ECO/ECOTRANS y reescribía el catálogo. Se leen las configuraciones guardadas sin sustituirlas al abrir o cerrar el día.

## Usuarios designados

En **Usuarios**, el administrador activa **Gestionar fórmulas** para los usuarios que deban crear, modificar o eliminar fórmulas, tarifas y orígenes. Los administradores conservan siempre el permiso, incluido el administrador configurado por entorno. Los visualizadores siguen siendo de solo lectura. Los demás usuarios empiezan sin este permiso específico hasta que el administrador los designe; pueden seguir introduciendo precios de Compras.

El permiso se guarda en `efi_server_users.manage_formulas`. La API de sincronización comprueba las definiciones y orígenes resultantes dentro de la transacción de PostgreSQL. También rechaza peticiones directas que intenten borrar reglas, sustituir orígenes, restablecer EFI o esconder fórmulas históricas creando un registro global vacío. Una revocación se aplica a los guardados de las sesiones ya abiertas; el usuario recarga para actualizar los controles de su pantalla.

El editor de una fórmula espera la confirmación de PostgreSQL antes de cerrarse. Si falla el guardado, mantiene el texto y muestra **Guardado pendiente** para reintentar. Los cierres de día y la actualización de precios no eliminan las reglas.

## Apariencia

En la cabecera, **Tema visual** permite elegir **Cristal**, **Oscuro** o **Crema**. Se guarda por cuenta en la tabla PostgreSQL `efi_user_preferences`; no utiliza archivos JSON del servidor ni localStorage. Cambiar el tema de una cuenta no modifica el de las demás.

El sombreado de la fila se aplica encima de los fondos de cada celda, incluida la estación fija, sin sustituir el verde de las rutas ni el amarillo de los valores modificados. También identifica la fila mientras se edita con el teclado. Los estilos de temas y sombreado son exclusivos de pantalla; los documentos PDF conservan sus colores oficiales.

## Mensaje para Yanfri

Ya corregimos la permanencia de las fórmulas: cambiar de ventana, fecha o cerrar el día no las sustituye ni recupera versiones antiguas. Siguen calculando con los precios actuales hasta que un usuario autorizado las cambie o elimine. En Usuarios puedes designar quién tiene el permiso Gestionar fórmulas; los administradores lo tienen siempre. Si un guardado falla, el editor avisa y permite reintentarlo.

También tienes un selector de tema en la cabecera con Cristal, Oscuro y Crema. Cada cuenta conserva su elección. Al pasar el ratón por una fila se sombrea completa para seguirla fácilmente, manteniendo los colores de rutas y modificaciones.

## Validación y límite conocido

- 46 pruebas unitarias correctas; comprobación de tipos y compilación de producción correctas.
- 12 pruebas de navegador funcionales correctas en PostgreSQL aislado: cuatro nuevas de permanencia, permisos, reintento de guardado y temas; regresiones de precios y cierre, transacciones concurrentes, autorización, errores de base de datos, novedades, 2.600 celdas PDF y exportación EFI/Excel/CSV. Las seis pruebas de fórmulas, temas, PDF y EFI volvieron a pasar tras las optimizaciones de lectura y cálculo.
- Revisión visual de los temas en Compras, Sábana y PDF, y en móvil de 390 px. Los PDF mantienen sus colores oficiales y las preferencias se aíslan por cuenta.
- La prueba de rendimiento con 190 fórmulas y CPU ralentizada x4 **no supera el objetivo de máximo 500 ms**. Última medición: 583 / 366,2 / 337,8 / 453,4 / 276 ms. Se redujeron las conversiones JSON repetidas y los cálculos duplicados, pero sigue existiendo ese pico. Durante la sesión el equipo llegó a tener solo 156 MB de memoria libre y hubo que cerrar procesos locales de pruebas bloqueados. No se presenta ese chequeo como correcto ni se atribuye con certeza toda la diferencia a la memoria.
- No se han modificado datos de producción ni ejecutado pruebas contra su base de datos. Esta entrega deja el código preparado en GitHub; la versión servida por Easypanel debe comprobarse después del despliegue.
