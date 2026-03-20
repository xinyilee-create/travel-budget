const STORAGE_KEY = "voyage-budget-calculator";

const sampleState = {
  trip: {
    name: "Hong Kong + Thailand",
    currency: "NT$",
    cashBuffer: 6000,
  },
  expenses: [
    { id: crypto.randomUUID(), name: "airport pickup", category: "transport", amount: 1057 },
    { id: crypto.randomUUID(), name: "flight ticket (TP-HK)", category: "transport", amount: 3863 },
    { id: crypto.randomUUID(), name: "flight ticket (HK-Thai)", category: "transport", amount: 7118 },
    { id: crypto.randomUUID(), name: "flight ticket (Thai-TP)", category: "transport", amount: 5275 },
    { id: crypto.randomUUID(), name: "accommodation (HK)", category: "accommodation", amount: 2638 },
    { id: crypto.randomUUID(), name: "accommodation (Thai)", category: "accommodation", amount: 3743 },
    { id: crypto.randomUUID(), name: "art basel ticket", category: "ticket", amount: 1514 },
    { id: crypto.randomUUID(), name: "HK esim", category: "connectivity", amount: 49 },
    { id: crypto.randomUUID(), name: "Thai esim", category: "connectivity", amount: 140 },
    { id: crypto.randomUUID(), name: "power bank", category: "gear", amount: 890 },
  ],
};

const state = loadState();

