# Init Guide — Frontend Setup from Scratch

## 1. Create Vite + React + TypeScript project

```bash
npm create vite frontend -- --template react-ts
cd frontend
```

This creates a `frontend/` directory with basic Vite setup (react-ts template).

---

## 2. Install dependencies

Install all packages listed below **with exact versions** (no `^` or `~`).

### Core dependencies
```bash
npm install react@19.2.8 react-dom@19.2.8 react-router-dom@7.18.2 recharts@3.10.1 lucide-react@1.31.0 class-variance-authority@0.7.1 clsx@2.1.1 tailwind-merge@3.6.0 tw-animate-css@1.4.0 @base-ui/react@1.7.0 @fontsource-variable/geist@5.3.0
```

### Dev dependencies
```bash
npm install -D tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 typescript@7.0.2 vite@8.2.1 @vitejs/plugin-react@6.0.5 oxlint@1.78.0 @types/react@19.2.18 @types/react-dom@19.2.4 @types/node@24.13.3 @types/react-router-dom@5.3.3 shadcn@4.18.0
```

**IMPORTANT:** After installation, verify no version has `^` or `~`. Edit `package.json` manually if needed — only accept exact values e.g. `"typescript": "7.0.2"`.

---

## 3. Configure Tailwind CSS v4

Tailwind v4 does NOT need `tailwind.config.js`. Configuration goes in CSS:

### `src/index.css`
Add this at the very top of the existing content:
```css
@import "tailwindcss";
```
Keep everything else as-is (Vite template default styles).

---

## 4. Update Vite config for path aliases

### `vite.config.ts`
Replace content with:
```typescript
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

## 5. Configure TypeScript

### `tsconfig.app.json`
Replace content with:
```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Path aliases */
    "paths": {
      "@/*": ["./src/*"]
    },
    "ignoreDeprecations": "6.0",

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

Key flags:
- `erasable_syntax_only`: Protects against accidentally using types at runtime
- `verbatim_module_syntax`: Strict import handling
- `allow_arbitrary_extensions`: Allows `.css` imports for Tailwind
- `no_emit: true`: Vite handles JS output, TS only checks types
- `paths`: Enables `@/components/ui/button` → `frontend/src/components/ui/button`

---

## 6. Install shadcn/ui components

### Создать скрипт для shadcn/ui

CLI shadcn/ui интерактивный — запрашивает ответы на вопросы при каждом запуске.

Необходим автоскрипт который подставляет ответы за пользователя:

1. `printf 'Y\n'` — разрешить создание components.json
2. `printf '0\n'` — выбрать Base UI (первый вариант в списке component library)
3. `printf ''` (пустая строка) — принять значения по умолчанию

Пример использования:

```bash
cd frontend
npx shadcn@l4.18.0 init -d
npx shadcn@4.18.0 add button card slider input label separator --yes 2>&1 <<< ""
```

Альтернативно можно использовать expect:

```bash
expect -c "
  spawn npx shadcn@latest init -d
  expect {
    \"Proceed?\" { send \"Y\\r\"; exp_continue }
    \"Select Component Library\" { send \"0\\r\" }
  }
"
```

### Установка shadcn
```bash
npx shadcn@l4.18.0 add button card slider input label separator --yes
```

Всегда выбираем **Base UI** как рекомендуемый вариант component library используя скрипт для shadcn (описан выше).

**⚠️ SHADCN BUG FIX — CRITICAL:**
- shadcn CLI will likely create a folder named `@/` inside `frontend/` instead of `frontend/src/components/ui/`
- This is because it's trying to write to `@/components/ui/` path which resolves outside src folder
- Fix it by moving files manually:

```bash
# Move everything from @/ to src/
cp -R @/* src/
# Remove the empty @/ folder
rm -rf @/
# Add @/ to .gitignore so it's never committed
echo "@/!/" >> .gitignore
```

After installing components, verify they exist at:
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/separator.tsx`


---

## 7. Cleanup

Remove the leftover package-lock.json before committing. The one created by shadcn init may have been generated after our manual edits:

```bash
# Verify build works
npm run build && npm run lint
```

Expected output:
- Build succeeds (~200ms)
- Only warning: `button.tsx:58:18: warning react(only-export-components)...` — this is normal and expected from shadcn's `buttonVariants` function

---

## Complete package.json reference

After all installations, `package.json` should look like this (exact versions):

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "@base-ui/react": "1.7.0",
    "@fontsource-variable/geist": "5.3.0",
    "@types/react-router-dom": "5.3.3",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "lucide-react": "1.31.0",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-router-dom": "7.18.2",
    "recharts": "3.10.1",
    "shadcn": "4.18.0",
    "tailwind-merge": "3.6.0",
    "tw-animate-css": "1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "4.3.3",
    "@types/node": "24.13.3",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "@vitejs/plugin-react": "6.0.5",
    "oxlint": "1.78.0",
    "tailwindcss": "4.3.3",
    "typescript": "7.0.2",
    "vite": "8.2.1"
  }
}
```
