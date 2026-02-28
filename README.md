# Librain

Librain es una aplicación Next.js 16 enfocada en convertir entradas no estructuradas (URL, texto, archivos) en prioridades accionables usando IA.

Combina:

- Espacio de trabajo personal autenticado.
- Generación de metadatos de tareas asistida por IA (título, estado de madurez, puntuación, resumen breve).
- Recomendación diaria basada en la puntuación de prioridad.
- Asistente integrado en la app (Librain AI) con orientación sobre el producto.

## 1) Alcance del producto

### Qué hace actualmente la app

- Autenticación de usuario con email/contraseña, Google y GitHub (Better Auth).
- Espacio de trabajo protegido con aislamiento de tareas por usuario.
- Ingesta de tareas desde:
  - URL
  - Texto libre
  - Archivo (PDF, imagen, audio)
- Enriquecimiento IA para cada tarea:
  - `name`
  - `score` (`0-100`)
  - `descriptionIA` (resumen breve)
- Acciones sobre el ciclo de vida de la tarea:
  - alternar completado
  - eliminar tarea
- Vista diaria mostrando la tarea de mayor prioridad.
- Página de perfil con preferencias editables.
- Chat Librain AI embebido para soporte sobre el producto.

### Qué no hace actualmente la app

- Editar tareas existentes (no hay endpoint PUT/PATCH de tarea).
- Cambiar foto de perfil, nombre de usuario o email desde la UI.
- Cambiar contraseña o eliminar cuenta desde la UI.
- Subir archivo de video directamente a `/api/task` (solo URL de video).
- Extraer y resumir automáticamente páginas web genéricas desde URL.
- Acciones masivas, filtrado avanzado, exportar/importar, recordatorios, notificaciones.
- Historial de chat persistente tras recargar/cerrar sesión.

## 2) Resumen de arquitectura

### Runtime y framework

- Next.js `16.1.6` (App Router).
- React `19.2.3`.
- Node.js para rutas API (`runtime = "nodejs"`).

### Datos y autenticación

- MongoDB vía:
  - driver `mongodb` para el adaptador Better Auth (`src/db/db.ts`)
  - `mongoose` para el modelo de dominio de tareas (`src/db/dbConnect.ts`, `src/db/Models/Task/Task.model.ts`)
- Better Auth gestiona endpoints de sesión/autenticación en `src/app/api/auth/[...all]/route.ts`.
- Protección de rutas gestionada por `src/proxy.ts`.

### Proveedores IA

- Google Gemini (`@google/generative-ai`):
  - puntuación/clasificación de metadatos de tarea (`src/lib/gemini.ts`)
  - respuestas del asistente (`src/lib/librainGemini.ts`)
  - interpretación de URL de video en `/api/task`.
- Groq (`groq-sdk`):
  - análisis de imagen / extracción tipo OCR
  - transcripción de audio.

### Flujo alto nivel (creación de tarea)

1. El cliente envía la entrada desde `src/components/AddTask/mainComponent.tsx`.
2. `POST /api/task` valida autenticación/sesión y normaliza la entrada.
3. Extracción de contenido por tipo:
   - PDF vía `unpdf`
   - imagen vía modelo de visión Groq
   - audio vía Groq Whisper
   - video vía Gemini solo si la URL apunta a extensión de video
   - URL genérica => se almacena como texto plano `URL: ...`
4. El texto extraído se envía a `generateStoredMetadata(...)`.
5. La tarea se persiste en MongoDB con los metadatos calculados.
6. La página principal (`/`) lee las tareas ordenadas por `score desc`.

### Flujo alto nivel (asistente)

1. El usuario envía mensaje en `src/components/IAButton.tsx`.
2. `POST /api/librain-assistant` valida sesión, normaliza historial, inyecta contexto de ruta + preferencias.
3. `askLibrainAssistant(...)` genera respuesta con conocimiento del producto + restricciones.

## 3) Estructura del repositorio

