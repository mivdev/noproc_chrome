# Justificativos para Chrome Web Store - NoProc

Copia y pega estos textos en los campos correspondientes durante el proceso de publicación.

## Propósito Único (Single Purpose)
> NoProc es una herramienta de productividad diseñada exclusivamente para bloquear sitios web distractores y registrar el tiempo de enfoque del usuario mediante reportes visuales.

## Justificación de Permisos

### storage
> Se utiliza para guardar la configuración del usuario, la lista personalizada de sitios bloqueados (blacklist) y el historial de progreso de tiempo enfocado. Es esencial para que el usuario no pierda su progreso al cerrar el navegador.

### alarms
> Se utiliza para crear un proceso de fondo (heartbeat) que registra el tiempo de enfoque de manera precisa cada minuto, incluso cuando el popup está cerrado. También permite gestionar el cambio de día a medianoche para estadísticas diarias correctas.

### notifications
> Se utiliza para alertar al usuario cuando inicia o finaliza una sesión de enfoque exitosamente, o para enviar recordatorios motivadores cuando entra en un sitio prohibido.

### scripting
> Permite inyectar la lógica de bloqueo y los estilos visuales (escudo de enfoque) en las pestañas abiertas. Esto garantiza que la extensión sea efectiva inmediatamente al activarse sin necesidad de recargar las páginas.

### tabs
> Se utiliza para identificar las pestañas activas y detectar cambios de URL en tiempo real. Esto permite determinar si el sitio actual está en la lista negra y enviar mensajes de actualización del estado del temporizador a todas las páginas abiertas.

### Permiso de host (<all_urls>)
> Dado que la extensión permite a los usuarios elegir libremente qué sitios web desean bloquear para su productividad, se requiere acceso a todos los hosts. Esto permite que el sistema de detección funcione sobre cualquier dominio que el usuario añada dinámicamente a su configuración personal.

---

## ¿Usas código remoto?
**Seleccionar: NO**
*Justificación:* Todo el código de la extensión (lógica, estilos e interfaz) se encuentra incluido dentro del paquete de la extensión. No se carga contenido ejecutable desde servidores externos.
