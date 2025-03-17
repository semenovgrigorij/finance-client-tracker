// Функция для отображения результатов поиска
function displaySearchResults(clients) {
  const resultsContainer = document.getElementById("clientSearchResults");
  resultsContainer.innerHTML = "";

  if (clients.length === 0) {
    resultsContainer.innerHTML =
      '<p class="no-results">Клієнтів не знайдено</p>';
    resultsContainer.style.display = "block";
    return;
  }

  // Добавим строку количества найденных клиентов
  const countInfo = document.createElement("div");
  countInfo.className = "search-count";
  countInfo.textContent = `Знайдено: ${clients.length} клієнтів`;
  resultsContainer.appendChild(countInfo);

  const resultsList = document.createElement("ul");
  resultsList.className = "client-list";

  const searchQuery = document
    .getElementById("clientSearchInput")
    .value.trim()
    .toLowerCase();

  clients.forEach((client) => {
    const listItem = document.createElement("li");
    listItem.className = "client-item";

    // Определяем релевантность результата
    const clientName = client.name ? client.name.toLowerCase() : "";
    if (clientName.startsWith(searchQuery)) {
      listItem.classList.add("exact-match");
    } else if (clientName.includes(searchQuery)) {
      listItem.classList.add("partial-match");
    }

    listItem.dataset.id = client.id;

    // Форматируем телефон, если есть
    let phoneInfo = "";
    if (client.phone && client.phone.length > 0) {
      phoneInfo = `<span class="client-phone">${client.phone[0].phone}</span>`;
    }

    // Добавляем адрес, если есть
    let addressInfo = "";
    if (client.address) {
      addressInfo = `<div class="client-address">${client.address}</div>`;
    }

    listItem.innerHTML = `
      <div class="client-name">${client.name}</div>
      ${phoneInfo}
      ${addressInfo}
      <div class="client-id">ID: ${client.id}</div>
    `;

    // Добавляем обработчик клика для выбора клиента
    listItem.addEventListener("click", function () {
      selectClient(client);
    });

    resultsList.appendChild(listItem);
  });

  resultsContainer.appendChild(resultsList);
  resultsContainer.style.display = "block";
}

// Функция для выбора клиента из результатов поиска
function selectClient(client) {
  const idInput = document.getElementById("idInput");
  const resultsContainer = document.getElementById("clientSearchResults");

  idInput.value = client.id;
  resultsContainer.style.display = "none";

  // Сразу загружаем данные для выбранного клиента
  loadData();

  // Показываем уведомление
  showNotification("success", `Обрано клієнта: ${client.name}`);
}

// Функции для работы с периодами дат

// Функция для получения диапазона дат на основе выбранного периода
function getDateRange(periodType) {
  const now = new Date();
  let startDate, endDate;

  switch (periodType) {
    case "today": // Сьогодні
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );
      break;

    case "yesterday": // Вчора
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
        0,
        0,
        0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
        23,
        59,
        59
      );
      break;

    case "current_week": // Цей тиждень
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Делаем понедельник первым днем недели
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - diff,
        0,
        0,
        0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + (6 - diff),
        23,
        59,
        59
      );
      break;

    case "current_month": // Поточний місяць
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;

    case "previous_week": // Минулий тиждень
      const lastDayOfWeek = now.getDay();
      const lastDiff = lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1;
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - lastDiff - 7,
        0,
        0,
        0
      );
      endDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - lastDiff - 1,
        23,
        59,
        59
      );
      break;

    case "previous_month": // Минулий місяць
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;

    case "custom": // Обрати дати - в этом случае даты должны быть заданы отдельно
      return null;

    default: // По умолчанию - все время
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2100, 11, 31);
      break;
  }

  return { startDate, endDate };
}

