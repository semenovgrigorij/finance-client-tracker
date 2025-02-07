function handleKeyDown(event) {
  if (event.key === "Enter") {
    loadData();
  }
}

window.onload = function () {
  document.getElementById("loadButton").onclick = () => loadData(1);
  populateLocations(); // Перемещаем сюда инициализацию локаций
};
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

    const response = await fetch(
      "https://product-movement.onrender.com/api/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }
    );

    if (!response.ok) {
      throw new Error(`https error! status: ${response.status}`);
    }

    const data = await response.json();
    // Проверяем статус ответа
    if (response.status === 401) {
      loginError.textContent = "Неправильний логін або пароль";
      loginError.style.display = "block";
      return;
    }

    if (response.ok) {
      loginForm.style.display = "none";
      mainContent.style.display = "block";
      populateLocations();
    } else {
      loginError.textContent = data.error || "Помилка входу";
      loginError.style.display = "block";
    }
  } catch (error) {
    console.error("Ошибка:", error);
    // Проверяем, является ли ошибка ответом 401
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
  loginForm.style.display = "block";
  mainContent.style.display = "none";

  // Очищаем результаты
  document.getElementById("result").innerHTML = "";
  // Очищаем историю формы
  if (window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

let tableData = [];
// Массив локаций
const branchIds = [
  { name: "001_G_CAR_UA", id: 112954 },
  { name: "002_G_CAR_PL", id: 123343 },
  { name: "003_INSURANCE CASES", id: 178097 },
  { name: "01_G_CAR_CENTRAL", id: 134397 },
  { name: "021_G_CAR_LV", id: 137783 },
  { name: "022_G_CAR_LV", id: 170450 },
  { name: "03_G_CAR_OD", id: 171966 },
  { name: "08_G_CAR_PLT", id: 147848 },
  { name: "16_G_CAR_CV", id: 155210 },
  { name: "181_G_CAR_LU", id: 158504 },
  { name: "182_G_CAR_LU", id: 177207 },
  { name: "191_G_CAR_RV", id: 154905 },
  { name: "192_G_CAR_RV", id: 184657 },
];
// Массив складов
const warehouses = {
  112954: [
    { name: "001_Київ ЦО_Маркетинг", id: "3936541" },
    { name: "001_Київ ЦО_Склад залишків ТМЦ", id: "3939523" },
    { name: "00_Центральний Офіс - Київ", id: "3582358" },
    { name: "01_Автопарк Київ", id: "3941802" },
    { name: "02_Автопарк Львів", id: "1752781" },
  ],
  123343: [
    { name: "28_Автопарк Варшава", id: "2121171" },
    { name: "29_Автопарк Краков", id: "3101146" },
    { name: "Склад товаров", id: "2134908" },
  ],
  178097: [{ name: "003 - INSURANCE - Б/В Запчастини", id: "3795083" }],
  134397: [
    { name: "01_Автопарк Київ", id: "2975737" },
    { name: "01_Автопарк Київ USA", id: "2864613" },
    { name: "01_Бориспольская", id: "1758933" },
    { name: "01_Обладнання", id: "1787666" },
    { name: "01_СТО G CAR Київ", id: "1751786" },
  ],
  137783: [
    { name: "021_Зовнішній_СТО G CAR Львів-1", id: "3345428" },
    { name: "021_Парковий_СТО G CAR Львів-1", id: "2975730" },
    { name: "021_Склад обладнання СТО G CAR Львів-1", id: "2629504" },
  ],
  170450: [
    { name: "022_Зовнішній_СТО G CAR Львів-2", id: "3561979" },
    { name: "022_Парковий_СТО G CAR Львів-2", id: "3547679" },
    { name: "022_Склад обладнання СТО G CAR Львів-2", id: "3882388" },
  ],
  171966: [
    { name: "03_Зовнішній_СТО G CAR Одеса", id: "3596936" },
    { name: "03_Парковий_СТО G CAR Одеса", id: "3677901" },
    { name: "03_Склад обладнання СТО G CAR Одеса", id: "3677908" },
  ],
  147848: [
    { name: "08_Автопарк Полтава Самокати", id: "3581659" },
    { name: "08_Зовнішній_СТО G CAR Полтава", id: "3345391" },
    { name: "08_Парковий_СТО G CAR Полтава", id: "2919486" },
    { name: "08_Склад обладнання СТО G CAR Полтава", id: "3671030" },
  ],
  155210: [
    { name: "16_Зовнішній_СТО G CAR Чернівці", id: "3345423" },
    { name: "16_Парковий_USA_СТО G CAR Чернівці", id: "3435299" },
    { name: "16_Парковий_СТО G CAR Чернівці", id: "3116261" },
    { name: "16_Склад обладнання СТО G CAR Чернівці", id: "3882429" },
  ],
  158504: [
    { name: "181_Зовнішній_СТО G CAR Луцьк-1", id: "3345400" },
    { name: "181_Парковий_СТО G CAR Луцьк-1", id: "3216547" },
    { name: "181_СТО G CAR Луцьк-1", id: "3273055" },
  ],
  177207: [
    { name: "182_Зовнішній_СТО G CAR Луцьк-2", id: "3778688" },
    { name: "182_СТО G CAR Луцьк-2", id: "3768208" },
  ],
  154905: [
    { name: "191_Зовнішній_СТО G CAR Рівне-1", id: "3345403" },
    { name: "191_Парковий_СТО G CAR Рівне-1", id: "3109550" },
    { name: "191_Склад обладнання СТО G CAR Рівне-1", id: "3882417" },
  ],
  184657: [
    { name: "192_Зовнішній склад запчастин_СТО G CAR Рівне-2", id: "3951182" },
    { name: "192_Склад автопарку G CAR Рівне 2", id: "3952158" },
    { name: "192_Склад обладнання СТО G CAR Рівне-2", id: "3951189" },
    { name: "Склад матеріалів", id: "3951093" },
  ],
};

const documentTypes = {
  0: "Замовлення",
  1: "Продаж",
  3: "Оприбуткування",
  4: "Списання",
  5: "Переміщення",
  7: "Повернення постачальнику",
};

function handleImageError(img) {
  img.onerror = null;
  img.src = "./img/GCAR_LOGO.png";
}

function populateLocations() {
  const locationSelect = document.getElementById("locationSelect");
  branchIds.forEach((branch) => {
    const option = document.createElement("option");
    option.value = branch.id;
    option.text = branch.name;
    locationSelect.add(option);
  });
}

function populateWarehouses(branchId) {
  const warehouseSelect = document.getElementById("warehouseSelect");
  warehouseSelect.innerHTML = '<option value="">Виберіть склад</option>';
  if (branchId && warehouses[branchId]) {
    warehouses[branchId].forEach((warehouse) => {
      const option = document.createElement("option");
      option.value = warehouse.id;
      option.text = warehouse.name;
      warehouseSelect.add(option);
    });
    warehouseSelect.disabled = false;
  } else {
    warehouseSelect.disabled = true;
  }
}

function handleLocationChange() {
  const locationSelect = document.getElementById("locationSelect");
  const loadButton = document.getElementById("loadButton");
  const errorDiv = document.getElementById("errorMessage"); // Добавим новый элемент для сообщений об ошибках
  const selectedBranchId = locationSelect.value;

  console.log("Selected Branch ID:", selectedBranchId);

  if (selectedBranchId === "") {
    // Если локация не выбрана, разрешаем поиск по всем локациям
    loadButton.disabled = false;
    if (errorDiv) errorDiv.style.display = "none";
  } else {
    // Если локация выбрана, требуем выбор склада
    loadButton.disabled = true;
    if (errorDiv) errorDiv.innerHTML = "Виберіть, будь ласка, склад";
    if (errorDiv) errorDiv.style.display = "block";
  }

  populateWarehouses(selectedBranchId);
}

function enableLoadButton() {
  const locationSelect = document.getElementById("locationSelect");
  const warehouseSelect = document.getElementById("warehouseSelect");
  const loadButton = document.getElementById("loadButton");
  const errorDiv = document.getElementById("errorMessage");

  const selectedLocationId = locationSelect.value;
  const selectedWarehouseId = warehouseSelect.value;

  // Если локация выбрана и склад выбран, активируем кнопку
  if (selectedLocationId !== "" && selectedWarehouseId !== "") {
    loadButton.disabled = false;
    if (errorDiv) errorDiv.style.display = "none";
  }
  // Если локация выбрана, но склад не выбран, деактивируем кнопку
  else if (selectedLocationId !== "") {
    loadButton.disabled = true;
    if (errorDiv) errorDiv.innerHTML = "Виберіть, будь ласка, склад";
    if (errorDiv) errorDiv.style.display = "block";
  }

  console.log("Selected Warehouse ID:", selectedWarehouseId);
}
/*
async function loadData() {
  const idInput = document.getElementById("idInput").value;
  const locationSelect = document.getElementById("locationSelect");
  const warehouseSelect = document.getElementById("warehouseSelect");
  const selectedLocationId = locationSelect.value;
  const selectedWarehouseId = warehouseSelect.value;

  try {
    const preloader = document.getElementById("preloader");
    preloader.style.display = "flex";

    let allData = [];
    let currentPage = 1;
    let hasMoreData = true;

    // Получаем данные о товаре и сотрудниках
    const [initialEntityResponse, initialEmployeeResponse] = await Promise.all([
      fetch("https://product-movement.onrender.com/api/proxy/get-entity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: idInput }),
      }),
      fetch(
        "https://product-movement.onrender.com/api/proxy/get-employees-and-invites",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      ),
    ]);

    entityData = await initialEntityResponse.json();
    employeesData = await initialEmployeeResponse.json();

    let totalRecords = 0; // Добавляем счетчик
    console.log("Начинаем сбор данных...");

    // Собираем данные по страницам
    while (hasMoreData) {
      const flowResponse = await fetch(
        "https://product-movement.onrender.com/api/proxy/goods-flow-items",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sort: {},
            page: currentPage,
            take: 50,
            pageSize: 50,
            skip: (currentPage - 1) * 50,
            startDate: 0,
            endDate: 253402300799999,
            tz: "Europe/Kiev",
            id: idInput,
          }),
        }
      );

      const flowData = await flowResponse.json();
      console.log(
        `Страница ${currentPage}, получено записей:`,
        flowData.data?.length
      );
      console.log("Всего записей в системе:", flowData.count);

      if (flowData.data && flowData.data.length > 0) {
        allData = [...allData, ...flowData.data];
        currentPage++;
      } else {
        hasMoreData = false; // Прекращаем цикл если нет данных
      }
      console.log("Всего собрано записей:", allData.length);
    }

    if (selectedLocationId && selectedWarehouseId) {
      // Фильтруем данные только если выбран конкретный склад
      allData = allData.filter((item) => {
        const relationType = parseInt(item.relation_type, 10);

        if (relationType === 5) {
          // Если это перемещение
          if (item.outcome) {
            // Если это расход, сравниваем с warehouse_id
            return String(item.warehouse_id) === String(selectedWarehouseId);
          } else if (item.income) {
            // Если это приход, сравниваем с optional_warehouse_id
            return (
              String(item.optional_warehouse_id) === String(selectedWarehouseId)
            );
          }
        } else {
          // Для всех остальных типов операций сравниваем с warehouse_id
          return String(item.warehouse_id) === String(selectedWarehouseId);
        }
        return false; // Если ни одно условие не подошло
      });
    }

    // Проверяем, есть ли данные после фильтрации
    if (allData.length === 0) {
      document.getElementById(
        "result"
      ).innerHTML = `<p style="color: red;">Информация по этому складу для данного товара отсутствует</p>`;
      return;
    }

    // Создаем таблицу
    let tableHTML = `
      <div class="entity-info">
        <div class="product-header">
          <div class="product-image">
            ${
              entityData.image
                ? `<img src="${entityData.image}" alt="Изображение товара" onerror="handleImageError(this)">`
                : `<img src="./img/GCAR_LOGO.png">`
            }
          </div>
          <div class="product-details">
            <h3>Товар:</h3>
            <p>ID: ${entityData.id || "-"}</p>
            <p>Название: ${entityData.title || "-"}</p>
            <p>Количество записей: ${allData.length}</p>
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Дата</th>
            <th>Номер документа</th>
            <th>Тип документа</th>
            <th>Кто создал</th>
            <th>Склад (ID)</th>
            <th>Контрагент (ID)</th>
            <th>Приход</th>
            <th>Расход</th>
            <th>Остаток</th>
          </tr>
        </thead>
        <tbody>
    `;

    let balance = 0;
    allData.forEach((item) => {
      const income = item.income !== undefined ? parseFloat(item.income) : 0;
      const outcome = item.outcome !== undefined ? parseFloat(item.outcome) : 0;
      item.balance = balance - outcome + income; // Сохраняем остаток в объекте
      balance = item.balance;
      const relationType = parseInt(item.relation_type, 10);
      const documentType = documentTypes[relationType] || "-";
      const employeeName =
        employeesData.data.find((emp) => emp.id === item.employee_id)
          ?.counterparty?.fullname ||
        employeesData.data.find((emp) => emp.id === item.employee_id)?.name ||
        employeesData.data.find((emp) => emp.id === item.employee_id)?.login ||
        item.employee_id ||
        "-";
      const dateStr = item.created_at
        ? new Date(item.created_at).toLocaleString("ru-RU", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
      // Определяем склад и контрагента в зависимости от типа операции
      let warehouseInfo, clientInfo;

      if (relationType === 5) {
        // Если это перемещение
        if (outcome) {
          // Если это расход (перемещение из склада)
          warehouseInfo = `${item.warehouse_title || "-"} (${
            item.warehouse_id || "-"
          })`;
          clientInfo = `${item.optional_warehouse_title || "-"} (${
            item.optional_warehouse_id || "-"
          })`;
        } else if (income) {
          // Если это приход (перемещение на склад)
          warehouseInfo = `${item.optional_warehouse_title || "-"} (${
            item.optional_warehouse_id || "-"
          })`;
          clientInfo = `${item.warehouse_title || "-"} (${
            item.warehouse_id || "-"
          })`;
        }
      } else {
        // Для остальных типов операций оставляем как было
        warehouseInfo = `${item.warehouse_title || "-"} (${
          item.warehouse_id || "-"
        })`;
        clientInfo = `${item.client_name || "-"} (${item.client_id || "-"})`;
      }

      // Вычисляем остаток только если операция относится к выбранному складу
      let currentBalance = 0;
      const warehouseIdFromInfo = warehouseInfo.match(/\((\d+)\)/)?.[1];
      if (warehouseIdFromInfo === selectedWarehouseId) {
        balance = balance - outcome + income;
        currentBalance = balance;
      }

      // balance = balance - outcome + income;

      console.log("Обработка записи:", dateStr);

      tableHTML += `
        <tr>
          <td>${dateStr}</td>
          <td>${item.relation_id_label || "-"}</td>
          <td>${documentType}</td>
          <td>${employeeName}</td>
          <td>${warehouseInfo}</td>
          <td>${clientInfo}</td>
          <td>${item.income !== undefined ? item.income : "-"}</td>
          <td>${item.outcome !== undefined ? item.outcome : "-"}</td>
          <td>${currentBalance || "-"}</td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table>`;
    document.getElementById("result").innerHTML = tableHTML;
  } catch (error) {
    console.error("Ошибка:", error);
    document.getElementById(
      "result"
    ).innerHTML = `<p style="color: red;">Ошибка: ${error.message}</p>`;
  } finally {
    preloader.style.display = "none";
  }
}  */
async function loadData() {
  const idInput = document.getElementById("idInput").value;
  const locationSelect = document.getElementById("locationSelect");
  const warehouseSelect = document.getElementById("warehouseSelect");
  const selectedLocationId = locationSelect.value;
  const selectedWarehouseId = warehouseSelect.value;

  try {
    const preloader = document.getElementById("preloader");
    preloader.style.display = "flex";

    // Получаем данные о товаре и сотрудниках
    const [entityData, employeesData] = await getInitialData(idInput);

    // Собираем все данные о движении товара
    const allData = await collectAllData(idInput);

    // Фильтруем данные по выбранному складу если нужно
    const filteredData = filterDataByWarehouse(
      allData,
      selectedLocationId,
      selectedWarehouseId
    );

    if (filteredData.length === 0) {
      showNoDataMessage();
      return;
    }

    // Создаем и отображаем таблицу
    document.getElementById("result").innerHTML = createTableHTML(
      filteredData,
      entityData,
      employeesData,
      selectedWarehouseId
    );
  } catch (error) {
    console.error("Ошибка:", error);
    showErrorMessage(error);
  } finally {
    preloader.style.display = "none";
  }
}

async function getInitialData(idInput) {
  const [entityResponse, employeesResponse] = await Promise.all([
    fetch("https://product-movement.onrender.com/api/proxy/get-entity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: idInput }),
    }),
    fetch(
      "https://product-movement.onrender.com/api/proxy/get-employees-and-invites",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    ),
  ]);

  const entityData = await entityResponse.json();
  const employeesData = await employeesResponse.json();
  return [entityData, employeesData];
}

async function collectAllData(idInput) {
  let allData = [];
  let currentPage = 1;
  let hasMoreData = true;

  console.log("Начинаем сбор данных...");

  while (hasMoreData) {
    const flowData = await fetchPageData(currentPage, idInput);

    if (flowData.data?.length > 0) {
      allData = [...allData, ...flowData.data];
      currentPage++;
    } else {
      hasMoreData = false;
    }

    console.log("Всего собрано записей:", allData.length);
  }

  return allData;
}

async function fetchPageData(page, idInput) {
  const response = await fetch(
    "https://product-movement.onrender.com/api/proxy/goods-flow-items",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sort: {},
        page,
        take: 50,
        pageSize: 50,
        skip: (page - 1) * 50,
        startDate: 0,
        endDate: 253402300799999,
        tz: "Europe/Kiev",
        id: idInput,
      }),
    }
  );

  const data = await response.json();
  console.log(`Страница ${page}, получено записей:`, data.data?.length);
  return data;
}

