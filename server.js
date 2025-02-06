const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cron = require("node-cron");
require("dotenv").config();
const sessions = new Map();

const app = express();

const corsOptions = {
  origin: true, // Разрешаем все origins в dev режиме
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
};

app.use(cors(corsOptions));

// Добавляем middleware для обработки preflight запросов
app.options("*", cors(corsOptions));

// Добавляем middleware для установки необходимых заголовков
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token"
  );
  next();
});
let globalCookies = null;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*", // Настройте для вашего домена
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    credentials: true,
  })
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token"
  );
  next();
});
/* app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
}); */
///////////////
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Получены данные:", { email });

    if (!email || !password) {
      return res.status(400).json({
        error: "Email и пароль обязательны",
      });
    }

    const cookies = await getRemonlineCookiesForUser(email, password);

    if (cookies) {
      // Проверяем, есть ли уже активная сессия для этого пользователя
      if (activeSessions.has(email)) {
        const existingSession = activeSessions.get(email);
        // Если токен отличается от текущего, значит был вход с другого устройства
        if (
          existingSession !== cookies.find((c) => c.name === "token")?.value
        ) {
          return res.status(401).json({
            error: "session_expired",
            message: "Виявлено вхід з іншого пристрою",
          });
        }
      }

      // Сохраняем новую сессию
      const tokenCookie = cookies.find((c) => c.name === "token");
      if (tokenCookie) {
        activeSessions.set(email, tokenCookie.value);
      }

      globalCookies = cookies;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Неверные учетные данные" });
    }
  } catch (error) {
    console.error("Ошибка в роуте логина:", error);
    res.status(500).json({
      error: "Ошибка сервера при авторизации",
      details: error.message,
    });
  }
});

// Модифицируем middleware проверки сессии
const checkSession = async (req, res, next) => {
  try {
    if (!globalCookies) {
      return res.status(401).json({
        error: "session_expired",
        message: "Сесія застаріла",
      });
    }

    const tokenCookie = globalCookies.find((c) => c.name === "token");
    if (tokenCookie) {
      // Проверяем, активна ли сессия
      let sessionFound = false;
      for (let [email, token] of activeSessions.entries()) {
        if (token === tokenCookie.value) {
          sessionFound = true;
          break;
        }
      }

      if (!sessionFound) {
        return res.status(401).json({
          error: "session_expired",
          message: "Виявлено вхід з іншого пристрою",
        });
      }
    }

    next();
  } catch (error) {
    console.error("Session check error:", error);
    res.status(401).json({
      error: "session_expired",
      message: "Помилка перевірки сесії",
    });
  }
};

/* app.post("/api/login", async (req, res) => {
  try {
    console.log("Начало обработки логина");
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email и пароль обязательны",
      });
    }

    const cookies = await getRemonlineCookiesForUser(email, password);

    if (cookies) {
      
      // Сохраняем куки глобально
      globalCookies = cookies;

      // Находим нужные куки
      const tokenCookie = cookies.find(
        (c) => c.name === "token" && c.domain === "web.remonline.app"
      );
      const refreshTokenCookie = cookies.find(
        (c) => c.name === "refresh_token" && c.domain === "web.remonline.app"
      );
      const csrfTokenCookie = cookies.find(
        (c) => c.name === "csrftoken" && c.domain === "web.remonline.app"
      );

      if (!tokenCookie || !refreshTokenCookie || !csrfTokenCookie) {
        console.error("Missing required cookies");
        return res.status(500).json({ error: "Authentication error" });
      }

      // Устанавливаем куки в ответ
      res.cookie("token", tokenCookie.value, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: ".remonline.app",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.cookie("refresh_token", refreshTokenCookie.value, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: ".remonline.app",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.cookie("csrftoken", csrfTokenCookie.value, {
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
        domain: ".remonline.app",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      // Отправляем токены в теле ответа для сохранения на клиенте
      res.json({
        success: true,
        csrfToken: csrfTokenCookie.value,
        tokens: {
          token: tokenCookie.value,
          refreshToken: refreshTokenCookie.value,
          csrfToken: csrfTokenCookie.value,
        },
      });
    } else {
      res.status(401).json({ error: "Неверные учетные данные" });
    }
  } catch (error) {
    console.error("Ошибка в роуте логина:", error);
    res.status(500).json({
      error: "Ошибка сервера при авторизации",
      details: error.message,
    });
  }
}); */

