let currentTab = "value-bets";
let chartInstance = null;

async function loadData(file) {
  const res = await fetch(`data/${file}`);
  return res.json();
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getSaved(key) {
  return JSON.parse(localStorage.getItem(key) || "null");
}

function renderTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = `
    <button onclick="switchTab('value-bets')">Value Bets</button>
    <button onclick="switchTab('bet-history')">Bet History</button>
  `;
}

function switchTab(tab) {
  currentTab = tab;
  init();
}

async function init() {
  renderTabs();
  if (currentTab === "value-bets") renderValueBets();
  if (currentTab === "bet-history") renderHistory();
}

async function renderValueBets() {
  const data = await loadData("value-bets.json");
  const table = document.getElementById("tbl");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  thead.innerHTML = `<tr>${data.columns.map(c => `<th>${c}</th>`).join("")}<th>Add</th></tr>`;
  tbody.innerHTML = "";

  data.rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      row.map(c => `<td>${c}</td>`).join("") +
      `<td><button onclick="addToHistory(${index})">Add</button></td>`;
    tbody.appendChild(tr);
  });

  window.valueData = data;
}

function addToHistory(index) {
  const bet = window.valueData.rows[index];
  const history = getSaved("bet-history") || { rows: [] };

  history.rows.push([
    bet[0],
    bet[1],
    bet[2] + " vs " + bet[3],
    bet[4],
    bet[6],
    10,
    "Pending",
    0
  ]);

  saveData("bet-history", history);
  alert("Added to History");
}

async function renderHistory() {
  const base = await loadData("bet-history.json");
  const saved = getSaved("bet-history");
  const data = saved || base;

  const table = document.getElementById("tbl");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  thead.innerHTML = `
    <tr>
      <th>Date</th>
      <th>League</th>
      <th>Fixture</th>
      <th>Market</th>
      <th>Odds</th>
      <th>Stake (£)</th>
      <th>Result</th>
      <th>Profit (£)</th>
    </tr>`;

  tbody.innerHTML = "";

  data.rows.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row[0]}</td>
      <td>${row[1]}</td>
      <td>${row[2]}</td>
      <td>${row[3]}</td>
      <td>${row[4]}</td>
      <td>${row[5]}</td>
      <td>
        <select onchange="updateResult(${i}, this.value)">
          <option ${row[6]==="Pending"?"selected":""}>Pending</option>
          <option ${row[6]==="Win"?"selected":""}>Win</option>
          <option ${row[6]==="Loss"?"selected":""}>Loss</option>
          <option ${row[6]==="Void"?"selected":""}>Void</option>
        </select>
      </td>
      <td>${row[7]}</td>
    `;
    tbody.appendChild(tr);
  });

  renderStats(data);
}

function updateResult(index, result) {
  const data = getSaved("bet-history");
  const row = data.rows[index];

  const stake = parseFloat(row[5]);
  const odds = parseFloat(row[4]);

  let profit = 0;
  if (result === "Win") profit = stake * (odds - 1);
  if (result === "Loss") profit = -stake;
  if (result === "Void") profit = 0;

  row[6] = result;
  row[7] = profit.toFixed(2);

  saveData("bet-history", data);
  renderHistory();
}

function renderStats(data) {
  const container = document.getElementById("historyStats");
  container.classList.remove("hidden");

  const totalsDiv = document.getElementById("statTotals");
  const rows = data.rows;

  const totalProfit = rows.reduce((a,b)=>a+parseFloat(b[7]||0),0);
  const wins = rows.filter(r=>r[6]==="Win").length;
  const losses = rows.filter(r=>r[6]==="Loss").length;
  const settled = wins + losses;
  const winRate = settled ? ((wins/settled)*100).toFixed(1) : 0;
  const avgOdds = rows.length ? (rows.reduce((a,b)=>a+parseFloat(b[4]||0),0)/rows.length).toFixed(2) : 0;

  totalsDiv.innerHTML = `
    <p><strong>Total P/L:</strong> £${totalProfit.toFixed(2)}</p>
    <p><strong>Win Rate:</strong> ${winRate}%</p>
    <p><strong>Average Odds:</strong> ${avgOdds}</p>
  `;

  const ctx = document.getElementById("historyChart").getContext("2d");

  const cumulative = [];
  let running = 0;
  rows.forEach(r=>{
    running += parseFloat(r[7]||0);
    cumulative.push(running);
  });

  if(chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: rows.map((_,i)=>i+1),
      datasets: [{
        label: "Profit (£)",
        data: cumulative
      }]
    }
  });
}

init();
