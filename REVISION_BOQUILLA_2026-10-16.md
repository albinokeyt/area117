# Conecta la boquilla para entrar — v1.6.4

Se sustituye el pictograma de una gasolinera por una boquilla SVG con tubo metálico, cubierta azul y roja, empuñadura, gatillo y unión de la manguera. La punta coincide con la posición del gesto; la manguera termina en la base de la empuñadura y el dibujo escala con la escena.

Se eliminan Acceder directamente y la apertura desde el logo. El formulario permanece oculto hasta conectar la boquilla a la toma del coche. Un clic sin desplazamiento, una suelta lejos de la toma o una confirmación de teclado desde el surtidor no abren el formulario.

El arrastre conserva el lugar donde se agarró la pieza y captura el puntero. La última posición se consulta desde una referencia síncrona para no perder la actualización final de un gesto rápido. Cancelar el gesto o perder la captura devuelve la boquilla al surtidor. Con teclado, las flechas desplazan la misma pieza; Enter o Espacio conectan únicamente junto a la toma, y Escape restablece su posición.

La conexión revela los campos y enfoca el usuario. No autentica ni envía credenciales: estas siguen comprobándose mediante la API habitual al pulsar Iniciar Sesión. Se mantiene la transición de 3,5 segundos del coche después de una autenticación correcta, incluida la carga paralela de PostgreSQL y el movimiento reducido. Los datos, permisos y cálculos permanecen intactos.

Durante el fundido al sistema, los controles permanecen inertes y deshabilitados de forma nativa hasta completar la entrada. Esto evita que herramientas de autocompletado o pruebas automáticas intenten editar mientras la escena todavía ocupa la pantalla.

## Mensaje para Yanfri

Quitamos el acceso directo del login y el atajo del logo. Ahora hay una boquilla de combustible reconocible: arrástrala hasta la toma señalada del coche para que aparezcan el usuario y la contraseña. También funciona con el dedo. Con teclado, mueve la boquilla con las flechas y pulsa Enter junto a la toma. Si cancelas o la sueltas lejos, vuelve al surtidor. Después de iniciar sesión se mantiene la animación del coche hacia la pantalla.

## Verificación

- 38 pruebas unitarias, TypeScript y compilación de producción correctos.
- 27 casos únicos de navegador verificados en PostgreSQL aislado, ejecutados en grupos visuales y de negocio. Después de reforzar el bloqueo nativo durante el fundido, se repitieron 13 casos de precios, transición y experiencia visual: todos correctos.
- Arrastre real con ratón, gesto táctil real con cancelación y reconexión, teclado tras una suelta fallida, ausencia de accesos desde botón o logo y confirmación sin desplazar la boquilla.
- El formulario mantiene la misma carga útil de credenciales y no la envía al conectar. Se conservan el móvil, los ocho módulos, las preferencias de movimiento reducido y los estilos de impresión.
- La transición conserva sus 3,5 segundos, novedades posteriores, sesión restaurada, espera de datos y recuperación. Durante la salida, el sistema se ve por debajo pero los campos siguen deshabilitados hasta terminar.
- Persistencia, conflictos, cierre de día, EFI/Excel/CSV y 2.600 celdas PDF correctos. La medición con 190 fórmulas y CPU cuatro veces más lenta se mantuvo dentro de 500 ms (máximo observado: 480 ms).