// Добавляем middleware для проверки сессии
const checkSession = async (req, res, next) => {
  try {
    if (!globalCookies) {
      return res.status(401).json({
        error: "session_expired",
        message: "Сесія застаріла",
      });
    }

    const tokenCookie = globalCookies.find(
      (c) => c.name === "token" && c.domain === "web.remonline.app"
    );
    const csrfToken = globalCookies.find(
      (c) => c.name === "csrftoken" && c.domain === "web.remonline.app"
    )?.value;

    if (!tokenCookie || !csrfToken) {
      return res.status(401).json({
        error: "session_expired",
        message: "Відсутні необхідні куки",
      });
    }

    // Проверяем валидность куки через другой endpoint
    try {
      const response = await axios.get(
        "https://web.remonline.app/api/warehouse/get-goods-flow-items",
        {
          headers: {
            Cookie: formatCookies(globalCookies),
            "x-csrftoken": csrfToken,
            "Content-Type": "application/json",
            referer: "https://web.remonline.app/",
          },
        }
      );

      // Любой ответ кроме 401 считаем валидным
      if (response.status !== 401) {
        req.tokens = {
          csrfToken,
          cookies: globalCookies,
        };
        next();
        return;
      }

      throw new Error("Invalid session");
    } catch (error) {
      if (
        error.response?.status === 401 ||
        error.message === "Invalid session"
      ) {
        return res.status(401).json({
          error: "session_expired",
          message: "Сесія застаріла, необхідна повторна авторизація",
        });
      }
      // Если ошибка не связана с авторизацией, пропускаем запрос
      req.tokens = {
        csrfToken,
        cookies: globalCookies,
      };
      next();
    }
  } catch (error) {
    console.error("Session check error:", error);
    // В случае ошибки проверки все равно пропускаем запрос
    next();
  }
};
////////////
async function getRemonlineCookies() {
  try {
    console.log("Запуск браузера...");
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"],
      executablePath: "/usr/bin/chromium", // Меняем путь на chromium
    });

    console.log("Создание новой страницы...");
    const page = await browser.newPage();

    try {
      console.log("Переход на страницу логина...");
      await page.goto("https://web.remonline.app/login", {
        waitUntil: "networkidle0",
        timeout: 120000,
      });

      // Используем найденные селекторы
      console.log("Ввод учетных данных...");
      await page.type("#login", process.env.REMONLINE_EMAIL);
      await page.type("#password", process.env.REMONLINE_PASSWORD);

      // Клик по кнопке входа
      console.log("Нажатие кнопки входа...");
      await page.click('button[type="submit"]');

      // Ожидание загрузки
      console.log("Ожидание навигации...");
      await page.waitForNavigation({
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      // Получение куки
      console.log("Получение cookies...");
      const cookies = await page.cookies();

      console.log("Полученные куки:", cookies);

      await browser.close();
      console.log("Браузер закрыт");

      return cookies;
    } catch (error) {
      console.error("Ошибка во время входа:", error);
      await browser.close();
      return null;
    }
  } catch (error) {
    if (error.name === "TargetCloseError") {
      console.error("Ошибка: Браузер был закрыт во время выполнения операции");
    } else {
      console.error("Произошла другая ошибка:", error);
    }
    return null;
  }
}

async function getRemonlineCookiesForUser(email, password) {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1280, height: 800 });

      console.log("Переход на страницу логина...");
      await page.goto("https://web.remonline.app/login", {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      console.log("Ввод учетных данных...");
      await page.type("#login", email);
      await page.type("#password", password);

      console.log("Нажатие кнопки входа...");
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }),
      ]);

      // Проверяем наличие ошибки входа
      const errorElement = await page.$(".error-message");
      if (errorElement) {
        console.log("Обнаружена ошибка входа");
        await browser.close();
        return null;
      }

      console.log("Получение cookies...");
      const cookies = await page.cookies();

      await browser.close();
      console.log("Браузер закрыт, cookies получены");

      return cookies;
    } catch (error) {
      console.error("Ошибка при работе с браузером:", error);
      await browser.close();
      return null;
    }
  } catch (error) {
    console.error("Ошибка запуска браузера:", error);
    return null;
  }
}