// Функция для форматирования даты в строку для отображения
function formatDateForDisplay(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// Функция для преобразования даты в формат для API (секунды)
function formatDateForApi(date) {
  if (!date) return 0;

  // Преобразуем в секунды
  return Math.floor(date.getTime() / 1000);
}

// Функция для создания селектора периода в пользовательском интерфейсе
function createPeriodSelector() {
  // Контейнер для блока выбора периода
  const periodSelectorContainer = document.createElement("div");
  periodSelectorContainer.className = "period-selector-container";

  // Создаем заголовок (лейбл) для селектора
  const periodLabel = document.createElement("label");
  periodLabel.textContent = "Період:";
  periodLabel.setAttribute("for", "periodSelector");
  periodLabel.className = "period-selector-label";

  // Создаем селектор с выпадающим списком
  const periodSelector = document.createElement("div");
  periodSelector.className = "period-selector";
  periodSelector.id = "periodSelector";

  // Создаем поле отображения текущего выбора
  const selectedPeriod = document.createElement("div");
  selectedPeriod.className = "selected-period";
  selectedPeriod.textContent = "Всі дані";

  // Создаем иконку "стрелка вниз"
  const arrowIcon = document.createElement("span");
  arrowIcon.className = "arrow-icon";
  arrowIcon.innerHTML = "&#9660;"; // HTML-символ стрелки вниз

  // Создаем элемент для отображения дат вместо стандартного текста
  const dateRangeDisplay = document.createElement("div");
  dateRangeDisplay.className = "date-range-display";
  dateRangeDisplay.id = "dateRangeDisplay";
  dateRangeDisplay.style.display = "none";

  // Создаем выпадающий список
  const dropdownList = document.createElement("div");
  dropdownList.className = "period-dropdown";
  dropdownList.style.display = "none";

  // Опции для выпадающего списка
  const options = [
    { value: "all", label: "Всі дані" },
    { value: "today", label: "Сьогодні" },
    { value: "yesterday", label: "Вчора" },
    { value: "current_week", label: "Цей тиждень" },
    { value: "current_month", label: "Поточний місяць" },
    { value: "previous_week", label: "Минулий тиждень" },
    { value: "previous_month", label: "Минулий місяць" },
    { value: "custom", label: "Обрати дати" },
  ];

  // Создаем элементы списка
  options.forEach((option) => {
    const listItem = document.createElement("div");
    listItem.className = "period-option";
    listItem.textContent = option.label;
    listItem.dataset.value = option.value;

    // Обработчик выбора периода
    listItem.addEventListener("click", function () {
      const selectedValue = this.dataset.value;

      // Обновляем отображаемый текст и закрываем выпадающий список
      selectedPeriod.textContent = this.textContent;
      dropdownList.style.display = "none";

      // Сохраняем выбранный период в localStorage
      saveToLocalStorage("selectedPeriod", selectedValue);

      // Если выбраны кастомные даты, показываем диалог выбора дат
      if (selectedValue === "custom") {
        showDatePickerDialog();
      } else {
        // Иначе обновляем диапазон дат и загружаем данные
        updateDateRangeDisplay(selectedValue);
        loadData(); // Перезагружаем данные с новым периодом
      }
    });

    dropdownList.appendChild(listItem);
  });

  // Обработчик клика на селектор (открытие/закрытие выпадающего списка)
  periodSelector.addEventListener("click", function (event) {
    event.stopPropagation(); // Предотвращаем всплытие события
    dropdownList.style.display =
      dropdownList.style.display === "none" ? "block" : "none";
  });

  // Закрытие выпадающего списка при клике вне его
  document.addEventListener("click", function (event) {
    if (!periodSelector.contains(event.target)) {
      dropdownList.style.display = "none";
    }
  });

  // Собираем все элементы вместе
  periodSelector.appendChild(selectedPeriod);
  periodSelector.appendChild(arrowIcon);
  periodSelector.appendChild(dropdownList);

  periodSelectorContainer.appendChild(periodLabel);
  periodSelectorContainer.appendChild(periodSelector);
  periodSelectorContainer.appendChild(dateRangeDisplay);

  return periodSelectorContainer;
}

// Функция для отображения диалога выбора произвольных дат
function showDatePickerDialog() {
  // Проверяем, существует ли уже диалог
  let datePickerDialog = document.getElementById("datePickerDialog");

  if (!datePickerDialog) {
    // Создаем модальный диалог
    datePickerDialog = document.createElement("div");
    datePickerDialog.id = "datePickerDialog";
    datePickerDialog.className = "date-picker-dialog";

    // Создаем содержимое диалога
    datePickerDialog.innerHTML = `
      <div class="date-picker-content">
        <h3>Виберіть період дат</h3>
        <div class="date-inputs">
          <div class="date-input-group">
            <label for="startDatePicker">Дата початку:</label>
            <input type="date" id="startDatePicker" class="date-input">
          </div>
          <div class="date-input-group">
            <label for="endDatePicker">Дата кінця:</label>
            <input type="date" id="endDatePicker" class="date-input">
          </div>
        </div>
        <div class="date-picker-buttons">
          <button type="button" id="applyDateRange" class="apply-button">Застосувати</button>
          <button type="button" id="cancelDateRange" class="cancel-button">Скасувати</button>
        </div>
      </div>
    `;

    // Добавляем диалог в документ
    document.body.appendChild(datePickerDialog);

    // Получаем текущие даты из localStorage или устанавливаем текущую дату
    const savedStartDate = getFromLocalStorage("customStartDate");
    const savedEndDate = getFromLocalStorage("customEndDate");

    const startDatePicker = document.getElementById("startDatePicker");
    const endDatePicker = document.getElementById("endDatePicker");

    // Устанавливаем начальные значения
    if (savedStartDate) {
      startDatePicker.value = formatDateForInput(new Date(savedStartDate));
    } else {
      const defaultStart = new Date();
      defaultStart.setMonth(defaultStart.getMonth() - 1); // По умолчанию - месяц назад
      startDatePicker.value = formatDateForInput(defaultStart);
    }

    if (savedEndDate) {
      endDatePicker.value = formatDateForInput(new Date(savedEndDate));
    } else {
      endDatePicker.value = formatDateForInput(new Date());
    }

    // Обработчик кнопки "Отмена"
    document
      .getElementById("cancelDateRange")
      .addEventListener("click", function () {
        // Возвращаем предыдущее значение в селекторе
        const prevPeriod = getFromLocalStorage("selectedPeriod") || "all";
        if (prevPeriod !== "custom") {
          document.querySelector(".selected-period").textContent =
            document.querySelector(
              `.period-option[data-value="${prevPeriod}"]`
            ).textContent;
          saveToLocalStorage("selectedPeriod", prevPeriod);
          updateDateRangeDisplay(prevPeriod);
        }

        // Закрываем диалог
        datePickerDialog.remove();
      });
  } else {
    // Если диалог уже существует, просто показываем его
    datePickerDialog.style.display = "block";
  }
}

// Функция для форматирования даты для input type="date"
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Функция для обновления отображения диапазона дат
function updateDateRangeDisplay(periodType) {
  const dateRangeDisplay = document.getElementById("dateRangeDisplay");

  if (periodType === "all") {
    dateRangeDisplay.style.display = "none";
    // Очищаем сохраненные даты при выборе "Все данные"
    saveToLocalStorage("startDate", null);
    saveToLocalStorage("endDate", null);
    return;
  }

  if (periodType === "custom") {
    // Для кастомного периода берем сохраненные даты
    const savedStartDate = getFromLocalStorage("customStartDate");
    const savedEndDate = getFromLocalStorage("customEndDate");

    if (savedStartDate && savedEndDate) {
      const startDate = new Date(parseInt(savedStartDate));
      const endDate = new Date(parseInt(savedEndDate));
      updateCustomDateRangeDisplay(startDate, endDate);
    }
    return;
  }

  // Для стандартных периодов
  const dateRange = getDateRange(periodType);
  if (dateRange) {
    const { startDate, endDate } = dateRange;
    const formattedStart = formatDateForDisplay(startDate);
    const formattedEnd = formatDateForDisplay(endDate);

    dateRangeDisplay.textContent = `${formattedStart} — ${formattedEnd}`;
    dateRangeDisplay.style.display = "block";

    // Сохраняем даты для использования в запросах
    // Преобразуем в секунды, как требует API Remonline
    saveToLocalStorage("startDate", formatDateForApi(startDate));
    saveToLocalStorage("endDate", formatDateForApi(endDate));

    // Логируем для отладки
    console.log("Период:", periodType);
    console.log(
      "Начальная дата:",
      startDate.toISOString(),
      "(" + formatDateForApi(startDate) + ")"
    );
    console.log(
      "Конечная дата:",
      endDate.toISOString(),
      "(" + formatDateForApi(endDate) + ")"
    );
  }
}

// Функция для обновления отображения произвольного диапазона дат
function updateCustomDateRangeDisplay(startDate, endDate) {
  const dateRangeDisplay = document.getElementById("dateRangeDisplay");
  const formattedStart = formatDateForDisplay(startDate);
  const formattedEnd = formatDateForDisplay(endDate);

  dateRangeDisplay.textContent = `${formattedStart} — ${formattedEnd}`;
  dateRangeDisplay.style.display = "block";

  // Преобразуем в секунды для API
  saveToLocalStorage("startDate", formatDateForApi(startDate));
  saveToLocalStorage("endDate", formatDateForApi(endDate));

  // Логируем для отладки
  console.log("Пользовательский период");
  console.log(
    "Начальная дата:",
    startDate.toISOString(),
    "(" + formatDateForApi(startDate) + ")"
  );
  console.log(
    "Конечная дата:",
    endDate.toISOString(),
    "(" + formatDateForApi(endDate) + ")"
  );
}

// Функция инициализации селектора периода
function initializePeriodSelector() {
  // Проверяем, существует ли уже селектор периода
  if (document.querySelector(".period-selector-container")) {
    console.log("Селектор периода уже существует, пропускаем инициализацию");
    return;
  }

  // Находим контейнер формы, куда добавим селектор периода
  const formGroup = document.querySelector(".form-group-id");
  if (!formGroup) return;

  console.log("Инициализация селектора периода");

  // Создаем селектор периода
  const periodSelector = createPeriodSelector();

  // Добавляем селектор в форму после поля ввода ID
  formGroup.parentNode.insertBefore(periodSelector, formGroup.nextSibling);

  // Восстанавливаем выбранный период из localStorage
  const savedPeriod = getFromLocalStorage("selectedPeriod") || "all";
  const selectedLabel =
    document.querySelector(`.period-option[data-value="${savedPeriod}"]`)
      ?.textContent || "Всі дані";

  document.querySelector(".selected-period").textContent = selectedLabel;

  // Обновляем отображение диапазона дат
  updateDateRangeDisplay(savedPeriod);
}

// Обработчик кнопки "Применить" для кастомных дат
document.addEventListener("click", function (event) {
  if (event.target && event.target.id === "applyDateRange") {
    const startDatePicker = document.getElementById("startDatePicker");
    const endDatePicker = document.getElementById("endDatePicker");

    if (!startDatePicker || !endDatePicker) return;

    const startDate = new Date(startDatePicker.value);
    const endDate = new Date(endDatePicker.value);

    // Устанавливаем время
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Проверяем корректность дат
    if (startDate > endDate) {
      showNotification(
        "error",
        "Дата початку не може бути пізніше дати закінчення"
      );
      return;
    }

    // Сохраняем выбранные даты
    saveToLocalStorage("customStartDate", startDate.getTime());
    saveToLocalStorage("customEndDate", endDate.getTime());

    // Важно! Также сохраняем даты в формате для API (секунды)
    saveToLocalStorage("startDate", formatDateForApi(startDate));
    saveToLocalStorage("endDate", formatDateForApi(endDate));

    // Обновляем отображение диапазона дат
    updateCustomDateRangeDisplay(startDate, endDate);

    // Закрываем диалог
    const datePickerDialog = document.getElementById("datePickerDialog");
    if (datePickerDialog) {
      datePickerDialog.remove();
    }

    // Загружаем данные с новым периодом
    loadData();
  }
});

// Модифицируем функцию загрузки данных для учета выбранного периода
async function loadData() {
  // Сохраняем выбор пользователя
  saveUserSelection();

  const clientId = document.getElementById("idInput").value;

  if (!clientId) {
    document.getElementById(
      "result"
    ).innerHTML = `<p style="color: red;">Введіть ID клієнта</p>`;
    showNotification("error", "Введіть ID клієнта");
    return;
  }

  try {
    const preloader = document.getElementById("preloader");
    preloader.style.display = "flex";

    // Получаем данные о клиенте
    const clientResponse = await fetch("/api/proxy/get-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: clientId }),
    });

    const clientData = await clientResponse.json();

    // Получаем временной период из localStorage
    const selectedPeriod = getFromLocalStorage("selectedPeriod") || "all";
    let startDate = getFromLocalStorage("startDate");
    let endDate = getFromLocalStorage("endDate");

    // Значения для API
    let apiStartDate = 0; // Значение по умолчанию - с начала времен
    let apiEndDate = Math.floor(Date.now() / 1000) + 31536000; // Текущее время + 1 год (в секундах)

    // Если выбран период, используем его временные рамки
    if (selectedPeriod !== "all" && startDate && endDate) {
      apiStartDate = parseInt(startDate);
      apiEndDate = parseInt(endDate);

      // Для диагностики
      console.log("Используем временной диапазон:");
      console.log(
        "Начало периода:",
        new Date(apiStartDate * 1000).toISOString(),
        "(" + apiStartDate + ")"
      );
      console.log(
        "Конец периода:",
        new Date(apiEndDate * 1000).toISOString(),
        "(" + apiEndDate + ")"
      );
    } else {
      console.log("Используем весь временной диапазон");
    }

    // Обновление UI для показа процесса загрузки
    const result = document.getElementById("result");
    result.innerHTML = `<div class="loading-progress">Завантаження даних... Сторінка 1</div>`;

    // Реализация пагинации с обработкой ошибок
    let allTransfers = [];
    let currentPage = 1;
    let hasMoreData = true;
    const pageSize = 500; // Уменьшаем размер страницы для стабильности
    let errorCount = 0;
    const maxErrors = 3; // Максимальное количество ошибок, после которого прерываем загрузку

    // Получаем все финансовые операции клиента постранично
    while (hasMoreData && errorCount < maxErrors) {
      try {
        // Обновляем информацию о прогрессе
        document.querySelector(
          ".loading-progress"
        ).textContent = `Завантаження даних... Сторінка ${currentPage} (Завантажено записів: ${allTransfers.length})`;

        // Формируем запрос с учетом периода
        const requestBody = {
          client_id: clientId,
          page: currentPage,
          take: pageSize,
          pageSize: pageSize,
          skip: (currentPage - 1) * pageSize,
          sort: {},
        };

        // Добавляем параметры фильтрации только если выбран конкретный период
        if (selectedPeriod !== "all") {
          requestBody.startDate = apiStartDate;
          requestBody.endDate = apiEndDate;
          requestBody.tz = "Europe/Kiev";
        }

        console.log("Запрос данных:", requestBody);

        const response = await fetch("/api/proxy/client-transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          errorCount++;
          console.warn(
            `Ошибка при загрузке страницы ${currentPage}. Попытка: ${errorCount}/${maxErrors}`
          );

          if (errorCount >= maxErrors) {
            console.error(
              `Достигнуто максимальное количество ошибок (${maxErrors}). Прекращаем загрузку.`
            );
            // Если уже есть какие-то данные, продолжаем с ними
            if (allTransfers.length > 0) {
              hasMoreData = false;
              break;
            } else {
              throw new Error(
                `Не удалось загрузить данные после ${maxErrors} попыток`
              );
            }
          }

          // Делаем паузу перед следующей попыткой
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        const transfersData = await response.json();

        console.log(
          `Получено ${
            transfersData.data?.length || 0
          } записей на странице ${currentPage}`
        );

        // Если получили данные, добавляем их к общему массиву
        if (transfersData.data && transfersData.data.length > 0) {
          // Фильтруем данные по дате непосредственно на стороне клиента для подстраховки
          let filteredData = transfersData.data;

          // Дополнительная фильтрация, если выбран период (дублирующая, для надежности)
          if (selectedPeriod !== "all" && apiStartDate && apiEndDate) {
            filteredData = transfersData.data.filter((item) => {
              const recordTimestamp = Math.floor(
                new Date(item.created_at).getTime() / 1000
              );
              return (
                recordTimestamp >= apiStartDate && recordTimestamp <= apiEndDate
              );
            });

            console.log(
              `Отфильтровано ${filteredData.length} из ${transfersData.data.length} записей`
            );
          }

          allTransfers = [...allTransfers, ...filteredData];
          currentPage++;

          // Если получили меньше записей, чем pageSize, значит это последняя страница
          if (transfersData.data.length < pageSize) {
            hasMoreData = false;
          }

          // Ограничим максимальное количество страниц для предотвращения перегрузки
          if (currentPage > 30) {
            showNotification(
              "warning",
              "Дані обмежені 30 сторінками для стабільності"
            );
            hasMoreData = false;
          }

          // Небольшая пауза между запросами, чтобы не перегружать API
          await new Promise((resolve) => setTimeout(resolve, 300));
        } else {
          hasMoreData = false;
        }
      } catch (pageError) {
        console.error(
          `Ошибка при загрузке страницы ${currentPage}:`,
          pageError
        );
        errorCount++;

        if (errorCount >= maxErrors) {
          console.error(
            `Достигнуто максимальное количество ошибок (${maxErrors}). Прекращаем загрузку.`
          );
          // Если уже есть какие-то данные, продолжаем с ними
          if (allTransfers.length > 0) {
            hasMoreData = false;
            break;
          } else {
            throw new Error(
              `Не удалось загрузить данные после ${maxErrors} попыток`
            );
          }
        }

        // Делаем паузу перед следующей попыткой
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Проверяем наличие данных после загрузки всех страниц
    if (allTransfers.length === 0) {
      document.getElementById("result").innerHTML = `
        <p style="color: red;">Інформація по фінансовим операціям для цього клієнта відсутня за обраний період</p>
      `;
      showNotification(
        "warning",
        "Інформація по фінансовим операціям для цього клієнта відсутня за обраний період"
      );
      preloader.style.display = "none";
      return;
    }

    console.log(`Всего загружено ${allTransfers.length} записей`);

    // Формируем данные в едином формате для обработки
    const formattedTransfers = allTransfers.map((item) => ({
      id: item.id,
      created_at: item.created_at,
      employee: {
        fullname: item.created_by_fullname,
      },
      amount: parseFloat(item.amount) || 0,
      document_id: item.document?.id,
      document_label: item.document?.id_label,
      document_type: item.document?.type,
      dataSource: "transfers",
    }));

    // Получаем сотрудников для отображения имен
    const employeesResponse = await fetch(
      "/api/proxy/get-employees-and-invites",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );

    const employeesData = await employeesResponse.json();

    // Добавляем информацию о периоде в заголовок таблицы
    const periodText =
      selectedPeriod !== "all"
        ? ` за період: ${
            document.getElementById("dateRangeDisplay").textContent
          }`
        : "";

    // Создаем таблицу финансовых операций со всеми загруженными данными
    document.getElementById("result").innerHTML = createFinanceTableHTML(
      formattedTransfers,
      clientData,
      employeesData,
      periodText // Передаем информацию о периоде
    );

    showNotification(
      "success",
      `Завантажено ${allTransfers.length} фінансових операцій${periodText}`
    );
  } catch (error) {
    console.error("Ошибка:", error);
    document.getElementById(
      "result"
    ).innerHTML = `<p style="color: red;">Помилка: ${error.message}</p>`;
    showNotification("error", `Помилка: ${error.message}`);
  } finally {
    preloader.style.display = "none";
  }
}

// Код window.onload
window.onload = function () {
  document.getElementById("loadButton").onclick = () => loadData();

  // Функция для инициализации поиска клиентов с повторными попытками
  function initClientSearch() {
    // Сначала проверяем авторизацию
    checkAuthStatus()
      .then((isAuthorized) => {
        if (isAuthorized) {
          console.log("Пользователь авторизован, настраиваем поиск клиентов");

          // Пытаемся инициализировать поиск клиента сразу
          if (typeof setupClientSearch === "function") {
            setupClientSearch();
          }

          // И также с небольшой задержкой, чтобы DOM точно был готов
          setTimeout(() => {
            if (typeof setupClientSearch === "function") {
              setupClientSearch();
            }

            // Инициализируем селектор периода только один раз после загрузки страницы
            initializePeriodSelector();
          }, 1000);

          // Восстанавливаем последние выбранные значения
          restoreUserSelection();
        } else {
          console.log("Пользователь не авторизован");
        }
      })
      .catch((error) => {
        console.error("Ошибка при проверке авторизации:", error);
      });
  }

  // Вызываем инициализацию поиска
  initClientSearch();

  // Также вызываем инициализацию при изменении видимости основного контента
  const mainContent = document.getElementById("mainContent");
  if (mainContent) {
    // Создаем наблюдатель за изменениями стиля display
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === "style" &&
          mainContent.style.display !== "none"
        ) {
          console.log("Контент стал видимым, инициализируем поиск клиентов");

          // Инициализируем поиск клиентов после того как контент стал видимым
          if (typeof setupClientSearch === "function") {
            setupClientSearch();
          }

          // Инициализируем селектор периода (безопасно, без дублирования)
          initializePeriodSelector();
        }
      });
    });

    // Начинаем наблюдение
    observer.observe(mainContent, { attributes: true });
  }

  // Периодически проверяем статус авторизации (каждые 5 минут)
  setInterval(checkAuthStatus, 5 * 60 * 1000);
};
let tableData = [];