const refs = {
  tripForm: document.querySelector("#tripForm"),
  expenseForm: document.querySelector("#expenseForm"),
  expenseList: document.querySelector("#expenseList"),
  categoryList: document.querySelector("#categoryList"),
  expenseStatus: document.querySelector("#expenseStatus"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  exportButton: document.querySelector("#exportButton"),
  importInput: document.querySelector("#importInput"),
  expenseItemTemplate: document.querySelector("#expenseItemTemplate"),
};

["tripName", "currency", "cashBuffer"].forEach((id) => {
  document.querySelector(`#${id}`)?.addEventListener("input", handleTripChange);
});

refs.expenseForm?.addEventListener("submit", handleExpenseSubmit);
refs.loadSampleButton?.addEventListener("click", () => {
  replaceState(structuredClone(sampleState));
  refs.expenseStatus.textContent = "已載入旅費範例。";
});
refs.exportButton?.addEventListener("click", exportData);
refs.importInput?.addEventListener("change", importData);

render();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(sampleState);
  } catch (error) {
    return structuredClone(sampleState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function replaceState(nextState) {
  state.trip = nextState.trip;
  state.expenses = nextState.expenses;
  saveState();
  render();
}

function handleTripChange() {
  state.trip = {
    name: document.querySelector("#tripName").value.trim(),
    currency: document.querySelector("#currency").value.trim() || "NT$",
    cashBuffer: Number(document.querySelector("#cashBuffer").value) || 0,
  };
  saveState();
  renderSummary();
  renderAnalytics();
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const name = String(formData.get("expenseName")).trim();
  const category = String(formData.get("expenseCategory"));
  const amount = Number(formData.get("expenseAmount"));

  if (!name || !amount) {
    refs.expenseStatus.textContent = "請先填寫項目名稱和金額。";
    return;
  }

  state.expenses.push({
    id: crypto.randomUUID(),
    name,
    category,
    amount,
  });

  saveState();
  event.currentTarget.reset();
  refs.expenseStatus.textContent = "已加入支出項目。";
  render();
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "voyage-budget-calculator",
    data: state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "voyage-budget-data.json";
  link.click();
  URL.revokeObjectURL(url);
  refs.expenseStatus.textContent = "已匯出資料 JSON。";
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

    if (!nextState.trip || !Array.isArray(nextState.expenses)) {
      throw new Error("Invalid data");
    }

    state.trip = {
      name: nextState.trip.name || "",
      currency: nextState.trip.currency || "NT$",
      cashBuffer: Number(nextState.trip.cashBuffer) || 0,
    };

    state.expenses = nextState.expenses.map((item) => ({
      id: item.id || crypto.randomUUID(),
      name: item.name || "Untitled",
      category: item.category || "misc",
      amount: Number(item.amount) || 0,
    }));

    saveState();
    render();
    refs.expenseStatus.textContent = "已匯入資料。";
  } catch (error) {
    refs.expenseStatus.textContent = "匯入失敗，請確認是正確的 JSON 檔。";
  } finally {
    event.target.value = "";
  }
}

function render() {
  syncForms();
  renderSummary();
  renderExpenses();
  renderAnalytics();
}

function syncForms() {
  document.querySelector("#tripName").value = state.trip.name || "";
  document.querySelector("#currency").value = state.trip.currency || "NT$";
  document.querySelector("#cashBuffer").value = state.trip.cashBuffer || "";
}

function renderSummary() {
  const fixedTotal = sumExpenses();
  const cashBuffer = state.trip.cashBuffer || 0;
  const grand = fixedTotal + cashBuffer;
  const currency = getCurrency();
  const largest = state.expenses.reduce((max, item) => Math.max(max, item.amount), 0);

  document.querySelector("#fixedTotal").textContent = formatMoney(fixedTotal, currency);
  document.querySelector("#cashTotal").textContent = formatMoney(cashBuffer, currency);
  document.querySelector("#grandTotal").textContent = formatMoney(grand, currency);
  document.querySelector("#summaryTitle").textContent = state.trip.name || "My Trip";
  document.querySelector("#summaryCount").textContent = `${state.expenses.length} items`;
  document.querySelector("#summaryLargest").textContent = formatMoney(largest, currency);
  document.querySelector("#summaryBuffer").textContent = formatMoney(cashBuffer, currency);
}

function renderExpenses() {
  refs.expenseList.innerHTML = "";

  if (state.expenses.length === 0) {
    refs.expenseList.innerHTML = '<div class="empty-state">還沒有支出項目，先加入第一筆機票或住宿吧。</div>';
    return;
  }

  const currency = getCurrency();

  state.expenses.forEach((item) => {
    const node = refs.expenseItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".expense-name").textContent = item.name;
    node.querySelector(".expense-category").textContent = item.category;
    node.querySelector(".expense-amount").textContent = formatMoney(item.amount, currency);
    node.querySelector(".expense-remove").addEventListener("click", () => {
      state.expenses = state.expenses.filter((expense) => expense.id !== item.id);
      saveState();
      render();
    });
    refs.expenseList.appendChild(node);
  });
}

function renderAnalytics() {
  const currency = getCurrency();
  const fixedTotal = sumExpenses();
  const cashBuffer = state.trip.cashBuffer || 0;
  const grouped = state.expenses.reduce((map, item) => {
    map[item.category] = (map[item.category] || 0) + item.amount;
    return map;
  }, {});

  refs.categoryList.innerHTML = "";
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    refs.categoryList.innerHTML = '<div class="empty-state">加入支出項目後，這裡會顯示分類統計。</div>';
  } else {
    entries.forEach(([category, total]) => {
      const item = document.createElement("article");
      item.className = "category-item";
      item.innerHTML = `<span>${category}</span><strong>${formatMoney(total, currency)}</strong>`;
      refs.categoryList.appendChild(item);
    });
  }

  document.querySelector("#estimateFixed").textContent = formatMoney(fixedTotal, currency);
  document.querySelector("#estimateBuffer").textContent = formatMoney(cashBuffer, currency);
  document.querySelector("#estimateGrand").textContent = formatMoney(fixedTotal + cashBuffer, currency);
}

function sumExpenses() {
  return state.expenses.reduce((sum, item) => sum + item.amount, 0);
}

function getCurrency() {
  return state.trip.currency || "NT$";
}

function formatMoney(value, currency) {
  return `${currency}${Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 0 })}`;
}