const formatCookies = (cookies) => {
  if (!cookies || !Array.isArray(cookies)) {
    console.error("Invalid cookies format:", cookies);
    return "";
  }

  // Фильтруем только нужные куки для web.remonline.app
  const relevantCookies = cookies.filter(
    (cookie) =>
      (cookie.name === "token" ||
        cookie.name === "refresh_token" ||
        cookie.name === "csrftoken") &&
      cookie.domain === "web.remonline.app"
  );

  if (relevantCookies.length === 0) {
    console.error("No relevant cookies found");
    return "";
  }

  // Сортируем куки в определенном порядке
  const orderedCookies = ["token", "refresh_token", "csrftoken"]
    .map((name) => relevantCookies.find((cookie) => cookie.name === name))
    .filter(Boolean);

  const cookieString = orderedCookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  console.log("Formatted cookies string:", cookieString);
  return cookieString;
};

app.post("/api/proxy/goods-flow-items", checkSession, async (req, res) => {
  try {
    console.log("Входящие данные:", req.body);
    const { id } = req.body; // Извлекаем значение id из тела запроса
    // console.log("Глобальные куки:", globalCookies);,
    console.log("Куки:", formatCookies(globalCookies));

    const csrfToken = globalCookies.find((c) => c.name === "csrftoken")?.value;
    console.log("CSRF токен:", csrfToken);
    if (!csrfToken) {
      console.error("CSRF-токен не найден");
      return res.status(400).json({ error: "CSRF-токен не найден" });
    }

    // Проверка на наличие JSON-payload
    if (!req.body) {
      return res.status(400).json({ error: "Отсутствуют данные в запросе" });
    }
    ///////////
    const response = await axios.post(
      "https://web.remonline.app/app/warehouse/get-goods-flow-items?page=1&pageSize=50&id=${id}&startDate=0&endDate=1738073893133",
      req.body,
      {
        headers: {
          Cookie: formatCookies(globalCookies),
          "x-csrftoken": csrfToken,
          Referer: "https://web.remonline.app/company/products/",
          accept: "**",
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
    ////////////

    // Для формата JSON
    console.log("Заголовки ответа:", response.headers);
    console.log("Данные ответа:", response.data);
    console.log("Статус запроса:", response.status);

    res.json(response.data);
  } catch (error) {
    console.error("Ошибка проксирования:", {
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      message: error.message,
    });
  }
});

app.options("/api/proxy/goods - flow - items;", cors());

app.post("/api/proxy/get-entity", checkSession, async (req, res) => {
  try {
    console.log("Входящие данные get-entity:", req.body);
    const { id } = req.body;
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
      "https://web.remonline.app/app/warehouse/get-entity?id=${id}",
      { id },
      {
        headers: {
          Cookie: formatCookies(globalCookies),
          "x-csrftoken": csrfToken,
          Referer: "https://web.remonline.app/company/products/",
          accept: "**",
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

    console.log("Заголовки ответа get-entity:", response.headers);
    console.log("Данные ответа get-entity:", response.data);
    console.log("Статус запроса get-entity:", response.status);

    res.json(response.data);
  } catch (error) {
    console.error("Ошибка проксирования get-entity:", {
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      message: error.message,
    });
    res.status(error.response?.status || 500).json({
      error: "Ошибка при проксировании запроса get-entity",
      details: error.response?.data,
    });
  }
});

app.options("/api/proxy/get-entity", cors());

app.post(
  "/api/proxy/get-employees-and-invites",
  checkSession,
  async (req, res) => {
    try {
      console.log("Входящие данные get-employees-and-invites:", req.body);
      console.log("Куки:", formatCookies(globalCookies));

      const csrfToken = globalCookies.find(
        (c) => c.name === "csrftoken"
      )?.value;
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
            accept: "**",
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
        error: "Ошибка при проксировании запроса get-employees-and-invitesy",
        details: error.response?.data,
      });
    }
  }
);

app.options("/api/proxy/get-employees-and-invites", cors());
// Обновление куки каждый час
cron.schedule("0 * * * *", async () => {
  try {
    const newCookies = await getRemonlineCookies();
    if (newCookies) {
      const oldCookies = globalCookies;
      globalCookies = null;
      console.log("Куки очищены по расписанию");

      // Проверка обновления куков
      if (JSON.stringify(oldCookies) !== JSON.stringify(newCookies)) {
        console.log("Куки были изменены");
        // Очищаем все сессии при обновлении куков
        sessions.clear();
      } else {
        console.log("Куки остались без изменений");
      }
    } else {
      console.error("Не удалось получить новые куки");
    }
  } catch (error) {
    console.error("Ошибка обновления куки:", error);
  }
});

// Первичное получение куки при старте сервера
(async () => {
  globalCookies = await getRemonlineCookies();
})();

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Прокси-сервер запущен на порту ${PORT}`);
});
