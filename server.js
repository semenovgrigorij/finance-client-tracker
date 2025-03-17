const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cron = require("node-cron");
const path = require("path");
const puppeteer = require("puppeteer");
require("dotenv").config();

const app = express();
let globalCookies = null;

// Простой health check для Render
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// Настройка статических файлов
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public", "img")));

// Настройка favicon
app.get("/favicon.ico", (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Content-Type", "image/x-icon");
  res.sendFile(path.join(__dirname, "public", "favicon.ico"));
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.log("Запрошенный URL:", req.url);
  console.log("Метод:", req.method);
  console.log("Заголовки:", req.headers);
  console.error("Ошибка:", err);
  res.status(500).send("Что-то пошло не так!");
  next();
});

// Настройка парсинга запросов
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    credentials: true,
  })
);

// Настройка кеширования и заголовков
app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  console.log("Request URL:", req.url);
  console.log("Request Headers:", req.headers);

  next();
});

// Главная страница
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Добавьте в server.js перед обработчиком /api/login
// Тестовый метод аутентификации (ТОЛЬКО ДЛЯ РАЗРАБОТКИ)
app.post("/api/login-test", async (req, res) => {
  try {
    console.log("Тестовый вход в систему");
    const { email, password } = req.body;

    // Здесь должна быть ваша реальная логика проверки учетных данных
    // Для тестирования используем фиксированные учетные данные
    if (email === "test@example.com" && password === "testpassword") {
      // Создаем фиктивные cookies для тестирования
      globalCookies = [
        { name: "token", value: "test-token" },
        { name: "refresh_token", value: "test-refresh-token" },
        { name: "csrftoken", value: "test-csrf-token" },
      ];

      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Неверные учетные данные" });
    }
  } catch (error) {
    console.error("Ошибка:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Авторизация
app.post("/api/login", async (req, res) => {
  try {
    console.log("Начало обработки логина");
    const { email, password } = req.body;
    console.log("Получены данные:", { email, password });

    if (!email || !password) {
      console.log("Отсутствуют email или password");
      return res.status(400).json({
        error: "Email и пароль обязательны",
        details: { hasEmail: !!email, hasPassword: !!password },
      });
    }

    console.log("Попытка авторизации через Puppeteer...");

    // Используем только Puppeteer для авторизации
    try {
      cookies = await getRemonlineCookiesForUser(email, password);

      if (!cookies) {
        console.log("Не удалось получить cookies через Puppeteer");
        return res.status(401).json({ error: "Неверные учетные данные" });
      }

      console.log("Cookies получены успешно через Puppeteer");
      globalCookies = cookies;
      res.json({ success: true });
    } catch (puppeteerError) {
      console.error("Ошибка авторизации через Puppeteer:", puppeteerError);
      res.status(401).json({
        error: "Ошибка при авторизации",
        details: puppeteerError.message,
      });
    }
  } catch (error) {
    console.error("Ошибка в роуте логина:", error);
    res.status(500).json({
      error: "Ошибка сервера при авторизации",
      details: error.message,
    });
  }
});
// Проверка статуса авторизации
app.get("/api/auth-status", (req, res) => {
  if (globalCookies && globalCookies.length > 0) {
    res.json({ authorized: true });
  } else {
    res.json({ authorized: false });
  }
});

// Получение данных о клиенте
app.post("/api/proxy/get-client", async (req, res) => {
  try {
    console.log("Входящие данные get-client:", req.body);
    const { id } = req.body;
    console.log("ID клиента:", id);
    console.log("Куки:", formatCookies(globalCookies));

    const csrfToken = globalCookies.find((c) => c.name === "csrftoken")?.value;
    console.log("CSRF токен:", csrfToken);

    if (!csrfToken) {
      console.error("CSRF-токен не найден");
      return res.status(400).json({ error: "CSRF-токен не найден" });
    }

    // Используем правильный эндпоинт для получения данных клиента - GET-запрос
    const response = await axios.get(
      `https://web.remonline.app/app/settings/get-client?id=${id}`,
      {
        headers: {
          Cookie: formatCookies(globalCookies),
          "x-csrftoken": csrfToken,
          "x-branch-id": "134397", // Можно параметризовать
          "x-company-landing": "auto",
          "x-company-niche-category": "auto",
          "x-revision": "1.324.1",
          "x-version": "1.324.1",
          Origin: "https://web.remonline.app",
          Referer: `https://web.remonline.app/clients/${id}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        },
      }
    );

    console.log("Статус запроса get-client:", response.status);
    console.log("Данные клиента:", response.data);

    res.json(response.data);
  } catch (error) {
    console.error("Ошибка проксирования get-client:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Пробуем альтернативный метод, если первый не сработал
    try {
      console.log("Пробуем альтернативный запрос для получения клиента...");

      // Используем поиск по ID через post запрос
      const alternativeResponse = await axios.post(
        "https://web.remonline.app/app/settings/get-clients",
        {
          search: id,
          page: 1,
          take: 1,
        },
        {
          headers: {
            Cookie: formatCookies(globalCookies),
            "x-csrftoken": csrfToken,
            "x-branch-id": "134397",
            "x-company-landing": "auto",
            "x-company-niche-category": "auto",
            "x-revision": "1.324.1",
            "x-version": "1.324.1",
            "Content-Type": "application/json",
            Origin: "https://web.remonline.app",
            Referer: "https://web.remonline.app/clients",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
          },
        }
      );

      console.log(
        "Альтернативный запрос успешен. Статус:",
        alternativeResponse.status
      );

      if (
        alternativeResponse.data.data &&
        alternativeResponse.data.data.length > 0
      ) {
        const clientData =
          alternativeResponse.data.data.find(
            (client) => String(client.id) === String(id)
          ) || alternativeResponse.data.data[0];

        console.log("Найден клиент:", clientData.name || clientData.id);
        return res.json(clientData);
      } else {
        console.log("Клиент не найден");
        return res.status(404).json({ error: "Клиент не найден" });
      }
    } catch (alternativeError) {
      console.error(
        "Ошибка альтернативного запроса:",
        alternativeError.message
      );
      res.status(error.response?.status || 500).json({
        error: "Ошибка при проксировании запроса get-client",
        details: error.message,
      });
    }
  }
});
// Получение списка клиентов
app.post("/api/proxy/get-clients", async (req, res) => {
  try {
    console.log("Запрос списка клиентов");
    const { query = "", page = 1, take = 100 } = req.body;
    console.log("Поисковый запрос:", query);
    console.log("Страница:", page);
    console.log("Количество на странице:", take);
    console.log("Куки:", formatCookies(globalCookies));

    const csrfToken = globalCookies.find((c) => c.name === "csrftoken")?.value;
    console.log("CSRF токен:", csrfToken);

    if (!csrfToken) {
      console.error("CSRF-токен не найден");
      return res.status(400).json({ error: "CSRF-токен не найден" });
    }

    // Используем правильный эндпоинт для получения клиентов
    const response = await axios.post(
      "https://web.remonline.app/app/settings/get-clients",
      {
        search: query, // Передаем поисковый запрос напрямую в Remonline
        page: Number(page),
        take: Number(take),
        // Прочие параметры
        startDate: 0,
        endDate: 253402300799999,
        tz: "Europe/Kiev",
      },
      {
        headers: {
          Cookie: formatCookies(globalCookies),
          "x-csrftoken": csrfToken,
          "x-branch-id": "134397",
          "x-company-landing": "auto",
          "x-company-niche-category": "auto",
          "x-revision": "1.324.1",
          "x-version": "1.324.1",
          "Content-Type": "application/json",
          Origin: "https://web.remonline.app",
          Referer: "https://web.remonline.app/clients",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        },
      }
    );

    console.log(`Получено ${response.data.data?.length || 0} клиентов`);
    console.log(`Всего клиентов: ${response.data.totalCount || "неизвестно"}`);
    res.json(response.data);
  } catch (error) {
    console.error("Ошибка получения списка клиентов:", error.message);
    if (error.response) {
      console.error("Статус ответа:", error.response.status);
      console.error("Данные ответа:", error.response.data);
    }
    res.status(500).json({
      error: "Ошибка при получении списка клиентов",
      details: error.message,
    });
  }
});

// Получение финансовых операций клиента
app.post("/api/proxy/client-finance", async (req, res) => {
  try {
    const { client_id, page = 1, take = 50 } = req.body;
    console.log("Входящие данные client-finance:", req.body);
    console.log("Куки:", formatCookies(globalCookies));

    const csrfToken = globalCookies.find((c) => c.name === "csrftoken")?.value;
    console.log("CSRF токен:", csrfToken);

    if (!csrfToken) {
      console.error("CSRF-токен не найден");
      return res.status(400).json({ error: "CSRF-токен не найден" });
    }

    if (!client_id) {
      console.error("ID клиента не указан");
      return res.status(400).json({ error: "ID клиента не указан" });
    }

    // Используем актуальный эндпоинт для финансовых операций с правильным форматом данных
    const requestData = {
      client_id: parseInt(client_id), // Возможно, ID должен быть числом, а не строкой
      page: page,
      take: take,
    };

    console.log("Отправляем запрос с данными:", requestData);

    const response = await axios.post(
      "https://web.remonline.app/app/finance/cashbox-history/list-by-client",
      requestData,
      {
        headers: {
          Cookie: formatCookies(globalCookies),
          "x-csrftoken": csrfToken,
          // "x-branch-id": "134397",
          "x-company-landing": "auto",
          "x-company-niche-category": "auto",
          "x-revision": "1.324.1",
          "x-version": "1.324.1",
          "Content-Type": "application/json",
          Origin: "https://web.remonline.app",
          Referer: `https://web.remonline.app/clients/${client_id}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        },
      }
    );

    console.log("Статус запроса client-finance:", response.status);

    if (response.data && response.data.data) {
      console.log(`Получено ${response.data.data.length} финансовых операций`);

      // Анализируем структуру данных для отладки
      if (response.data.data.length > 0) {
        console.log(
          "Пример записи:",
          JSON.stringify(response.data.data[0]).substring(0, 1000)
        );
        console.log("Ключи записи:", Object.keys(response.data.data[0]));
        console.log("Значение поля income:", response.data.data[0].income);
        console.log("Значение поля outcome:", response.data.data[0].outcome);
        console.log("Тип поля income:", typeof response.data.data[0].income);
        console.log("Тип поля outcome:", typeof response.data.data[0].outcome);
      }
    }

    res.json(response.data);
  } catch (error) {
    console.error("Ошибка проксирования client-finance:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    res.status(error.response?.status || 500).json({
      error: "Ошибка при проксировании запроса client-finance",
      details: error.message,
      responseData: error.response?.data,
      requestBody: req.body, // Добавляем тело запроса для диагностики
    });
  }
});

// Получение сотрудников
app.post("/api/proxy/get-employees-and-invites", async (req, res) => {
  try {
    console.log("Входящие данные get-employees-and-invites:", req.body);
    console.log("Куки:", formatCookies(globalCookies));

    const csrfToken = globalCookies.find((c) => c.name === "csrftoken")?.value;
    console.log("CSRF токен:", csrfToken);

    if (!csrfToken) {
      console.error("CSRF-токен не найден");
      return res.status(400).json({ error: "CSRF-токен не найден" });
    }

    if (!req.body) {
      return res.status(400).json({ error: "Отсутствуют данные в запросе" });
    }

    const response = await axios.post(
      "https://web.remonline.app/app/settings/get-employees-and-invites",
      {},
      {
        headers: {
          Cookie: formatCookies(globalCookies),
          "x-csrftoken": csrfToken,
          Referer: "https://web.remonline.app/settings/staff/employees/",
          accept: "*/*",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "ru,en-US;q=0.9,en;q=0.8,uk;q=0.7,de;q=0.6",
          "content-type": "application/json",
          "x-branch-id": "",
          "x-company-landing": "auto",
          "x-company-niche-category": "auto",
          "x-revision": "1.290.0",
          "x-version": "1.290.0",
          "sec-ch-ua":
            '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      }
    );

    console.log("Заголовки ответа Сотрудники:", response.headers);
    console.log("Данные ответа Сотрудники:", response.data);
    console.log("Статус запроса Сотрудники:", response.status);

    res.json(response.data);
  } catch (error) {
    console.error("Ошибка проксирования get-employees-and-invites:", {
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      message: error.message,
    });
    res.status(error.response?.status || 500).json({
      error: "Ошибка при проксировании запроса get-employees-and-invites",
      details: error.response?.data,
    });
  }
});

// Получение списка касс по всем локациям
app.post("/api/proxy/get-cashboxes", async (req, res) => {
  try {
    console.log("Запрос списка касс");

    // Проверка наличия cookies
    if (!globalCookies) {
      return res.status(401).json({
        error: "Необходима авторизация",
        needAuth: true,
      });
    }

    console.log("Куки:", formatCookies(globalCookies));

    const csrfToken = globalCookies.find((c) => c.name === "csrftoken")?.value;
    console.log("CSRF токен:", csrfToken);

    // Используйте эндпоинт, который вы видите в браузере
    const response = await axios.get(
      "https://web.remonline.app/app/finance/cashbox/list",
      {
        headers: {
          Cookie: formatCookies(globalCookies),
          "x-csrftoken": csrfToken,
          "x-branch-id": "",
          "x-company-landing": "auto",
          "x-company-niche-category": "auto",
          "x-revision": "1.324.1",
          "x-version": "1.324.1",
          "Content-Type": "application/json",
          Origin: "https://web.remonline.app",
          Referer: "https://web.remonline.app/payments/cashbox",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        },
      }
    );

    console.log("Статус запроса get-cashboxes:", response.status);
    console.log(
      `Получено данных: ${JSON.stringify(response.data).substring(0, 100)}...`
    );

    res.json(response.data);
  } catch (error) {
    console.error("Ошибка проксирования get-cashboxes:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    // Проверяем наличие globalCookies перед использованием
    if (!globalCookies) {
      return res.status(401).json({
        error: "Необходима авторизация",
        needAuth: true,
      });
    }

    // Здесь объявляем csrfToken заново, чтобы он был доступен в catch-блоке
    const csrfToken = globalCookies.find((c) => c.name === "csrftoken")?.value;

    // Пробуем еще один альтернативный эндпоинт с POST-запросом
    try {
      console.log("Пробуем POST-запрос для получения касс...");

      const postResponse = await axios.post(
        "https://web.remonline.app/api/finance/cashboxes/list",
        {},
        {
          headers: {
            Cookie: formatCookies(globalCookies),
            "x-csrftoken": csrfToken || "", // Используем пустую строку, если token не определен
            "x-branch-id": "",
            "x-company-landing": "auto",
            "x-company-niche-category": "auto",
            "x-revision": "1.324.1",
            "x-version": "1.324.1",
            "Content-Type": "application/json",
            Origin: "https://web.remonline.app",
            Referer: "https://web.remonline.app/finance/cashboxes/",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
          },
        }
      );

      console.log("POST-запрос касс успешен. Статус:", postResponse.status);
      return res.json(postResponse.data);
    } catch (postError) {
      console.error("Ошибка POST-запроса касс:", postError.message);

      res.status(500).json({
        error: "Ошибка при получении списка касс",
        details: error.message,
      });
    }
  }
});

// Получение переводов клиентов
// Модификация обработчика для добавления поддержки фильтрации по дате

// Обновленная функция для обработки запросов client-transfers с поддержкой фильтрации по дате
app.post("/api/proxy/client-transfers", async (req, res) => {
  try {
    const {
      client_id,
      page = 1,
      take = 1000,
      pageSize = 1000,
      skip = 0,
      startDate, // Новые параметры для фильтрации по дате
      endDate,
      tz = "Europe/Kiev",
    } = req.body;
    console.log("Входящие данные client-transfers:", req.body);
    console.log("Куки:", formatCookies(globalCookies));

    const csrfToken = globalCookies.find((c) => c.name === "csrftoken")?.value;
    console.log("CSRF токен:", csrfToken);

    if (!csrfToken) {
      console.error("CSRF-токен не найден");
      return res.status(400).json({ error: "CSRF-токен не найден" });
    }

    if (!client_id) {
      console.error("ID клиента не указан");
      return res.status(400).json({ error: "ID клиента не указан" });
    }

    // Отправляем запрос на получение данных с учетом диапазона дат
    const requestData = {
      client_id: parseInt(client_id),
      page: parseInt(page),
      take: parseInt(take),
      pageSize: parseInt(pageSize),
      skip: parseInt(skip),
      sort: {},
    };

    // Добавляем параметры фильтрации по дате, если они указаны
    if (startDate) {
      requestData.startDate = parseInt(startDate);
    }

    if (endDate) {
      requestData.endDate = parseInt(endDate);
    }

    if (tz) {
      requestData.tz = tz;
    }

    console.log(
      "Отправляем запрос для получения переводов клиента:",
      requestData
    );

    const response = await axios.post(
      "https://web.remonline.app/app/finance/get-client-transfers",
      requestData,
      {
        headers: {
          Cookie: formatCookies(globalCookies),
          "x-csrftoken": csrfToken,
          "x-branch-id": "134397",
          "x-company-landing": "auto",
          "x-company-niche-category": "auto",
          "x-revision": "1.324.1",
          "x-version": "1.324.1",
          "Content-Type": "application/json",
          Origin: "https://web.remonline.app",
          Referer: `https://web.remonline.app/clients/${client_id}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        },
      }
    );

    console.log("Статус запроса client-transfers:", response.status);

    // Если есть данные о записях, обрабатываем их
    if (response.data && response.data.data) {
      console.log(
        `Получено ${response.data.data.length} записей о переводах клиента`
      );

      if (response.data.data.length > 0) {
        console.log(
          "Пример записи о переводе:",
          JSON.stringify(response.data.data[0]).substring(0, 500)
        );
      }
    }

    res.json(response.data);
  } catch (error) {
    console.error("Ошибка проксирования client-transfers:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    res.status(error.response?.status || 500).json({
      error: "Ошибка при проксировании запроса client-transfers",
      details: error.message,
      responseData: error.response?.data,
    });
  }
});

// Функции для управления Cookies

// Получение cookies для пользователя через Puppeteer

async function getRemonlineCookiesForUser(email, password) {
  try {
    console.log("Запускаем браузер для авторизации...");
    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
    console.log("Путь к исполняемому файлу браузера:", executablePath);
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--single-process",
      ],
      executablePath: executablePath,
    });

    const page = await browser.newPage();

    try {
      console.log("Переходим на страницу авторизации...");
      await page.goto("https://web.remonline.app/login", {
        waitUntil: "networkidle0",
        timeout: 80000,
      });

      console.log("Вводим данные для авторизации...");
      // Вводим данные
      await page.type("#login", email);
      await page.type("#password", password);

      // Клик по кнопке входа
      await page.click('button[type="submit"]');

      try {
        console.log("Ожидаем завершения авторизации...");
        // Ждем успешной навигации или появления сообщения об ошибке
        await Promise.race([
          page.waitForNavigation({ timeout: 30000 }),
          page.waitForSelector(".error-message", { timeout: 30000 }),
        ]);

        // Проверяем, есть ли сообщение об ошибке
        const errorElement = await page.$(".error-message");
        if (errorElement) {
          console.log("Обнаружено сообщение об ошибке при авторизации");
          const errorText = await page.evaluate(
            (el) => el.textContent,
            errorElement
          );
          console.log("Текст ошибки:", errorText);
          await browser.close();
          return null;
        }

        console.log("Авторизация успешна, получаем cookies...");
        // Получаем куки
        const cookies = await page.cookies();
        console.log(`Получено ${cookies.length} cookies`);
        await browser.close();
        return cookies;
      } catch (error) {
        console.error("Ошибка при ожидании навигации:", error);
        await browser.close();
        return null;
      }
    } catch (error) {
      console.error("Ошибка при работе с браузером:", error);
      await browser.close();
      return null;
    }
  } catch (error) {
    console.error("Ошибка запуска браузера:", error);
    console.error("Детали ошибки:", error.stack);
    return null;
  }
}
// Форматирование cookies для запросов
const formatCookies = (cookies) => {
  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    console.error("Куки не получены или имеют неверный формат");
    return "";
  }

  const relevantCookies = ["token", "refresh_token", "csrftoken"];
  const formattedCookies = cookies
    .filter((cookie) => relevantCookies.includes(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`);

  console.log("Сформированные куки:", formattedCookies.join("; "));
  return formattedCookies.join("; ");
};

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Прокси-сервер запущен на порту ${PORT}`);
});

// Отладочный эндпоинт для тестирования finance
app.get("/api/test-finance/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Тестирование получения финансовых операций клиента:", id);

    if (!globalCookies || globalCookies.length === 0) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }

    const csrfToken = globalCookies.find((c) => c.name === "csrftoken")?.value;

    // Проверим несколько возможных эндпоинтов

    // 1. /app/finance/client/operations
    try {
      const response1 = await axios.post(
        "https://web.remonline.app/app/finance/client/operations",
        {
          client_id: id,
          page: 1,
          take: 10,
          pageSize: 10,
          skip: 0,
          startDate: 0,
          endDate: 253402300799999,
          tz: "Europe/Kiev",
        },
        {
          headers: {
            Cookie: formatCookies(globalCookies),
            "x-csrftoken": csrfToken,
            "x-branch-id": "",
            "x-company-landing": "auto",
            "x-company-niche-category": "auto",
            "x-revision": "1.324.1",
            "x-version": "1.324.1",
            "Content-Type": "application/json",
            Origin: "https://web.remonline.app",
            Referer: `https://web.remonline.app/clients/${id}`,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
          },
        }
      );

      console.log("Эндпоинт 1 работает! Статус:", response1.status);
      return res.json({
        source: "app/finance/client/operations",
        data: response1.data,
      });
    } catch (error1) {
      console.log("Эндпоинт 1 не работает:", error1.message);
    }

    // 2. /app/finance/operations
    try {
      const response2 = await axios.post(
        "https://web.remonline.app/app/finance/operations",
        {
          client_id: id,
          page: 1,
          take: 10,
          pageSize: 10,
          skip: 0,
          startDate: 0,
          endDate: 253402300799999,
          tz: "Europe/Kiev",
        },
        {
          headers: {
            Cookie: formatCookies(globalCookies),
            "x-csrftoken": csrfToken,
            "x-branch-id": "",
            "x-company-landing": "auto",
            "x-company-niche-category": "auto",
            "x-revision": "1.324.1",
            "x-version": "1.324.1",
            "Content-Type": "application/json",
            Origin: "https://web.remonline.app",
            Referer: "https://web.remonline.app/clients",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
          },
        }
      );

      console.log("Эндпоинт 2 работает! Статус:", response2.status);
      return res.json({
        source: "app/finance/operations",
        data: response2.data,
      });
    } catch (error2) {
      console.log("Эндпоинт 2 не работает:", error2.message);
    }

    // 3. /app/finance/client/{id}/operations
    try {
      const response3 = await axios.get(
        `https://web.remonline.app/app/finance/client/${id}/operations`,
        {
          headers: {
            Cookie: formatCookies(globalCookies),
            "x-csrftoken": csrfToken,
            "x-branch-id": "",
            "x-company-landing": "auto",
            "x-company-niche-category": "auto",
            "x-revision": "1.324.1",
            "x-version": "1.324.1",
            "Content-Type": "application/json",
            Origin: "https://web.remonline.app",
            Referer: `https://web.remonline.app/clients/${id}`,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
          },
        }
      );

      console.log("Эндпоинт 3 работает! Статус:", response3.status);
      return res.json({
        source: `app/finance/client/${id}/operations`,
        data: response3.data,
      });
    } catch (error3) {
      console.log("Эндпоинт 3 не работает:", error3.message);
    }

    res.status(404).json({ error: "Все проверенные эндпоинты не работают" });
  } catch (mainError) {
    console.error("Общая ошибка тестирования:", mainError.message);
    res.status(500).json({
      error: "Ошибка тестирования",
      details: mainError.message,
    });
  }
});
