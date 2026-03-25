# Финансы - Приложение для учёта личных финансов

PWA-приложение для быстрого учёта доходов, расходов и накоплений.

## Технологии

- **Backend:** Deno (Hono + Deno KV)
- **Frontend:** React + TypeScript + Vite + Recharts
- **PWA:** Service Worker + Web App Manifest

## Запуск

### Backend

```bash
cd backend
deno task dev
```

Сервер запустится на `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

## API

| Метод  | Путь                        | Описание                        |
|--------|-----------------------------|---------------------------------|
| GET    | /api/transactions           | Список операций (?month=YYYY-MM)|
| POST   | /api/transactions           | Создать операцию                |
| DELETE | /api/transactions/:id       | Удалить операцию                |
| GET    | /api/categories             | Список категорий                |
| POST   | /api/categories             | Создать категорию               |
| PUT    | /api/categories/:id         | Обновить категорию              |
| DELETE | /api/categories/:id         | Удалить категорию               |
| GET    | /api/savings                | Цели накоплений                 |
| POST   | /api/savings                | Создать цель                    |
| PUT    | /api/savings/:id            | Обновить цель                   |
| DELETE | /api/savings/:id            | Удалить цель                    |
| POST   | /api/savings/:id/deposit    | Пополнить цель                  |
| GET    | /api/recurring              | Повторяющиеся платежи           |
| POST   | /api/recurring              | Создать повтор. платёж          |
| PUT    | /api/recurring/:id          | Обновить повтор. платёж         |
| DELETE | /api/recurring/:id          | Удалить повтор. платёж          |
| POST   | /api/recurring/process      | Обработать повтор. платежи      |
| GET    | /api/stats?month=YYYY-MM    | Статистика за месяц             |
| GET    | /api/export?format=json|csv | Экспорт данных                  |
