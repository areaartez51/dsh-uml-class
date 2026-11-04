# `@areaartez51/dsh-uml-class`

Skill-плагин для DeepSeek Harness: диаграммы классов (UML) из JSON-описания.
Построенный документ — один автономный HTML-файл с инлайн-SVG, зумом, темами,
подсветкой связей по наведению и раскрытием узлов.

Плагин не добавляет нативных инструментов и не делает сетевых запросов: он регистрирует
файловый скилл `uml-class` через `@deepseek-ai/dsh-skill-filesystem`, а всю работу выполняет
CLI внутри скилла.

## Установка

**Из GitHub Release** (рекомендуется, без npm-аккаунта):

```bash
dsh plugin --profile desktop add https://github.com/areaartez51/dsh-uml-class/releases/download/v0.20.3/areaartez51-dsh-uml-class-0.20.3.tgz
```

**Из локального архива:**

```bash
dsh plugin --profile desktop add C:\path\to\areaartez51-dsh-uml-class-0.20.3.tgz
```

**Сборка архива из исходников:**

```bash
npm pack     # → areaartez51-dsh-uml-class-0.20.3.tgz, 35 файлов
```

Затем перезапустите DSH: скилл `uml-class` появится в каталоге скиллов профиля `desktop`.

Удаление:

```bash
dsh plugin --profile desktop remove @areaartez51/dsh-uml-class
```

## Использование

Из C#-проекта спека собирается автоматически:

```bash
cd skills/uml-class
node bin/uml.mjs extract csharp /path/to/Assets/Scripts --out spec.json --stats
node bin/uml.mjs render class spec.json out/classes.html
node bin/uml.mjs check out/classes.html
```

`--package-by auto` группирует классы по папкам, если во всём проекте один namespace, иначе
по namespace. `--include`/`--exclude` принимают glob-шаблоны. `--calls` добавляет зависимости
по вызовам внутри методов, `--no-fields` и `--no-deps` убирают связи от полей и параметров.

Вручную или для других языков:

```bash
cd skills/uml-class
node bin/uml.mjs validate examples/payments.json
node bin/uml.mjs render class examples/payments.json out/payments.html
node bin/uml.mjs check out/payments.html
```

`render` рядом с HTML кладёт `<имя>.receipt.json`: версия инструмента, sha256 артефакта,
число классов и связей, предупреждения.

Коды возврата: `0` — успех, `1` — ошибка спецификации/ввода-вывода/проверки,
`2` — больше 800 классов, `3` — неверные аргументы.

## Формат спецификации

Схема — `skills/uml-class/schemas/class.schema.json`, пример — `skills/uml-class/examples/payments.json`.

```json
{
  "schemaVersion": 1,
  "title": "Модуль оплаты",
  "classes": [
    { "id": "order-service", "name": "OrderService", "fields": ["- repo: OrderRepository"],
      "constructors": ["+ OrderService(repo: OrderRepository)"],
      "methods": ["+ place(order: Order): Receipt"] }
  ],
  "relations": [
    { "from": "order-service", "to": "payment-provider", "kind": "dependency",
      "label": "charge(card, amount)" }
  ],
  "packages": [
    { "id": "commerce", "label": "module: commerce", "classes": ["order-service"] }
  ]
}
```

Виды связей: `inheritance`, `realization`, `dependency`, `association`, `composition`,
`aggregation`. У каждой — свой наконечник: полый треугольник, пунктир, ромб и т. д.

## Как это работает

1. `renderers/model.mjs` — разбор JSON и валидация с путями вида `relations[0].to`.
2. `renderers/layout.mjs` — ранги (наследование вниз от родителя), барицентрическая
   сортировка внутри ряда, детерминированные координаты.
3. `renderers/routing.mjs` — ортогональные линии: соседи по ряду обходят ряд сверху,
   близкие ранги идут через зазор, далёкие ищут свободный вертикальный коридор.
4. `renderers/svg.mjs` + `html.mjs` — SVG и автономная страница.

Раскладка детерминирована: два запуска на одной спецификации дают побайтово одинаковый HTML.
При раскрытии узла остальные не сдвигаются — растёт только он, а линии перерисовываются.

## Ограничения

- Нет парсинга исходников: `spec.json` готовит человек или агент, прочитав код.
- Нет экспорта PNG/SVG.
- Связь класса с самим собой не поддерживается.
- Полный UML (шаблоны, ограничения `{...}`, диаграммы объектов) — вне объёма.

## Тесты

```bash
npm test        # node --test --test-isolation=none "skills/uml-class/tests/*.test.mjs"
```

`--test-isolation=none` нужен, чтобы тесты шли в одном процессе: в песочнице DSH порождение
дочерних процессов запрещено. Браузер в тестах не используется — проверяются разметка,
симметрия соседей, детерминизм и отсутствие внешних ресурсов.

## Лицензия

MIT.