function handleKeyDown(event) {
  if (event.key === "Enter") {
    loadData();
  }
}

// Функции для работы с localStorage
function saveToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Ошибка при сохранении в localStorage: ${error.message}`);
  }
}

function getFromLocalStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Ошибка при чтении из localStorage: ${error.message}`);
    return null;
  }
}

// Функция для сохранения выбранного ID клиента
function saveUserSelection() {
  const clientId = document.getElementById("idInput").value;

  if (clientId) {
    saveToLocalStorage("lastClientId", clientId);
  }
}

// Функция для восстановления последних выбранных значений
function restoreUserSelection() {
  const lastClientId = getFromLocalStorage("lastClientId");

  if (lastClientId) {
    document.getElementById("idInput").value = lastClientId;
  }
}

// Функция для проверки статуса авторизации
async function checkAuthStatus() {
  try {
    const response = await fetch("/api/auth-status");
    const data = await response.json();

    if (!data.authorized) {
      console.log("Сессия истекла, перенаправляем на страницу входа");
      showNotification(
        "warning",
        "Сесія завершена. Необхідна повторна авторизація.",
        10000
      );

      // Небольшая задержка, чтобы пользователь успел увидеть уведомление
      setTimeout(() => {
        handleLogout();
      }, 2000);

      return false;
    }

    return true;
  } catch (error) {
    console.error("Ошибка при проверке статуса авторизации:", error);
    return false;
  }
}

