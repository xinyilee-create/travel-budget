const STORAGE_KEY = "voyage-budget-dashboard";

function createTrip({
  name = "New Trip",
  displayCurrency = "NT$",
  cashReserve = 0,
  rates = { TWD: 1, HKD: 4.07, THB: 0.95 },
  expenses = [],
} = {}) {
  return {
    id: crypto.randomUUID(),
    name,
    displayCurrency,
    cashReserve,
    rates: {
      TWD: 1,
      HKD: rates.HKD ?? 4.07,
      THB: rates.THB ?? 0.95,
    },
    expenses: expenses.map((expense) => ({
      id: expense.id || crypto.randomUUID(),
      ...expense,
    })),
  };
}

const sampleTrip = createTrip({
  name: "Hong Kong + Thailand",
  cashReserve: 6000,
  expenses: [
    { name: "airport pickup", region: "General", category: "transport", currency: "TWD", amount: 1057, method: "card" },
    { name: "flight ticket (TP-HK)", region: "HK", category: "transport", currency: "TWD", amount: 3863, method: "card" },
    { name: "flight ticket (HK-Thai)", region: "TH", category: "transport", currency: "TWD", amount: 7118, method: "card" },
    { name: "flight ticket (Thai-TP)", region: "TH", category: "transport", currency: "TWD", amount: 5275, method: "card" },
    { name: "accommodation (HK)", region: "HK", category: "accommodation", currency: "TWD", amount: 2638, method: "card" },
    { name: "accommodation (Thai)", region: "TH", category: "accommodation", currency: "TWD", amount: 3743, method: "card" },
    { name: "art basel ticket", region: "HK", category: "ticket", currency: "TWD", amount: 1514, method: "card" },
    { name: "HK esim", region: "HK", category: "connectivity", currency: "TWD", amount: 49, method: "card" },
    { name: "Thai esim", region: "TH", category: "connectivity", currency: "TWD", amount: 140, method: "card" },
    { name: "power bank", region: "General", category: "misc", currency: "TWD", amount: 890, method: "card" },
  ],
});

const sampleState = {
  currentTripId: sampleTrip.id,
  trips: [sampleTrip],
};

const state = loadState();