```text
src/
  app/
    (auth)/
      login/
      register/
      profile/
    actions/addTask/
    about/
    daily/
    api/
      auth/[...all]/route.ts
      task/route.ts
      task/[id]/route.ts
      librain-assistant/route.ts
    layout.tsx
    page.tsx
  actions/
    profile/managePreferences.ts
    tasks/toggleCompleted.ts
  components/
    AddTask/mainComponent.tsx
    Tasks/
    io/
    IAButton.tsx
    app-sidebar.tsx
  db/
    Models/Task/Task.model.ts
    db.ts
    dbConnect.ts
  lib/
    auth.ts
    auth-client.ts
    gemini.ts
    librainGemini.ts
    ExtractInfo/
proxy.ts
```

## 4) Contratos de API

### `POST /api/task`

Crea una tarea desde JSON (`url|text`) o multipart (`file`).

#### Cuerpo JSON

```json
{
  "resource": "url | text",
  "value": "...",
  "description": "contexto opcional"
}
```

#### Cuerpo multipart

- `resource = file`
- `description`
- `value` (nombre de archivo)
- `file`

#### Respuesta exitosa

```json
{
  "stored": { "_id": "..." },
  "ai": { "fallback": false, "error": null }
}
```

### `DELETE /api/task/:id`

Elimina una tarea propiedad del usuario autenticado actual.

### `POST /api/librain-assistant`

Cuerpo:

```json
{
  "message": "...",
  "currentRoute": "/profile",
  "history": [{ "role": "user", "content": "..." }]
}
```

Respuesta:

```json
{ "answer": "..." }
```

### `GET|POST|DELETE /api/auth/*`

Gestionado por el handler Better Auth.

## 5) Variables de entorno

Configura estas variables antes de ejecutar la app:


| Variable               | Requerido                             | Descripción                                           |
| ---------------------- | ------------------------------------- | ------------------------------------------------------ |
| `BETTER_AUTH_SECRET`   | Sí                                   | Secreto usado por Better Auth.                         |
| `BETTER_AUTH_URL`      | Sí                                   | URL base pública (ejemplo:`https://app.ejemplo.com`). |
| `MONGODB_URI`          | Sí                                   | Cadena de conexión Mongo.                             |
| `GITHUB_CLIENT_ID`     | Opcional                              | Solo requerido si se habilita login con GitHub.        |
| `GITHUB_CLIENT_SECRET` | Opcional                              | Solo requerido si se habilita login con GitHub.        |
| `GOOGLE_CLIENT_ID`     | Opcional                              | Solo requerido si se habilita login con Google.        |
| `GOOGLE_CLIENT_SECRET` | Opcional                              | Solo requerido si se habilita login con Google.        |
| `GROQ_API_KEY`         | Sí (para imagen/audio)               | API key de Groq para extracción multimodal.           |
| `GEMINI_API_KEY`       | Sí (para puntuación/chat/video URL) | API key de Gemini para metadatos y asistente.          |

## 6) Desarrollo local

### Prerrequisitos

- Node.js 20+
- pnpm (recomendado)
- Docker (para MongoDB local)

### Pasos

1. Instala dependencias:
   ```bash
   pnpm install
   ```
2. Inicia MongoDB:
   ```bash
   docker compose up -d mongodb
   ```
3. Crea `.env` desde `.env.template` y completa los valores requeridos.
4. Ejecuta la app:
   ```bash
   pnpm dev
   ```
5. Abre `http://localhost:3000`.

## 7) Despliegue en producción

### Despliegue en contenedor

- Construye la imagen:
  ```bash
  docker build -t librain:latest .
  ```
- Ejecuta el contenedor con variables de entorno de producción:
  ```bash
  docker run -p 3000:3000 --env-file .env librain:latest
  ```

El Dockerfile ya usa build multi-etapa y usuario no root (`nextjs`).

### Despliegue sin contenedor

- Construye:
  ```bash
  pnpm build
  ```
- Inicia:
  ```bash
  pnpm start
  ```