// Функция для отображения уведомлений
function showNotification(type, message, duration = 3000) {
  // Проверяем, существует ли контейнер для уведомлений
  let notificationContainer = document.getElementById("notificationContainer");

  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "notificationContainer";
    document.body.appendChild(notificationContainer);
  }

  // Создаем новое уведомление
  const notification = document.createElement("div");
  notification.classList.add("notification", `notification-${type}`);

  // Добавляем текст и кнопку закрытия
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close">×</button>
  `;

  // Добавляем уведомление в контейнер
  notificationContainer.appendChild(notification);

  // Анимация появления
  setTimeout(() => {
    notification.classList.add("notification-visible");
  }, 10);

  // Настраиваем закрытие уведомления
  const closeBtn = notification.querySelector(".notification-close");
  closeBtn.addEventListener("click", () => removeNotification(notification));

  // Автоматическое удаление через указанное время
  if (duration) {
    setTimeout(() => removeNotification(notification), duration);
  }

  // Функция удаления уведомления
  function removeNotification(element) {
    element.classList.remove("notification-visible");
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 3000);
  }
}

async function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const loginError = document.getElementById("loginError");
  const loginForm = document.getElementById("loginForm");
  const mainContent = document.getElementById("mainContent");
  const preloader = document.getElementById("preloader");

  try {
    preloader.style.display = "flex";

    console.log("Отправка данных для входа:", { email, password });

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.status === 401) {
      loginError.textContent = "Неправильний логін або пароль";
      loginError.style.display = "block";
      return;
    }

    if (response.ok) {
      loginForm.style.display = "none";
      mainContent.style.display = "block";
      restoreUserSelection();
    } else {
      loginError.textContent = data.error || "Помилка входу";
      loginError.style.display = "block";
    }
  } catch (error) {
    console.error("Ошибка:", error);
    if (error.message.includes("401")) {
      loginError.textContent = "Неправильний логін або пароль";
    } else {
      loginError.textContent = "Виникла помилка при підключенні до сервера";
    }
    loginError.style.display = "block";
  } finally {
    preloader.style.display = "none";
  }
}

function handleLogout() {
  const loginForm = document.getElementById("loginForm");
  const mainContent = document.getElementById("mainContent");

  // Очищаем поля формы
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
  document.getElementById("loginError").style.display = "none";

  // Сбрасываем форму полностью
  loginForm.reset();

  // Показываем форму логина и скрываем основной контент
  loginForm.style.display = "flex";
  mainContent.style.display = "none";

  // Очищаем результаты
  document.getElementById("result").innerHTML = "";

  // Очищаем историю формы
  if (window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Типы финансовых документов
const documentTypes = {
  0: "Внесення коштів",
  1: "Продаж клієнту",
  2: "Переказ між касами",
  3: "Оплата замовлення",
  4: "Повернення коштів",
  5: "Витрата",
  6: "Оплата постачальнику",
};

function handleImageError(img) {
  img.onerror = null;
  img.src = "./img/GCAR_LOGO.png";
}

function createClientInfoSection(clientData) {
  // Форматирование даты создания клиента
  const createdDate = clientData.created_at
    ? new Date(clientData.created_at).toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "-";

  // Получение телефона клиента
  let phoneNumber = "-";
  if (clientData.phone && clientData.phone.length > 0) {
    phoneNumber = clientData.phone[0].phone || "-";
  }

  // Создаем HTML для секции с информацией о клиенте
  const clientInfoHTML = `
    <div class="client-info-section">
      <div class="client-header">
        <h2>Інформація про клієнта</h2>
      </div>
      <div class="client-details">
        <div class="client-row">
          <div class="client-field">
            <span class="field-label">ID клієнта:</span>
            <span class="field-value">${clientData.id || "-"}</span>
          </div>
          <div class="client-field">
            <span class="field-label">Ім'я/Назва:</span>
            <span class="field-value">${clientData.name || "-"}</span>
          </div>
          <div class="client-field">
            <span class="field-label">Телефон:</span>
            <span class="field-value">${phoneNumber}</span>
          </div>
        </div>
        <div class="client-row">
          <div class="client-field">
            <span class="field-label">E-mail:</span>
            <span class="field-value">${clientData.email || "-"}</span>
          </div>
          <div class="client-field">
            <span class="field-label">Адреса:</span>
            <span class="field-value">${clientData.address || "-"}</span>
          </div>
          <div class="client-field">
            <span class="field-label">Дата реєстрації клієнта:</span>
            <span class="field-value">${createdDate}</span>
          </div>
        </div>
        <div class="client-row">
          <div class="client-field">
            <span class="field-label">Загальний баланс за період співпраці:</span>
            <span class="field-value amount ${
              clientData.balance >= 0 ? "positive" : "negative"
            }">
              ${clientData.balance ? clientData.balance.toFixed(2) : "0.00"} грн
            </span>
          </div>
          <div class="client-field">
            <span class="field-label">Замітки:</span>
            <span class="field-value notes">${clientData.notes || "-"}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  return clientInfoHTML;
}