const refs = {
  tripForm: document.querySelector("#tripForm"),
  expenseForm: document.querySelector("#expenseForm"),
  tripSelector: document.querySelector("#tripSelector"),
  newTripButton: document.querySelector("#newTripButton"),
  categoryList: document.querySelector("#categoryList"),
  quickStatus: document.querySelector("#quickStatus"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  expenseItemTemplate: document.querySelector("#expenseItemTemplate"),
  hkExpenseList: document.querySelector("#hkExpenseList"),
  thExpenseList: document.querySelector("#thExpenseList"),
  generalExpenseList: document.querySelector("#generalExpenseList"),
  hkSectionMeta: document.querySelector("#hkSectionMeta"),
  thSectionMeta: document.querySelector("#thSectionMeta"),
  generalSectionMeta: document.querySelector("#generalSectionMeta"),
};

["tripName", "displayCurrency", "cashReserve", "hkdRate", "thbRate"].forEach((id) => {
  document.querySelector(`#${id}`)?.addEventListener("input", handleTripChange);
});

refs.tripSelector?.addEventListener("change", handleTripSwitch);
refs.newTripButton?.addEventListener("click", createNewTrip);
refs.expenseForm?.addEventListener("submit", handleExpenseSubmit);
refs.loadSampleButton?.addEventListener("click", () => {
  replaceState(structuredClone(sampleState));
  refs.quickStatus.textContent = "已載入旅費範例。";
});
refs.exportButton?.addEventListener("click", exportData);
refs.importInput?.addEventListener("change", importData);

render();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return structuredClone(sampleState);
    }

    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed.trips) && parsed.trips.length > 0) {
      const trips = parsed.trips.map((trip) =>
        createTrip({
          ...trip,
          expenses: trip.expenses || [],
          rates: trip.rates || {},
        })
      );
      const currentTripId = trips.some((trip) => trip.id === parsed.currentTripId)
        ? parsed.currentTripId
        : trips[0].id;

      return { currentTripId, trips };
    }

    if (parsed.trip && Array.isArray(parsed.expenses)) {
      const migratedTrip = createTrip({
        ...parsed.trip,
        expenses: parsed.expenses,
      });
      return {
        currentTripId: migratedTrip.id,
        trips: [migratedTrip],
      };
    }

    return structuredClone(sampleState);
  } catch (error) {
    return structuredClone(sampleState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function replaceState(nextState) {
  state.currentTripId = nextState.currentTripId;
  state.trips = nextState.trips.map((trip) => createTrip(trip));
  saveState();
  render();
}

function getCurrentTrip() {
  return state.trips.find((trip) => trip.id === state.currentTripId) || state.trips[0];
}

function handleTripSwitch(event) {
  state.currentTripId = event.target.value;
  saveState();
  refs.quickStatus.textContent = "已切換旅程。";
  render();
}

function createNewTrip() {
  const nextIndex = state.trips.length + 1;
  const trip = createTrip({
    name: `Trip ${nextIndex}`,
    cashReserve: 0,
    expenses: [],
  });

  state.trips.unshift(trip);
  state.currentTripId = trip.id;
  saveState();
  refs.quickStatus.textContent = "已新增新旅程。";
  render();
}

function handleTripChange() {
  const trip = getCurrentTrip();
  trip.name = document.querySelector("#tripName").value.trim() || "Untitled Trip";
  trip.displayCurrency = document.querySelector("#displayCurrency").value.trim() || "NT$";
  trip.cashReserve = Number(document.querySelector("#cashReserve").value) || 0;
  trip.rates = {
    TWD: 1,
    HKD: Number(document.querySelector("#hkdRate").value) || 4.07,
    THB: Number(document.querySelector("#thbRate").value) || 0.95,
  };
  saveState();
  render();
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const name = String(formData.get("expenseName")).trim();
  const region = String(formData.get("expenseRegion"));
  const category = String(formData.get("expenseCategory"));
  const currency = String(formData.get("expenseCurrency"));
  const amount = Number(formData.get("expenseAmount"));
  const method = String(formData.get("expenseMethod"));

  if (!name || !amount) {
    refs.quickStatus.textContent = "請先填寫項目名稱和金額。";
    return;
  }

  const trip = getCurrentTrip();
  trip.expenses.unshift({
    id: crypto.randomUUID(),
    name,
    region,
    category,
    currency,
    amount,
    method,
  });

  saveState();
  event.currentTarget.reset();
  document.querySelector("#expenseCurrency").value = currency;
  document.querySelector("#expenseRegion").value = region;
  document.querySelector("#expenseCategory").value = category;
  document.querySelector("#expenseMethod").value = method;
  refs.quickStatus.textContent = "已新增一筆支出。";
  render();
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "voyage-budget-dashboard",
    data: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "voyage-budget-dashboard.json";
  link.click();
  URL.revokeObjectURL(url);
  refs.quickStatus.textContent = "已匯出資料。";
}

async function importData(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const nextState = parsed.data || parsed;

    if (Array.isArray(nextState.trips) && nextState.trips.length > 0) {
      replaceState({
        currentTripId: nextState.currentTripId || nextState.trips[0].id,
        trips: nextState.trips,
      });
    } else if (nextState.trip && Array.isArray(nextState.expenses)) {
      const migratedTrip = createTrip({
        ...nextState.trip,
        expenses: nextState.expenses,
      });
      replaceState({
        currentTripId: migratedTrip.id,
        trips: [migratedTrip],
      });
    } else {
      throw new Error("Invalid data");
    }

    refs.quickStatus.textContent = "已匯入資料。";
  } catch (error) {
    refs.quickStatus.textContent = "匯入失敗，請確認 JSON 檔案格式。";
  } finally {
    event.target.value = "";
  }
}

function render() {
  renderTripSelector();
  syncForms();
  renderHeader();
  renderRegions();
  renderCategories();
  renderExpenses();
}

function renderTripSelector() {
  refs.tripSelector.innerHTML = "";
  state.trips.forEach((trip) => {
    const option = document.createElement("option");
    option.value = trip.id;
    option.textContent = trip.name || "Untitled Trip";
    option.selected = trip.id === state.currentTripId;
    refs.tripSelector.appendChild(option);
  });
}

function syncForms() {
  const trip = getCurrentTrip();
  document.querySelector("#tripName").value = trip.name || "";
  document.querySelector("#displayCurrency").value = trip.displayCurrency || "NT$";
  document.querySelector("#cashReserve").value = trip.cashReserve || "";
  document.querySelector("#hkdRate").value = trip.rates.HKD || 4.07;
  document.querySelector("#thbRate").value = trip.rates.THB || 0.95;
}

function renderHeader() {
  const trip = getCurrentTrip();
  const converted = trip.expenses.map((item) => convertExpense(item, trip));
  const fixedTotal = converted.reduce((sum, item) => sum + item.twdAmount, 0);
  const cashReserve = trip.cashReserve || 0;
  const grandTotal = fixedTotal + cashReserve;
  const cardTotal = converted.filter((item) => item.method === "card").reduce((sum, item) => sum + item.twdAmount, 0);
  const cashSpentTotal = converted.filter((item) => item.method === "cash").reduce((sum, item) => sum + item.twdAmount, 0);

  document.querySelector("#grandTotal").textContent = formatTwd(grandTotal, trip);
  document.querySelector("#fixedTotal").textContent = formatTwd(fixedTotal, trip);
  document.querySelector("#cashReserveTotal").textContent = formatTwd(cashReserve, trip);
  document.querySelector("#entryCount").textContent = String(trip.expenses.length);
  document.querySelector("#summaryTrip").textContent = trip.name || "My Trip";
  document.querySelector("#cardTotal").textContent = formatTwd(cardTotal, trip);
  document.querySelector("#cashSpentTotal").textContent = formatTwd(cashSpentTotal, trip);
}

function renderRegions() {
  const trip = getCurrentTrip();
  const converted = trip.expenses.map((item) => convertExpense(item, trip));
  const hk = converted.filter((item) => item.region === "HK");
  const th = converted.filter((item) => item.region === "TH");
  const general = converted.filter((item) => item.region === "General");

  updateRegion("hk", hk, trip);
  updateRegion("th", th, trip);
  updateRegion("general", general, trip);
}

function updateRegion(prefix, items, trip) {
  const total = items.reduce((sum, item) => sum + item.twdAmount, 0);
  document.querySelector(`#${prefix}Total`).textContent = formatTwd(total, trip);
  document.querySelector(`#${prefix}Count`).textContent = `${items.length} items`;
}

function renderCategories() {
  const trip = getCurrentTrip();
  const grouped = trip.expenses.map((item) => convertExpense(item, trip)).reduce((map, item) => {
    map[item.category] = (map[item.category] || 0) + item.twdAmount;
    return map;
  }, {});

  refs.categoryList.innerHTML = "";
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    refs.categoryList.innerHTML = '<div class="empty-state">加入支出後會出現分類統計。</div>';
    return;
  }

  entries.forEach(([category, total]) => {
    const card = document.createElement("article");
    card.className = "category-item";
    card.innerHTML = `<span>${category}</span><strong>${formatTwd(total, trip)}</strong>`;
    refs.categoryList.appendChild(card);
  });
}

