-- 0001_initial_schema.sql
-- Инициализация схемы базы данных D1

-- Хранение промтов и конфигурации ассистентов
CREATE TABLE assistants (
  id TEXT PRIMARY KEY,             -- Уникальный идентификатор ассистента
  name TEXT NOT NULL,              -- Человекочитаемое название
  type TEXT CHECK(type IN ('ai', 'function')) NOT NULL, -- Тип ассистента
  system_prompt TEXT NOT NULL,     -- Промт для Gemini
  tov_snippet TEXT,                -- TOV выдержка из промта
  handoff_rules TEXT,              -- Правила передачи управления (JSON в виде TEXT)
  is_active BOOLEAN DEFAULT 1,     -- Активен/неактивен
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Пользователи Telegram
CREATE TABLE users (
  tg_id INTEGER PRIMARY KEY,       -- ID пользователя в Telegram
  full_name TEXT,                  -- Полное имя
  fio TEXT,                        -- Фамилия Имя Отчество
  phone TEXT,                      -- Телефон
  city TEXT,                       -- Город
  adress TEXT,                     -- Адрес
  is_blocked BOOLEAN DEFAULT 0,    -- Заблокирован/разблокирован
  last_activity DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- История диалогов
CREATE TABLE dialogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,        -- Формат: "tg_{tg_id}_{timestamp}"
  tg_id INTEGER REFERENCES users(tg_id),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  role TEXT CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata TEXT                     -- Дополнительные данные (JSON в виде TEXT)
);

-- Кэш данных о товарах
CREATE TABLE product_cache (
  product_id TEXT PRIMARY KEY,     -- ID товара
  url TEXT NOT NULL,               -- URL страницы товара
  title TEXT NOT NULL,             -- Заголовок товара
  description TEXT,                -- Описание
  category TEXT,                   -- Категория
  brand TEXT,                      -- Бренд
  style TEXT,                      -- Стиль
  collection TEXT,                 -- Коллекция
  material TEXT,                   -- Материал
  composition TEXT,                -- Состав
  color TEXT,                      -- Цвет
  sizes TEXT,                      -- Доступные размеры (JSON в виде TEXT)
  final_price REAL,                -- Цена с учетом скидок
  promo_code TEXT,                 -- Промокод
  images TEXT,                     -- Список изображений (JSON в виде TEXT)
  expires_at DATETIME NOT NULL     -- Время истечения кэша
);

-- Кэш данных о доставке
CREATE TABLE delivery_cache (
  location_key TEXT PRIMARY KEY,   -- Комбинация: "страна_город"
  delivery_data TEXT NOT NULL,     -- Ответ API доставки (JSON в виде TEXT)
  expires_at DATETIME NOT NULL     -- Время истечения кэша
);

-- Заказы (для интеграции с CRM)
CREATE TABLE orders (
  order_number TEXT PRIMARY KEY,   -- Номер заказа
  tg_id INTEGER REFERENCES users(tg_id),
  phone TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Товары в заказах
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT REFERENCES orders(order_number),
  product_name TEXT NOT NULL,
  price REAL NOT NULL,
  status TEXT NOT NULL
);

-- Запланированные действия (таймеры)
CREATE TABLE scheduled_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  action_type TEXT NOT NULL,       -- Например: "return_to_sales"
  payload TEXT,                    -- Данные для действия (JSON в виде TEXT)
  execute_at DATETIME NOT NULL,
  is_executed BOOLEAN DEFAULT 0
);

-- Конфигурация фильтров для поиска по фото
CREATE TABLE filter_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('category', 'color', 'size', 'material')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  group_name TEXT,                 -- Только для размеров: 'standard', 'plus_size'
  hex_color TEXT,                  -- Только для цветов
  is_active BOOLEAN DEFAULT 1
);