// Функция для создания таблицы
function createFinanceTableHTML(
  financeData,
  clientData,
  employeesData,
  periodText = ""
) {
  tableData = [];

  // Используем только данные из запроса client-transfers
  const transfersData = financeData.filter(
    (item) => item.dataSource === "transfers"
  );

  // Если нет данных о переводах, выводим сообщение
  if (transfersData.length === 0) {
    let tableHTML = createClientInfoSection(clientData);
    tableHTML += `
  <div class="finance-table-section">
    <div class="table-header">
      <h3>Фінансові операції клієнта${periodText}</h3>
      <div class="operation-count">
        Показано: ${transfersData.length} записей
      </div>
    </div>
    <div class="table-scroll-container">
      <table class="finance-table" id="financeTable">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Номер документа</th>
            <th>Тип документа</th>
            <th>Хто створив</th>
            <th>Рух коштів</th>
            <th>Документ підстава для грошей</th>
            <th>Баланс за обранний період</th>
          </tr>
        </thead>
        <tbody>
`;
    return tableHTML;
  }

  // Сортируем данные по дате (сначала новые, потом старые)
  let sortedData = [...transfersData].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  // Копия отсортированных данных для расчета баланса
  // Для расчета баланса нужно идти от старых к новым (хронологически)
  let balanceCalcData = [...sortedData].reverse();

  // Считаем баланс начиная со старых записей
  let balance = 0;
  balanceCalcData.forEach((item) => {
    // Определяем приход и расход
    const outcome = getOutcome(item); // Это будет отображаться в столбце "Рух коштів"
    const income = getIncome(item); // Это будет отображаться в столбце "Документ підстава для грошей"

    // Обновляем баланс как разницу между "Документ підстава для грошей" и "Рух коштів"
    balance += income - outcome;
    item.calculatedBalance = balance;
  });

  // Создаем HTML для отображения информации о клиенте
  let tableHTML = createClientInfoSection(clientData);

  // Добавляем заголовок таблицы финансовых операций с информацией о периоде
  tableHTML += `
    <div class="finance-table-section">
      <div class="table-header">
        <h3>Фінансові операції клієнта${periodText}</h3>
        <div class="operation-count">
          Показано: ${transfersData.length} записей
        </div>
      </div>
      <div class="table-scroll-container">
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Номер документа</th>
              <th>Тип документа</th>
              <th>Хто створив</th>
              <th>Рух коштів</th>
              <th>Документ підстава для грошей</th>
              <th>Баланс за обранний період</th>
            </tr>
          </thead>
          <tbody>
  `;

  // Создаем строки таблицы (используем sortedData - уже отсортированы от новых к старым)
  sortedData.forEach((item) => {
    const dateStr = formatDate(item.created_at);
    const documentId = getDocumentId(item);
    const documentType = getDocumentType(item);
    const employeeName = getEmployeeName(item, employeesData);

    // Получаем данные для колонок
    const movementAmount = getOutcome(item); // Для столбца "Рух коштів"
    const documentAmount = getIncome(item); // Для столбца "Документ підстава для грошей"

    // Преобразуем значения для отображения
    const movementDisplay =
      movementAmount > 0 ? movementAmount.toFixed(2) : "-";
    const documentDisplay =
      documentAmount > 0 ? documentAmount.toFixed(2) : "-";
    const balanceDisplay = item.calculatedBalance.toFixed(2);

    // Данные для экспорта
    tableData.push([
      dateStr,
      documentId,
      documentType,
      employeeName,
      movementDisplay,
      documentDisplay,
      balanceDisplay,
    ]);

    // HTML строки с правильным порядком данных в столбцах
    tableHTML += `
      <tr>
        <td>${dateStr}</td>
        <td>${documentId}</td>
        <td>${documentType}</td>
        <td>${employeeName}</td>
        <td class="amount income">${movementDisplay}</td>
        <td class="amount outcome">${documentDisplay}</td>
        <td class="amount balance ${
          item.calculatedBalance >= 0 ? "positive" : "negative"
        }">${balanceDisplay}</td>
      </tr>
    `;
  });

  tableHTML += `</tbody></table>
  </div>
  </div>`;
  return tableHTML;
}

