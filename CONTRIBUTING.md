# Guía de Ramificación y Flujo de Trabajo — ERP Business

Procedimiento obligatorio para trabajar en equipo sin romper el código ni pisar el trabajo del otro.

## Principios

1. **`main` siempre debe funcionar.** Nunca se hace push directo a `main`; todo entra por Pull Request.
2. **Una feature = una rama.** Cada tarea vive en su propia rama, pequeña y de corta duración (ideal: menos de una semana).
3. **Monorepo:** el frontend vive en `frontend-vue/` y el backend en `backend/`, ambos dentro de este repositorio.
4. **Comunicar antes de empezar.** Avisa en qué módulo vas a trabajar para no duplicar esfuerzo ni generar conflictos.

## Nomenclatura de ramas

Formato: `tipo/descripcion-corta-en-ingles` (kebab-case, en inglés).

| Prefijo    | Uso                                          | Ejemplo                          |
| ---------- | -------------------------------------------- | -------------------------------- |
| `feature/` | Funcionalidad nueva                          | `feature/customers-crud`         |
| `fix/`     | Corrección de un bug                         | `fix/invoice-total-rounding`     |
| `chore/`   | Mantenimiento (deps, configs, tooling)       | `chore/update-tailwind`          |
| `docs/`    | Documentación                                | `docs/branching-guide`           |

## Procedimiento paso a paso

### 1. Antes de empezar cualquier trabajo

Parte SIEMPRE desde `main` actualizada — nunca desde otra rama de feature:

```bash
git checkout main
git pull origin main
git checkout -b feature/nombre-descriptivo
```

### 2. Durante el desarrollo

- Haz **commits pequeños y frecuentes**, con mensajes en formato [Conventional Commits](https://www.conventionalcommits.org/):

  ```bash
  git add <archivos>
  git commit -m "feat(invoices): add credit terms validation"
  ```

  Tipos comunes: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.

- Haz **push temprano y seguido** (respaldo + visibilidad para el equipo):

  ```bash
  git push -u origin feature/nombre-descriptivo   # primera vez
  git push                                        # siguientes
  ```

- Si tu rama dura más de un par de días, **sincroniza con `main` regularmente** para evitar conflictos grandes al final:

  ```bash
  git fetch origin
  git merge origin/main   # resuelve conflictos ahora, cuando son pequeños
  ```

### 3. Antes de abrir el Pull Request

Verifica que no rompes nada:

```bash
cd frontend-vue/erp-business-frontend
pnpm type-check
pnpm build-only
```

Si algo falla, se corrige **antes** de abrir el PR.

### 4. Pull Request y merge

1. Push final y abre el PR en GitHub con base en `main`.
2. Describe **qué** hace el cambio y **cómo probarlo**.
3. El otro integrante revisa y aprueba (regla: nadie mergea su propio PR sin revisión).
4. Merge con **"Squash and merge"** (mantiene el historial de `main` limpio: un commit por feature).
5. Borra la rama en GitHub después del merge.

### 5. Después del merge

Limpia tu entorno local y vuelve a empezar el ciclo:

```bash
git checkout main
git pull origin main
git branch -d feature/nombre-descriptivo
```

## Cómo evitamos pisarnos

- **No trabajar dos personas en el mismo archivo/módulo a la vez.** Si es inevitable, coordinar y sincronizar con `main` a diario.
- **Ramas cortas.** Mientras más vive una rama, más diverge y más conflictos genera.
- **Nunca hacer `git push --force` sobre ramas compartidas** (y jamás sobre `main`).
- **No commitear:** `node_modules/`, `dist/`, archivos de editor, ni archivos `.env` (ya están en `.gitignore` — no los fuerces con `git add -f`).

## Resolución de conflictos (referencia rápida)

```bash
git fetch origin
git merge origin/main
# Git marca los archivos en conflicto:
git status
# Edita los archivos, elimina los marcadores <<<<<<< ======= >>>>>>>
git add <archivos-resueltos>
git commit
```

Si un conflicto es grande o tienes dudas, **pregunta antes de resolver a ciegas**: es más barato perder 10 minutos coordinando que perder el trabajo del otro.

## Chuleta de comandos

```bash
# Empezar feature
git checkout main && git pull origin main
git checkout -b feature/mi-feature

# Guardar avance
git add . && git commit -m "feat(scope): description"
git push

# Actualizar mi rama con main
git fetch origin && git merge origin/main

# Terminar (tras merge del PR)
git checkout main && git pull origin main
git branch -d feature/mi-feature
```
