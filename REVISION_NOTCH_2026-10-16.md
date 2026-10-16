# Navegación flotante AREA117 — v1.6.1

Las ocho pestañas se concentran en una isla de cristal azul, centrada en la parte superior. Cerrada muestra la sección actual, la hora local y el estado de trabajo. Al pasar el ratón se despliega; al pulsarla queda abierta hasta elegir una sección, volver a pulsar, pulsar fuera o usar Escape. En móvil se abre al tocarla.

El despliegue cambia de tamaño con una transición de 620 ms, las opciones aparecen en secuencia y la sección seleccionada tiene un indicador rojo del logo. Cada cambio de ventana añade una entrada suave y un destello breve bajo la cabecera. Se respeta la preferencia de movimiento reducido.

## Estados y controles

- «Guardando cambios» observa la cola existente de sincronización. «Guardado en PostgreSQL» aparece tras recibir la confirmación del servidor y no mientras haya cambios pendientes.
- Los errores y la desconexión se muestran como «Guardado pendiente» o «Sin conexión». Un error conserva su aviso hasta la siguiente sincronización correcta.
- Cuando no hay actividad aparecen la hora, un saludo o «Todo al día». Las novedades utilizan el resultado real de la API de versiones.
- BD y Subir Todo al Servidor se encuentran dentro del menú y conservan sus acciones originales. Historial de versiones, fecha de trabajo y cierre de sesión siguen en la cabecera.
- Teclado: Tab llega al botón principal; Enter, Espacio o flecha abajo abren el menú. Escape cierra y devuelve el foco. Los controles del menú cerrado son inertes y no entran en el recorrido de Tab.

## Datos y alcance

Los gestores siguen montados y conservan precios, fórmulas y marcas al cambiar de sección. Solo se añade una clave a un elemento decorativo; no se remonta ningún gestor. Las animaciones de los gestores no usan transformaciones para no desplazar las ventanas emergentes que se posicionan respecto a la pantalla.

El reloj, el saludo, el menú y sus estados no escriben datos de negocio. Se observan los eventos existentes de sincronización sin añadir peticiones de guardado ni cambiar la cola. PostgreSQL, permisos, fuentes de precios, cierres y exportaciones conservan su lógica.

## Mensaje para Yanfri

Renovamos la imagen completa con cristal y los colores de AREA117, incluido el acceso con gasolinera interactiva. Ahora el menú es una isla flotante arriba: pasa el ratón o púlsala para desplegar las secciones. Muestra la hora, dónde estás trabajando y si los cambios se están guardando, quedaron confirmados en PostgreSQL o siguen pendientes. Las opciones y los cambios de ventana tienen animaciones suaves; también funciona con teclado y móvil. Se mantienen los precios, las fórmulas, las marcas amarillas y las exportaciones. Esta versión aparece en las novedades y en el Historial de versiones.

## Verificación

- 38 pruebas unitarias, comprobación TypeScript y compilación de producción correctas.
- 22 casos únicos de navegador comprobados sobre PostgreSQL aislado. Se conservaron las pruebas de negocio y se adaptó únicamente el acceso a las secciones al menú desplegable.
- La batería completa confirmó 21 casos; tras corregir el espacio de cabecera, los dos casos del notch pasaron. También se repitieron los recorridos de acceso, ocho módulos, estilos de impresión y novedades con resultado correcto.
- Navegación con ratón, fijación al pulsar, Escape, retorno de foco, Tab, movimiento reducido, móvil y once anchos entre 320 y 1920 píxeles. Sin superponer el botón cerrado a historial, fecha o cierre de sesión.
- Guardado retenido para verificar que el aviso espera al servidor; error 503 para comprobar el estado pendiente; recuperación, navegación y recarga conservando la edición confirmada.
- Se corrigió el apilamiento de la animación para que el diálogo EFI conserve prioridad sobre la cabecera. Las novedades se presentan fuera de la cabecera translúcida para ocupar correctamente toda la pantalla.
- Rendimiento con 190 fórmulas y CPU limitada a cuatro veces más lenta: máximo observado de 445 ms por edición, dentro del límite de 500 ms.
