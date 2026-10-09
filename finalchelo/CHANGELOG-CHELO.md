# Chelo Obfuscator — cambios de mantenimiento

## Correcciones aplicadas
- Los fallos del runtime ya generan errores explícitos en vez de entrar en bucles infinitos que pueden congelar el cliente.
- Se corrigió el registro de fallos de las sondas anti-dump para no insertar un valor `nil` en la tabla de resultados.
- El historial ahora conserva el contenido de archivos `.luac` codificado en Base64 y puede restaurarlo.
- Se limita la carga de archivos a 512 KB para reducir el riesgo de agotar el almacenamiento local del navegador al guardar el historial.

## Importante
Estas correcciones no certifican la equivalencia semántica de todos los programas Lua/Luau ni demuestran que las medidas anti-dump/anti-hook resistan análisis. Antes de publicar una versión de producción hay que instalar dependencias, ejecutar `npm run typecheck`, `npm test`, `npm run lint` y `npm run build`, y probar la salida en cada runtime anunciado. La ejecución de los scripts generados debe hacerse únicamente en un entorno controlado.
