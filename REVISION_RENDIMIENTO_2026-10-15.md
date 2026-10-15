# Lentitud al editar — v1.5.4

## Causa y corrección

1. Cada fórmula reconstruía, recorría y ordenaba miles de variables, aunque usara una sola referencia absoluta como `[COMPRAS:TORREJON:P_VENTA]`. Las referencias absolutas ahora se resuelven directamente por clave. Las fórmulas relativas y sin corchetes conservan su resolución de alias, y se mantiene la validación matemática.
2. Compras, Postes, Sábana, PDFs y EFI renderizaban todas sus tablas aun estando ocultas. Los gestores y sus efectos de datos siguen montados para conservar edición, marcas, filtros y cálculo compartido, pero solo se renderiza la tabla de la ventana activa. La vista previa EFI se construye al abrir EFI; las exportaciones siguen calculándose con los datos vigentes.
3. Consultas de Tarifa 60 y tarifas especiales interpretaban repetidamente las mismas tablas JSON completas. Las tablas de consulta de solo lectura se interpretan una vez y se invalidan al reemplazar o eliminar su clave en la copia de trabajo. Los objetos editables siguen usando copias independientes.

## Medición reproducible

Se descargó una copia del estado actual (184 claves, aproximadamente 5,8 MB y 190 fórmulas personalizadas) para cargarla exclusivamente en el PostgreSQL aislado de Playwright. No se incluye esa copia en Git. La prueba limita Chromium a una CPU cuatro veces más lenta y mide cinco ediciones desde el evento `input` hasta dos frames de animación, con perfil de CPU activo.

| Medida | v1.5.3 | Cambio propuesto |
| --- | ---: | ---: |
| Tiempo por edición | 15.704–22.128 ms | 72–194 ms |
| Cinco ediciones, tiempo total | 97.699 ms | 931 ms |
| Llamadas a JSON.parse durante la medición | 4.887 | 341 |

Estos tiempos corresponden al mismo equipo, datos y limitación de CPU; no son una garantía de tiempo de red ni de todos los dispositivos. El mayor coste del perfil inicial era el evaluador de fórmulas. La prueba de regresión exige menos de 500 ms por edición bajo esa limitación y comprueba el precio final en PostgreSQL.

La suite habitual genera 190 fórmulas sintéticas. Para repetir la comparación con una copia privada se puede pasar `AREA117_PROFILE_SNAPSHOT` apuntando al archivo local antes de ejecutar `npx playwright test tests/e2e/edit-performance.spec.ts`. El servidor de pruebas siempre utiliza su propio PostgreSQL aislado; la prueba restaura su estado al terminar.

Validación final: 20 pruebas de lógica y 13 de navegador aprobadas, compilación de producción y TypeScript correctos. Una comparación adicional de las 190 fórmulas actuales contra el evaluador anterior produjo exactamente los mismos resultados. Se mantienen las comprobaciones de persistencia en PostgreSQL, cálculo entre ventanas, cierre y Excel, conflictos concurrentes y navegador sin espacio.
