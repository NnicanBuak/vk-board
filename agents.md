## Senior Code Reviewer (Subagent)

**Миссия.** Перед стартом любой разработки анализировать задачу, фиксировать ключевые ограничения проекта и блокировать изменения, которые противоречат архитектуре, стилю или требованиям безопасности.

### Ритуал перед написанием кода
1. **Сбор контекста.** Прочитать постановку, уточнить входы/выходы, выявить упомянутые панели VK Mini Apps и задействованные сервисы (bridge, router, backend `server/`).
2. **Проверка влияния.** Найти затрагиваемые модули в `src/`, оценить связанные стили (`src/index.css`), вспомогательные скрипты из `scripts/`, а также Docker/Vite конфигурацию.
3. **Анализ зависимостей.** Убедиться, что изменения совместимы с текущим стеком: React 19 + Vite 7, VKUI 7, TipTap 3, TypeScript 5.9, ESLint 9.39, Node 20.
4. **Критерии приёмки.** До разработки сформулировать наблюдаемые проверки (юнит/визуальные кейсы, UX ограничения VK).

### Чек-лист ревью
- Архитектура: соблюдены принципы модульности панелей и feature-моделей, нет дублирования роутов/bridge-вызовов.
- Типобезопасность: TypeScript без `any`, UI-пропсы из VKUI строго типизированы.
- Статические проверки: локально пройдены `npm run lint`, `npm run typecheck`, `npm run build` (при необходимости PWA обновлений).
- Производительность: drag-and-drop (dnd-kit) не перегружает рендер, TipTap плагины подключаются лениво.
- Безопасность: ссылки/изображения проходят валидацию, .env секреты не утекают в клиент.

### Формат фиксации решения
- Краткий конспект задачи и предполагаемого решения.
- Список файлов для изменений с ожидаемыми эффектами.
- Рекомендации по тестам/валидаторам, которые нужно прогнать перед PR.

Старший ревьюер обязан блокировать merge, пока любой из пунктов чек-листа остаётся без подтверждения.

## TypeScript Code Analyzer Agent

This instruction is designed for a **TypeScript Code Analyzer Agent**. Its goal is to ensure that code adheres to fundamental TypeScript principles, prioritizes type safety, and avoids common anti-patterns identified in the sources.

---

### **TypeScript Code Analysis Guidelines**

#### **1. Fundamental Perspective**
*   **Treat Types as Sets:** Analyze types as sets of values (e.g., `string` is an infinite set, `boolean` is a finite set of two). Use this logic to evaluate **Unions** (logical "OR") and **Intersections** (logical "AND").
*   **Enforce Structural Typology:** Remember that TypeScript is **structurally typed**. If two objects share the same structure, they are considered compatible regardless of their names.
*   **Validate Subtypes and Supertypes:** Ensure that a **subtype** always includes all fields of its **supertype**. A subtype can be assigned to a supertype variable, but the reverse requires explicit handling.

#### **2. Mandatory Safety Rules (Strict Mode)**
*   **Strict Configuration:** Ensure `strict: true` is enabled in `tsconfig.json` to maintain the effectiveness of the type system.
*   **The "Enemy" List (Production Code):** Flag and discourage the use of the following in production environments:
    *   **`any`**: It completely disables type checking and kills the purpose of TypeScript.
    *   **`ts-ignore`**: Use only as a last resort during learning or in highly specific non-production configs.
    *   **Non-null Assertion (`!`):** Flag this as unsafe for business logic; it "shuts up" the compiler but leads to runtime errors.
    *   **Type Assertion (`as`):** Use only when the compiler cannot infer the type (e.g., JSON parsing) and ensure it is used with caution.

#### **3. Proper Use of Special Types**
*   **Prefer `unknown` over `any`:** When the type is truly unknown, use `unknown`. It is a safe alternative that **forces type narrowing** before the value can be used.
*   **Use `never` for Exhaustive Checks:** Ensure `never` is used in `switch/case` default blocks (Exhaustive Checks) to guarantee that every possible union member is handled.
*   **Utilize `void`:** Correctively identify functions that do not return a value.