function filterDataByWarehouse(data, locationId, warehouseId) {
  if (!locationId || !warehouseId) return data;

  return data.filter((item) => {
    const relationType = parseInt(item.relation_type, 10);

    if (relationType === 5) {
      if (item.outcome) {
        return String(item.warehouse_id) === String(warehouseId);
      } else if (item.income) {
        return String(item.optional_warehouse_id) === String(warehouseId);
      }
    } else {
      return String(item.warehouse_id) === String(warehouseId);
    }
    return false;
  });
}

function showNoDataMessage() {
  document.getElementById(
    "result"
  ).innerHTML = `<p style="color: red;">Информация по этому складу для данного товара отсутствует</p>`;
}

function showErrorMessage(error) {
  document.getElementById(
    "result"
  ).innerHTML = `<p style="color: red;">Ошибка: ${error.message}</p>`;
}
// Функция создания таблицы
/*function createTable(allData, entityData, employeesData) {
  // Создаём HTML таблицы с использованием всех собранных данных
  let tableHTML = `
    <div class="entity-info">
      <div class="product-header">
        <div class="product-image">
          ${
            entityData.image
              ? `<img src="${entityData.image}" alt="Изображение товара" onerror="handleImageError(this)">`
              : `<img src="./img/GCAR_LOGO.png">`
          }
        </div>
        <div class="product-details">
          <h3>Товар:</h3>
          <p>ID: ${entityData.id || "-"}</p>
          <p>Название: ${entityData.title || "-"}</p>
        </div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Дата</th>
          <th>Номер документа</th>
          <th>Тип документа</th>
          <th>Кто создал</th>
          <th>Склад (ID)</th>
          <th>Контрагент (ID)</th>
          <th>Приход</th>
          <th>Расход</th>
          <th>Остаток</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Создаём мапу сотрудников
  const employeesMap = {};
  if (employeesData?.data) {
    employeesData.data.forEach((employee) => {
      employeesMap[employee.id] = employee.name || employee.login;
    });
  }
  // Сначала сортируем от старых к новым для расчета остатков
  allData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  // Теперь сортируем от новых к старым для отображения
  allData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  // Добавляем строки таблицы
  let balance = 0;
  // Считаем остатки
  allData.reverse().forEach((item) => {
    const income = item.income !== undefined ? parseFloat(item.income) : 0;
    const outcome = item.outcome !== undefined ? parseFloat(item.outcome) : 0;
    balance = balance - outcome + income;

    // Добавляем строку в таблицу
    tableHTML += `<tr>...</tr>`; // Ваш существующий код формирования строки
  });

  tableHTML += `</tbody></table>`;
  document.getElementById("result").innerHTML = tableHTML;
} */
function createTableHTML(
  allData,
  entityData,
  employeesData,
  selectedWarehouseId
) {
  // Сначала сортируем от старых к новым для расчета остатков
  let sortedData = [...allData].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
  // Рассчитываем остатки
  let balance = 0;
  sortedData.forEach((item) => {
    const income = item.income !== undefined ? parseFloat(item.income) : 0;
    const outcome = item.outcome !== undefined ? parseFloat(item.outcome) : 0;

    if (shouldCountBalance(item, selectedWarehouseId)) {
      balance += income - outcome;
      item.calculatedBalance = balance;
    }
  });
  // Теперь сортируем от новых к старым для отображения
  sortedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Создаем HTML таблицы
  // let tableHTML = createTableHeader(entityData, sortedData.length);
  // Создаем шапку таблицы

  let tableHTML = `
    <div class="entity-info">
      <div class="product-header">
        <div class="product-image">
          ${
            entityData.image
              ? `<img src="${entityData.image}" alt="Изображение товара" onerror="handleImageError(this)">`
              : `<img src="./img/GCAR_LOGO.png">`
          }
        </div>
        <div class="product-details">
          <h3>Товар:</h3>
          <p>ID: ${entityData.id || "-"}</p>
          <p>Название: ${entityData.title || "-"}</p>
          <p>Количество записей: ${allData.length}</p>
        </div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Дата</th>
          <th>Номер документа</th>
          <th>Тип документа</th>
          <th>Кто создал</th>
          <th>Склад (ID)</th>
          <th>Контрагент (ID)</th>
          <th>Приход</th>
          <th>Расход</th>
          <th>Остаток</th>
        </tr>
      </thead>
      <tbody>
  `;
  // Добавляем строки таблицы
  sortedData.forEach((item) => {
    tableHTML += createTableRow(item, employeesData, selectedWarehouseId);
  });
  tableHTML += `</tbody></table>`;
  // return tableHTML;
}

