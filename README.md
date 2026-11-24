# 🎁 Amigo Secreto – Navidad

App estática (HTML + CSS + JS) con base de datos gratuita en Firebase (Firestore, plan Spark).
No requiere tarjeta ni pagos.

## 1) Ver la app en VS Code (modo de prueba)
1. Instala la extensión **Live Server** en VS Code.
2. Clic derecho en `index.html` → **Open with Live Server**.
3. Sin configurar Firebase funciona en *modo de prueba* (guarda solo en tu navegador).
   > Abrir el archivo con doble clic no funciona porque usa módulos JS; usa Live Server.

## 2) Crear la base de datos gratis (Firebase)
1. Entra a https://console.firebase.google.com con tu cuenta Google → **Agregar proyecto** (desactiva Google Analytics).
2. En el proyecto: **Compilación → Firestore Database → Crear base de datos**.
   Elige ubicación (ej. `us-east1`) y **modo producción**.
3. Pestaña **Reglas**: pega el contenido de `firestore.rules` → **Publicar**.
4. Engranaje ⚙️ → **Configuración del proyecto** → sección *Tus apps* → icono **`</>` (Web)** → registra la app (sin Hosting).
5. Copia el objeto `firebaseConfig` y pégalo en `firebase-config.js`.
6. Recarga con Live Server: el aviso amarillo de "modo de prueba" desaparece.

> Las imágenes se reducen automáticamente y se guardan dentro de Firestore (no se usa Firebase Storage, que ya pide plan de pago).
> Los valores de `firebaseConfig` no son secretos; las reglas son las que protegen la base.

## 3) Publicar en GitHub Pages
1. Crea un repositorio en GitHub (en el plan gratis Pages requiere que sea **público**) y sube estos archivos.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. En 1-2 minutos tendrás el enlace `https://TU-USUARIO.github.io/NOMBRE-REPO/`. Compártelo por WhatsApp.
   (El repo es público, pero solo entra quien tenga el enlace de la página.)

## Uso
- **Mis regalos**: elegir nombre → avatar → gustos y 3 opciones → *Guardar*. Para editar, vuelve a elegir tu nombre: se cargan tus datos; cambia o borra lo que quieras y guarda otra vez.
- **Lista del grupo**: tabla con todos; en celular se muestra como tarjetas. Clic en la imagen para ampliarla, *Cerrar* para volver.

## Mantenimiento
- Cambiar participantes: edita `PARTICIPANTS` en `app.js` **y** la lista de ids en `firestore.rules`.
- Aviso: cualquiera con el enlace puede editar la ficha de cualquier nombre (es una app recreativa, sin contraseñas).
