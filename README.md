
# 🏪 Bellavka AI Assistant

AI-бот помощник для интернет-магазина женской одежды Bellavka, построенный на полностью бесплатных ресурсах.

## 🚀 Технологический стек

- **Backend:** Cloudflare Worker + D1 Database
- **AI:** Google Gemini API (2.5 Flash Lite)
- **Frontend:** GitHub Pages + Vanilla JS
- **Messaging:** Telegram Bot API
- **Deployment:** GitHub Actions + Wrangler

## 📁 Структура проекта
bellavka-ai-assistant/
├── worker/ # Cloudflare Worker
│ ├── src/
│ │ ├── index.ts # Главный обработчик
│ │ ├── api/admin.ts # API для админки
│ │ ├── db/
│ │ │ ├── D1Service.ts
│ │ │ └── types.ts
│ │ ├── handlers/
│ │ │ └── telegram.ts
│ │ └── assistants/
│ │ └── GeminiService.ts
│ ├── migrations/
│ │ └── 0001_initial_schema.sql
│ └── wrangler.toml
├── docs/ # GitHub Pages админка
│ ├── index.html
│ └── .nojekyll
└── .github/workflows/
└── deploy.yml # CI/CD для админки


## 🛠️ Установка и настройка

### 1. Клонирование репозитория
```bash
git clone https://github.com/ragon17886/bellavka-ai-assistant.git
cd bellavka-ai-assistant

### 2. Настройка Cloudflare Worker
```bash
cd worker
npm install

### 3. Переменные окружения

В настройках Cloudflare Worker установите:

TELEGRAM_BOT_TOKEN - токен бота от @BotFather

GEMINI_API_KEY - API ключ Google AI Studio

### 4. Инициализация базы данных
```bash
# Применить миграции
npx wrangler d1 execute bellavka-assistant-db --file=migrations/0001_initial_schema.sql

## 🔧 API Endpoints

### Worker API

GET / - Информация о доступных endpoint'ах

POST /webhook - Webhook для Telegram

GET /api/admin/stats - Статистика

GET /api/admin/users - Список пользователей

GET /api/admin/dialogs - История диалогов

GET/POST /api/admin/assistants - Управление ассистентами

### Админка
URL: https://ragon17886.github.io/bellavka-ai-assistant/

## 🤖 Управление ассистентами

### Создание ассистента
Перейдите в админку

Откройте вкладку "Assistants"

Заполните:

Name: Идентификатор ассистента (рекомендуется main)

System Prompt: Промпт для Gemini AI

Нажмите "Create Assistant"

### Основной ассистент

Система автоматически использует ассистента с именем main. Если его нет - используется первый активный ассистент.

## 💬 Telegram бот
### Команды
/start - Начало работы с ботом

Любой текст - Взаимодействие с AI-ассистентом

### Особенности
Сохраняет историю диалогов (последние 6 сообщений)

Автоматически создает пользователей при первом сообщении

Поддерживает текстовые сообщения

Обработка фото временно отключена

## 📊 Админ панель
### Возможности
📊 Dashboard: Статистика и активность в реальном времени

🤖 Assistants: Создание и управление AI-ассистентами

👥 Users: Просмотр зарегистрированных пользователей

💬 Dialogs: История всех диалогов

### Авто-обновление
Дашборд обновляется каждые 10 секунд

Кнопка "🔄 Refresh" на каждой вкладке

## 🔒 Безопасность
Базовая защита от опасных SQL-запросов

CORS настройки для админки

Валидация входящих данных

Логирование ошибок

## 🚨 Логирование и мониторинг
Включено в wrangler.toml:

Логи вызовов функций

100% семплирование логов

Сохранение логов

## 📈 Производительность
Время запуска Worker: ~18ms

Размер бандла: ~78KB (gzipped)

Автоматическое масштабирование Cloudflare

## 🐛 Отладка
### Распространенные проблемы
Бот не отвечает

Проверьте TELEGRAM_BOT_TOKEN

Убедитесь, что вебхук настроен правильно

Ошибки Gemini API

Проверьте GEMINI_API_KEY

Проверьте квоты в Google AI Studio

Проблемы с базой данных

Проверьте миграции D1

Убедитесь в правильности binding'а

## Логи
Логи доступны в Cloudflare Dashboard → Workers & Pages → Ваш Worker → Logs

## 🔄 Разработка
Локальная разработка
cd worker
npm start

Деплой обновлений
cd worker
npm run deploy

Миграции базы данных
npx wrangler d1 execute bellavka-assistant-db --file=migrations/0001_initial_schema.sql

## Live Demo:

Worker: https://bellavka-ai-assistant-worker.ragon17886.workers.dev

Админка: https://ragon17886.github.io/bellavka-ai-assistant/