function shouldCountBalance(item, selectedWarehouseId) {
  const relationType = parseInt(item.relation_type, 10);

  if (relationType === 5) {
    if (item.outcome) {
      return String(item.warehouse_id) === String(selectedWarehouseId);
    } else if (item.income) {
      return String(item.optional_warehouse_id) === String(selectedWarehouseId);
    }
  }
  return String(item.warehouse_id) === String(selectedWarehouseId);
}

function createTableRow(item, employeesData, balance, selectedWarehouseId) {
  const income = item.income !== undefined ? parseFloat(item.income) : 0;
  const outcome = item.outcome !== undefined ? parseFloat(item.outcome) : 0;
  const relationType = parseInt(item.relation_type, 10);
  const { warehouseInfo, clientInfo } = getWarehouseAndClientInfo(
    item,
    relationType,
    income,
    outcome
  );

  const dateStr = formatDate(item.created_at);
  const employeeName = getEmployeeName(item.employee_id, employeesData);
  const documentType = documentTypes[relationType] || "-";

  let currentBalance = 0;
  const warehouseIdFromInfo = warehouseInfo.match(/\((\d+)\)/)?.[1];
  if (warehouseIdFromInfo === selectedWarehouseId) {
    balance = balance - outcome + income;
    currentBalance = balance;
  }

  const html = `
    <tr>
      <td>${dateStr}</td>
      <td>${item.relation_id_label || "-"}</td>
      <td>${documentType}</td>
      <td>${employeeName}</td>
      <td>${warehouseInfo}</td>
      <td>${clientInfo}</td>
      <td>${item.income !== undefined ? item.income : "-"}</td>
      <td>${item.outcome !== undefined ? item.outcome : "-"}</td>
      <td>${currentBalance || "-"}</td>
    </tr>
  `;

  return { html, balance };
}