// Получение типа документа
function getDocumentType(item) {
  // Для данных из второго API (переводы)
  if (item.dataSource === "transfers") {
    const documentType = item.document_type;

    // Обрабатываем коды типов документов согласно условиям
    switch (documentType) {
      case 0:
        return "заказ-наряд";
      case 1:
        return "продаж товару";
      case 3:
        return "оприбуткування";
      case 10:
        return "касова операція";
      case 90:
        return "коригування балaнсу";
      case 7:
        return "повернення постачальнику";
      case 2:
        return "відшкодування клієнту";
      default:
        return `Тип ${documentType || "неизвестный"}`;
    }
  }

  // По умолчанию
  return "-";
}

// Получение ID документа
function getDocumentId(item) {
  // Для данных из второго API (переводы)
  if (item.dataSource === "transfers") {
    return item.document_label || "-";
  }

  return "-";
}

// Функция для получения имени сотрудника
function getEmployeeName(item, employeesData) {
  // Для данных из второго API (переводы)
  if (item.dataSource === "transfers") {
    return item.employee?.fullname || "-";
  }

  return "-";
}

// Получение суммы прихода (для колонки "Документ підстава для грошей")
function getIncome(item) {
  // Для данных из второго API (переводы)
  if (item.dataSource === "transfers") {
    // Если сумма положительная, это приход
    const amount = parseFloat(item.amount);
    return amount > 0 ? amount : 0;
  }

  return 0;
}

// Получение суммы расхода (для колонки "Рух коштів")
function getOutcome(item) {
  // Для данных из второго API (переводы)
  if (item.dataSource === "transfers") {
    // Если сумма отрицательная, это расход (преобразуем в положительное число)
    const amount = parseFloat(item.amount);
    return amount < 0 ? Math.abs(amount) : 0;
  }

  return 0;
}

