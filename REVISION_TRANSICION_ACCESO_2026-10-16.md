# Transición de acceso — v1.6.3

Después de que la API confirme un inicio de sesión correcto, el coche se separa del surtidor, avanza hacia el primer plano y crece mientras la gasolinera desaparece. La escena dura 3 segundos y termina con una salida de 500 ms que revela el sistema ya cargado por debajo. Los datos se cargan en paralelo durante ese tiempo.

La transición no se ejecuta ante credenciales incorrectas ni al restaurar una sesión ya abierta. El usuario conserva el mensaje de error habitual del formulario. No se cambian la API, las credenciales, los permisos ni la sesión.

Si PostgreSQL tarda más que la animación, se mantiene «Cargando datos de PostgreSQL…». Si falla, se muestra el error y Reintentar conexión, que recarga usando la sesión ya autenticada. Los gestores solo se montan después de hidratar los datos, como antes; permanecen ocultos e inertes hasta terminar la entrada. Las novedades se solicitan después de la transición para no interrumpirla ni disputar el foco.

El reloj de la animación es estado temporal de presentación, sin persistencia. Las preferencias de movimiento reducido eliminan el desplazamiento y acortan la entrada a unos 250 ms una vez disponibles los datos. No se modifica ningún cálculo, precio, fuente de datos, guardado, cierre ni exportación.

## Mensaje para Yanfri

Ahora, al entrar con tu usuario y contraseña correctos, el coche arranca y avanza hacia la pantalla durante unos 3,5 segundos antes de abrir el sistema. Mientras tanto se cargan los datos. Si la conexión tarda, verás el aviso de carga; si falla, podrás reintentarlo. Al recargar una sesión abierta entrarás directamente, y las novedades aparecerán después de la animación.

## Verificación

- 38 pruebas unitarias, TypeScript y compilación de producción correctos.
- 26 casos únicos de navegador verificados en PostgreSQL aislado. La batería completa confirmó 24; las dos expectativas que dependían del momento anterior de entrada se ajustaron y se repitieron correctamente con los recorridos de edición, acceso e historial (8 casos).
- Tras afinar la salida, pasaron de nuevo los cuatro casos específicos: duración y acercamiento del coche, sistema visible pero inerte durante el fundido, novedades posteriores, sesión restaurada sin animación, datos lentos, fallo y reintento, credenciales inválidas y movimiento reducido en móvil.
- Guardado, cierres, fórmulas, 2.600 celdas PDF y exportaciones conservaron sus resultados. La edición con 190 fórmulas y CPU cuatro veces más lenta mantuvo un máximo observado de 377 ms, dentro de 500 ms.
- Se revisó el fotograma intermedio real y se guardó una captura. El código de autenticación y la API no se modificaron.