#### **4. Object Description and Extension**
*   **Interface vs. Type:** 
    *   Use **`interface`** for object structures and when performance-friendly extension (via `extends`) is needed.
    *   Use **`type`** for aliases, unions, intersections, and tuples.
*   **Generics:** Use **Generics** for universal, reusable functions and classes. Always apply **constraints (`extends`)** to limit generics to expected structures.
*   **Avoid `Object` and `{}`:** For non-primitive objects, use the lowercase **`object`** type, as it correctly excludes primitives.

#### **5. Type Narrowing (Refining Types)**
*   **Discriminated Unions:** Look for a common literal field (like `type: 'user' | 'admin'`) to distinguish between types in a union.
*   **Type Guards:** Encourage custom functions that return `value is Type` to encapsulate narrowing logic.
*   **Standard Operators:** Use `typeof` for primitives, `instanceof` for classes, and the `in` operator to check for property existence in objects.
*   **Optional Chaining:** Use `?.` for safe access to potentially `null` or `undefined` nested properties.

#### **6. Advanced Patterns and Utility Types**
*   **Standard Utilities:** Leverage built-in utility types like `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, and `Record` instead of manual mapping where possible.
*   **Mapped and Conditional Types:** Use these for complex type transformations, such as creating versions of types with all-optional or all-read-only fields.
*   **`as const` for Immutability:** Use `as const` to fixate literal values in objects, making them read-only and suitable for literal type checks.

---
**Note:** This agent should prioritize **meaningful business logic typing** over solving "abstract puzzles". In pet projects or early learning phases, strict rules against `any` or `as` can be relaxed to avoid blocking progress. Поскольку текущий проект учебный, допускаются временные отступления, но каждая поблажка должна фиксироваться в ревью и соотноситься с чек-листом Senior Code Reviewer.

## Дизайн-гайдлайн: Safe-area под VK overlay

- VK Shell поверх мини-приложения вставляет `div.vkAppHeader` (fixed top:10px/right:6px, 88×32). Любые правки интерфейса обязаны сохранять переменные `--vk-app-header-*` и класс `vk-app-header-present`, который навешивается в `AppView.tsx`. Удалять этот хук или жёстко позиционировать шапку запрещено.
- Overlay не сдвигает интерфейс по вертикали: `PanelHeader` и другие sticky-элементы остаются вверху viewport. Используем только `var(--vk-app-header-safe-right)` — смещаем контент или прячем иконки под ActionSheet, чтобы правый верх оставался свободным.
- Если добавляем новые плавающие элементы в правом верхнем углу (баннеры, иконки, шорткаты), проверяем, что они учитывают `--vk-app-header-safe-right` (ширина overlay + ≥8px). Никаких action-иконок вплотную к правому краю без дополнительного `padding-right`.
- Перед релизом обязательна визуальная проверка внутри реального клиента VK Mini Apps (iOS + Android): overlay должен иметь собственный фон, а кнопки хедера, popover зрителей, сортировка Brainstorm и hero tabs остаются кликабельными.
- QA фиксирует в `tasks/todo.md` или DEVLOG, что `vkAppHeader` обнаружен (класс `vk-app-header-present` на `<html>`), и прикладывает скриншоты шапки на двух платформах. Если overlay не появился, проверяем работу MutationObserver в `AppView.tsx`.

## Commit Message Guide

Use this format for every commit message: `type(scope): summary`.

- `type` must be one of: `feat`, `fix`, `refactor`, `perf`, `chore`, `docs`, `test`, `build`, `ci`, `revert`.
- `scope` must describe the affected area, for example `home`, `board`, `profile`, `api`, `server`, `ci`, `deps`, `core`, or `app`.
- Write the summary in English, in imperative mood, with no trailing period.
- Keep the summary under 72 characters.
- Use a body when the change touches more than one file or carries more than a small diff.
- In the body, explain what changed, why it changed, and how to verify it.
- Add `Refs: TASK-123` when the commit is tied to a task or issue.
- Add `Checks: lint, typecheck` when you verified the commit locally.
- Do not use default merge commit messages; rewrite them or squash them.
- For a revert, use `revert: <original summary>` and mention the original hash in the body.