function formatDate(date) {
  return date
    ? new Date(date).toLocaleString("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
}

function exportToExcel() {
  // Добавляем BOM для правильной кодировки UTF-8
  const EXCEL_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";

  const ws = XLSX.utils.aoa_to_sheet([
    [
      "Дата",
      "Номер документа",
      "Тип документа",
      "Хто створив",
      "Рух коштів",
      "Документ підстава для грошей",
      "Баланс за обранний період",
    ],
    ...tableData,
  ]);

  // Настраиваем параметры для правильного отображения кириллицы
  ws["!cols"] = [
    { wch: 20 }, // Дата
    { wch: 15 }, // Номер документа
    { wch: 20 }, // Тип документа
    { wch: 25 }, // Кто создал
    { wch: 15 }, // Рух коштів
    { wch: 15 }, // Документ підстава для грошей
    { wch: 15 }, // Баланс за обранний період
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Финансы");

  // Добавляем параметр bookType для xlsx формата
  XLSX.writeFile(wb, "finance.xlsx", { bookType: "xlsx", type: "binary" });
}

function exportToPDF() {
  const { jsPDF } = window.jspdf;

  // Загружаем шрифт для поддержки кириллицы
  const loadFontAndExport = async () => {
    try {
      // Создаем PDF с альбомной ориентацией
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
        putOnlyUsedFonts: true,
        floatPrecision: 16,
      });

      // Импортируем шрифт Roboto для поддержки кириллицы (или другой подходящий)
      doc.addFont(
        "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf",
        "Roboto",
        "normal"
      );
      doc.setFont("Roboto");

      // Создаем конфигурацию для autoTable с поддержкой кириллицы
      doc.autoTable({
        head: [
          [
            "Дата",
            "Номер документа",
            "Тип документа",
            "Хто створив",
            "Рух коштів",
            "Документ підстава для грошей",
            "Баланс за обранний період",
          ],
        ],
        body: tableData,
        startY: 20,
        theme: "grid",
        styles: {
          font: "Roboto",
          fontStyle: "normal",
          fontSize: 9,
          cellPadding: 4,
          overflow: "linebreak",
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 60 },
          2: { cellWidth: 70 },
          3: { cellWidth: 70 },
          4: { cellWidth: 40 },
          5: { cellWidth: 40 },
          6: { cellWidth: 40 },
        },
        // Функция для дополнительной обработки ячеек
        didDrawCell: function (data) {
          // Дополнительные настройки при отрисовке ячеек, если потребуется
        },
      });

      doc.save("finance.pdf");
    } catch (error) {
      console.error("Ошибка при экспорте в PDF:", error);
      showNotification(
        "error",
        "Помилка експорту в PDF. Спробуйте експорт в Excel."
      );
    }
  };

  loadFontAndExport();
}
function handleLoginSubmit(event) {
  // Предотвращаем стандартное поведение формы
  event.preventDefault();
  // Вызываем функцию входа
  handleLogin();
}

function togglePassword() {
  const passwordInput = document.getElementById("password");
  const eyeIcon = document.querySelector(".eye-icon");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    eyeIcon.classList.add("hide");
  } else {
    passwordInput.type = "password";
    eyeIcon.classList.remove("hide");
  }
}

// Функция для настройки поиска клиентов
function setupClientSearch() {
  // Находим элемент input для ID клиента
  const idInput = document.getElementById("idInput");
  if (!idInput) {
    console.error("Элемент idInput не найден");
    return;
  }

  // Проверяем, не был ли уже создан контейнер поиска
  let searchContainer = idInput.parentElement.querySelector(
    ".client-search-container"
  );
  if (searchContainer) {
    console.log("Контейнер поиска клиентов уже существует");
    return;
  }

  console.log("Создаем контейнер поиска клиентов");

  // Создаем контейнер для поиска клиентов
  searchContainer = document.createElement("div");
  searchContainer.className = "client-search-container";

  // Создаем поле ввода для поиска
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.id = "clientSearchInput";
  searchInput.placeholder = "Пошук клієнта по імені...";
  searchInput.className = "client-search-input";

  // Создаем кнопку поиска
  const searchButton = document.createElement("button");
  searchButton.type = "button";
  searchButton.id = "clientSearchButton";
  searchButton.textContent = "Пошук";
  searchButton.className = "client-search-button";

  // Создаем контейнер для результатов поиска
  const resultsContainer = document.createElement("div");
  resultsContainer.id = "clientSearchResults";
  resultsContainer.className = "client-search-results";
  resultsContainer.style.display = "none";

  // Добавляем все элементы в контейнер поиска
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(searchButton);
  searchContainer.appendChild(resultsContainer);

  // Находим родительский элемент для поля ввода ID
  const parentElement = idInput.parentElement;
  // Добавляем контейнер поиска после поля ввода ID
  parentElement.appendChild(searchContainer);

  // Переменная для хранения таймера debounce
  let searchTimeout = null;

  // Функция debounce для поиска при вводе
  const debouncedSearch = function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        searchClients();
      }
    }, 500); // Задержка в 500 мс перед выполнением поиска
  };

  // Добавляем обработчики событий
  searchButton.addEventListener("click", searchClients);
  searchInput.addEventListener("input", debouncedSearch);
  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      clearTimeout(searchTimeout); // Отменяем задержку при нажатии Enter
      searchClients();
    }
  });

  // Закрываем результаты поиска при клике вне их
  document.addEventListener("click", function (event) {
    if (!searchContainer.contains(event.target)) {
      resultsContainer.style.display = "none";
    }
  });

  console.log("Контейнер поиска клиентов создан успешно");
}

// Функция для поиска клиентов
async function searchClients() {
  const searchInput = document.getElementById("clientSearchInput");
  const resultsContainer = document.getElementById("clientSearchResults");
  const query = searchInput.value.trim();

  if (query.length < 2) {
    showNotification("warning", "Введіть мінімум 2 символи для пошуку");
    return;
  }

  try {
    showNotification("info", "Пошук клієнтів...");
    resultsContainer.innerHTML = '<div class="loading-spinner"></div>';
    resultsContainer.style.display = "block";

    // Использование улучшенного поиска по всем страницам
    await searchAllClientPages(query, resultsContainer);
  } catch (error) {
    console.error("Ошибка при поиске клиентов:", error);
    resultsContainer.innerHTML = `<p class="error-message">Помилка пошуку: ${error.message}</p>`;
    showNotification("error", `Помилка пошуку: ${error.message}`);
  }
}

