const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cron = require("node-cron");
require("dotenv").config();
const sessions = new Map();

const app = express();
let globalCookies = null;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*", // Настройте для вашего домена
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  })
);

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});
///////////////
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/login", async (req, res) => {
  try {
    console.log("Начало обработки логина");
    const { email, password } = req.body;
    console.log("Получены данные:", { email, password });

    if (!email || !password) {
      console.log("Отсутствуют email или password");
      return res.status(400).json({
        error: "Email та пароль обов'язкові",
        details: { hasEmail: !!email, hasPassword: !!password },
      });
    }

    console.log("Начало получения cookies");
    const cookies = await getRemonlineCookiesForUser(email, password);
    console.log("Статус получения cookies:", !!cookies);

    if (cookies) {
      // Проверяем, есть ли уже активная сессия для этого пользователя
      if (sessions.has(email)) {
        const existingSession = sessions.get(email);
        // Если сессия существует и отличается от текущей
        if (existingSession !== cookies[0].value) {
          sessions.delete(email);
          return res.status(401).json({
            error: "session_expired",
            message: "Виявлено вхід з іншого пристрою",
          });
        }
      }
      // Сохраняем новую сессию
      sessions.set(email, cookies[0].value);

      console.log("Cookies получены успешно");
      globalCookies = cookies;
      res.json({ success: true });
    } else {
      console.log("Не удалось получить cookies");
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

// Добавляем middleware для проверки сессии
const checkSession = async (req, res, next) => {
  try {
    const csrfToken = globalCookies?.find((c) => c.name === "csrftoken")?.value;

    if (!globalCookies || !csrfToken) {
      return res.status(401).json({
        error: "session_expired",
        message: "Сесія застаріла, необхідна повторна авторизація",
      });
    }

    // Проверяем валидность куки через тестовый запрос к Remonline
    try {
      const testResponse = await axios.get(
        "https://web.remonline.app/api/company/info",
        {
          headers: {
            Cookie: formatCookies(globalCookies),
            "x-csrftoken": csrfToken,
          },
        }
      );

      if (testResponse.status !== 200) {
        throw new Error("Invalid session");
      }
    } catch (error) {
      return res.status(401).json({
        error: "session_expired",
        message: "Сесія застаріла, необхідна повторна авторизація",
      });
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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    try {
      await page.goto("https://web.remonline.app/login", {
        waitUntil: "networkidle0",
        timeout: 80000,
      });

      // Вводим данные
      await page.type("#login", email);
      await page.type("#password", password);

      // Клик по кнопке входа
      await page.click('button[type="submit"]');

      try {
        // Ждем успешной навигации или появления сообщения об ошибке
        await Promise.race([
          page.waitForNavigation({ timeout: 30000 }),
          page.waitForSelector(".error-message", { timeout: 30000 }),
        ]);

        // Проверяем, есть ли сообщение об ошибке
        const errorElement = await page.$(".error-message");
        if (errorElement) {
          await browser.close();
          return null;
        }

        // Получаем куки
        const cookies = await page.cookies();
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
    return null;
  }
}
const formatCookies = (cookies) => {
  if (!cookies) {
    console.error("Куки не получены");
    return "";
  }
  const relevantCookies = ["token", "refresh_token", "csrftoken"];
  const formattedCookies = cookies
    .filter((cookie) => relevantCookies.includes(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`);

  console.log("Сформированные куки:", formattedCookies.join("; "));
  return formattedCookies.join("; ");
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