function renderExpenses() {
  const trip = getCurrentTrip();
  const converted = trip.expenses.map((item) => convertExpense(item, trip));

  renderRegionExpenses("HK", refs.hkExpenseList, refs.hkSectionMeta, converted, trip);
  renderRegionExpenses("TH", refs.thExpenseList, refs.thSectionMeta, converted, trip);
  renderRegionExpenses("General", refs.generalExpenseList, refs.generalSectionMeta, converted, trip);
}

function renderRegionExpenses(region, target, metaTarget, items, trip) {
  target.innerHTML = "";
  const filtered = items.filter((item) => item.region === region);
  metaTarget.textContent = `${filtered.length} items`;

  if (!filtered.length) {
    target.innerHTML = '<div class="empty-state">這個分區目前沒有資料。</div>';
    return;
  }

  filtered.forEach((item) => {
    const node = refs.expenseItemTemplate.content.firstElementChild.cloneNode(true);
    const rate = trip.rates[item.currency] || 1;
    node.querySelector(".expense-name").textContent = item.name;
    node.querySelector(".expense-meta").textContent = `${item.category} · ${item.method} · x${rate}`;
    node.querySelector(".expense-original").textContent = `${item.currency} ${Number(item.amount).toLocaleString("zh-TW", { maximumFractionDigits: 2 })}`;
    node.querySelector(".expense-amount").textContent = formatTwd(item.twdAmount, trip);
    node.querySelector(".expense-remove").addEventListener("click", () => {
      trip.expenses = trip.expenses.filter((expense) => expense.id !== item.id);
      saveState();
      render();
    });
    target.appendChild(node);
  });
}

function convertExpense(item, trip) {
  const rate = trip.rates[item.currency] || 1;
  return {
    ...item,
    twdAmount: Math.round(item.amount * rate),
  };
}

function formatTwd(value, trip) {
  return `${trip.displayCurrency || "NT$"}${Number(value).toLocaleString("zh-TW", {
    maximumFractionDigits: 0,
  })}`;
}