// Функция для поиска по всем страницам до обнаружения совпадения
async function searchAllClientPages(query, resultsContainer) {
  let allClients = [];
  let currentPage = 1;
  let foundMatch = false;
  let maxPages = 200; // Максимальное количество страниц для поиска
  let exactMatches = []; // Для хранения точных совпадений
  let partialMatches = []; // Для хранения частичных совпадений

  // Преобразуем запрос в нижний регистр для поиска без учета регистра
  const lowercaseQuery = query.toLowerCase();

  // Добавляем индикатор процесса поиска
  resultsContainer.innerHTML =
    '<div class="search-progress">Пошук на сторінці 1...</div>';

  while (!foundMatch && currentPage <= maxPages) {
    try {
      // Обновляем индикатор прогресса
      const progressDiv = resultsContainer.querySelector(".search-progress");
      if (progressDiv) {
        progressDiv.textContent = `Пошук на сторінці ${currentPage}...`;
      }

      const response = await fetch("/api/proxy/get-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "", // Отправляем пустой запрос, чтобы получить всю страницу
          page: currentPage,
          take: 100, // Увеличиваем размер страницы
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка запроса: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        break; // Если страница пуста, прекращаем поиск
      }

      // Фильтруем клиентов в соответствии с запросом
      const pageClients = data.data;

      // Проверяем каждого клиента на соответствие запросу
      pageClients.forEach((client) => {
        const clientName = client.name ? client.name.toLowerCase() : "";
        const clientId = client.id ? client.id.toString() : "";
        const clientPhone =
          client.phone && client.phone.length > 0
            ? client.phone[0].phone.toLowerCase()
            : "";

        // Проверяем полное соответствие имени
        if (clientName === lowercaseQuery || clientId === query) {
          exactMatches.push(client);
          foundMatch = true;
        }
        // Проверяем частичное соответствие имени, ID или телефону
        else if (
          clientName.includes(lowercaseQuery) ||
          clientId.includes(query) ||
          clientPhone.includes(lowercaseQuery)
        ) {
          partialMatches.push(client);
        }
      });

      // Если у нас уже достаточно совпадений, останавливаем поиск
      if (exactMatches.length > 0 || partialMatches.length >= 50) {
        foundMatch = true;
      } else {
        currentPage++;
      }
    } catch (error) {
      console.error(`Ошибка при загрузке страницы ${currentPage}:`, error);
      throw error;
    }
  }

  // Объединяем результаты, сначала точные совпадения, затем частичные
  allClients = [...exactMatches, ...partialMatches];

  // Сортируем результаты по релевантности
  allClients.sort((a, b) => {
    const nameA = a.name ? a.name.toLowerCase() : "";
    const nameB = b.name ? b.name.toLowerCase() : "";

    // Сначала проверяем начинается ли имя с запроса
    const startsWithA = nameA.startsWith(lowercaseQuery);
    const startsWithB = nameB.startsWith(lowercaseQuery);

    if (startsWithA && !startsWithB) return -1;
    if (!startsWithA && startsWithB) return 1;

    // Затем проверяем содержится ли запрос в имени
    const containsA = nameA.includes(lowercaseQuery);
    const containsB = nameB.includes(lowercaseQuery);

    if (containsA && !containsB) return -1;
    if (!containsA && containsB) return 1;

    // В конце сортируем по алфавиту
    return nameA.localeCompare(nameB);
  });

  // Ограничиваем количество результатов
  const limitedResults = allClients.slice(0, 100);

  // Отображаем результаты
  if (limitedResults.length > 0) {
    displaySearchResults(limitedResults);
    if (allClients.length > 100) {
      showNotification(
        "info",
        `Знайдено ${allClients.length} клієнтів. Показані перші 100. Уточніть пошуковий запит для більш точних результатів.`
      );
    }
  } else {
    resultsContainer.innerHTML =
      '<p class="no-results">Клієнтів не знайдено</p>';
  }
}

// Функция для инициализации фиксированной шапки таблицы
function initStickyTableHeader() {
  // Проверяем, есть ли таблица на странице
  const financeTable = document.querySelector(".finance-table");
  if (!financeTable) return;

  console.log("Инициализация фиксированной шапки таблицы");

  // Проверяем, применены ли уже стили position: sticky
  const tableHeader = financeTable.querySelector("thead");
  if (!tableHeader) return;

  // Принудительно применяем стили
  tableHeader.style.position = "sticky";
  tableHeader.style.top = "0";
  tableHeader.style.zIndex = "1000";

  const headerCells = tableHeader.querySelectorAll("th");
  headerCells.forEach((cell) => {
    cell.style.position = "sticky";
    cell.style.top = "0";
    cell.style.zIndex = "1000";
    cell.style.backgroundColor = "#4caf50";
  });

  console.log("Стили фиксированной шапки применены");
}

// Наблюдатель за изменениями DOM для определения момента создания таблицы
function setupTableObserver() {
  console.log("Настройка наблюдателя за таблицей");

  // Конфигурация наблюдателя - следим за добавлением узлов
  const config = { childList: true, subtree: true };

  // Функция обратного вызова при изменениях DOM
  const callback = function (mutationsList, observer) {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList" && mutation.addedNodes.length) {
        // Если добавлены новые узлы, проверяем, появилась ли таблица
        const financeTable = document.querySelector(
          ".finance-table, #financeTable"
        );
        if (financeTable) {
          console.log("Таблица найдена, применяем стили");
          // Даем небольшую задержку для полной отрисовки таблицы
          setTimeout(initStickyTableHeader, 100);
        }
      }
    }
  };

  // Создаем экземпляр наблюдателя с указанной функцией обратного вызова
  const observer = new MutationObserver(callback);

  // Начинаем наблюдение за изменениями в документе
  observer.observe(document.body, config);
}

// Функция для модификации createFinanceTableHTML
function patchCreateFinanceTableHTML() {
  console.log("Патчим функцию createFinanceTableHTML");

  // Сохраняем оригинальную функцию, если она существует
  if (typeof window.createFinanceTableHTML === "function") {
    const originalCreateFinanceTableHTML = window.createFinanceTableHTML;

    window.createFinanceTableHTML = function () {
      console.log("Вызвана модифицированная createFinanceTableHTML");
      // Вызываем оригинальную функцию
      const result = originalCreateFinanceTableHTML.apply(this, arguments);

      // После создания таблицы инициализируем фиксированную шапку
      setTimeout(initStickyTableHeader, 100);

      return result;
    };
  }
}

// Функция для модификации loadData
function patchLoadData() {
  console.log("Патчим функцию loadData");

  // Сохраняем оригинальную функцию, если она существует
  if (typeof window.loadData === "function") {
    const originalLoadData = window.loadData;

    window.loadData = function () {
      console.log("Вызвана модифицированная loadData");
      // Вызываем оригинальную функцию
      const result = originalLoadData.apply(this, arguments);

      // После загрузки данных инициализируем фиксированную шапку с задержкой
      setTimeout(initStickyTableHeader, 1000);

      return result;
    };
  }
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM загружен, начинаем настройку");
  setupTableObserver();
  patchCreateFinanceTableHTML();
  patchLoadData();

  // Также добавим обработчик события для кнопки загрузки
  const loadButton = document.getElementById("loadButton");
  if (loadButton) {
    loadButton.addEventListener("click", function () {
      console.log(
        "Нажата кнопка загрузки, повторно применяем стили через задержку"
      );
      setTimeout(initStickyTableHeader, 1000);
    });
  }
});

// Дополнительно инициализируем после полной загрузки страницы
window.addEventListener("load", function () {
  console.log("Страница полностью загружена, проверяем наличие таблицы");
  // Даем время на выполнение всех скриптов
  setTimeout(initStickyTableHeader, 500);
});