function getWarehouseAndClientInfo(item, relationType, income, outcome) {
  let warehouseInfo, clientInfo;

  if (relationType === 5) {
    if (outcome) {
      warehouseInfo = `${item.warehouse_title || "-"} (${
        item.warehouse_id || "-"
      })`;
      clientInfo = `${item.optional_warehouse_title || "-"} (${
        item.optional_warehouse_id || "-"
      })`;
    } else if (income) {
      warehouseInfo = `${item.optional_warehouse_title || "-"} (${
        item.optional_warehouse_id || "-"
      })`;
      clientInfo = `${item.warehouse_title || "-"} (${
        item.warehouse_id || "-"
      })`;
    }
  } else {
    warehouseInfo = `${item.warehouse_title || "-"} (${
      item.warehouse_id || "-"
    })`;
    clientInfo = `${item.client_name || "-"} (${item.client_id || "-"})`;
  }

  return { warehouseInfo, clientInfo };
}

function getEmployeeName(employeeId, employeesData) {
  return (
    employeesData.data.find((emp) => emp.id === employeeId)?.counterparty
      ?.fullname ||
    employeesData.data.find((emp) => emp.id === employeeId)?.name ||
    employeesData.data.find((emp) => emp.id === employeeId)?.login ||
    employeeId ||
    "-"
  );
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
// Обновляем обработчик события для поля ввода
function handleKeyDown(event) {
  if (event.key === "Enter") {
    loadData();
  }
}

// Обновляем обработчик кнопки загрузки
document.getElementById("loadButton").onclick = loadData;

function exportToExcel() {
  const ws = XLSX.utils.aoa_to_sheet([
    [
      "Дата",
      "Номер документа",
      "Тип документу",
      "Хто створив",
      "Склад (ID)",
      "Контрагент (ID)",
      "Надходження",
      "Витрата",
      "Залишок",
    ],
    ...tableData,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, "data.xlsx");
}

function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape", // Альбомная ориентация
    unit: "pt", // Единицы измерения
    format: "a4", // Формат страницы
  });

  doc.autoTable({
    head: [
      [
        "Дата",
        "Номер документа",
        "Тип документу",
        "Хто створив",
        "Склад (ID)",
        "Контрагент (ID)",
        "Надходження",
        "Витрата",
        "Залишок",
      ],
    ],
    body: tableData,
    startY: 20, // Начальная позиция таблицы
    theme: "grid", // Тема таблицы
    styles: {
      fontSize: 8, // Размер шрифта
      cellPadding: 4, // Внутренние отступы ячеек
      overflow: "linebreak", // Перенос текста
    },
    columnStyles: {
      0: { cellWidth: 60 }, // Ширина для столбца
      1: { cellWidth: 80 },
      2: { cellWidth: 60 },
      3: { cellWidth: 60 },
      4: { cellWidth: 40 },
      5: { cellWidth: 40 },
    },
  });

  doc.save("data.pdf");
}

// Инициализация выпадающих списков
populateLocations();

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
