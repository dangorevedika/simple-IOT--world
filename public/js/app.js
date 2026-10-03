/**
 * Simple IoT World - Frontend Application Logic
 * Built for ESP8266 NodeMCU, DHT11, 16x2 LCD & Actuator Control
 * Department of ETC, SB Jain, Nagpur
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const state = {
    user: null,
    token: null,
    theme: localStorage.getItem('iot_theme') || 'dark',
    activeTab: 1,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1
    },
    device: {
      online: false,
      lastPing: null,
      led: false,
      lcd: {
        line1: 'SMART DISPLAY',
        line2: 'MyData'
      },
      currentReading: {
        temperature: 34.0,
        humidity: 50.0
      }
    },
    minMax: {
      minTemp: 999,
      maxTemp: -999,
      minHum: 999,
      maxHum: -999
    },
    charts: {
      temp: null,
      hum: null
    },
    pollInterval: null
  };

  // ==========================================================
  // DOM ELEMENT REFERENCES
  // ==========================================================
  // Header & Theme
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const userGreetingContainer = document.getElementById('userGreetingContainer');
  const userGreetingText = document.getElementById('userGreetingText');
  const logoutBtn = document.getElementById('logoutBtn');
  const navLoginBtn = document.getElementById('navLoginBtn');
  const deviceStatusContainer = document.getElementById('deviceStatusContainer');
  const deviceStatusPing = document.getElementById('deviceStatusPing');
  const deviceStatusDot = document.getElementById('deviceStatusDot');
  const deviceStatusText = document.getElementById('deviceStatusText');

  // Views
  const authSection = document.getElementById('authSection');
  const dashboardSection = document.getElementById('dashboardSection');

  // Auth Elements
  const tabAuthLogin = document.getElementById('tabAuthLogin');
  const tabAuthRegister = document.getElementById('tabAuthRegister');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const authForm = document.getElementById('authForm');
  const nameFieldGroup = document.getElementById('nameFieldGroup');
  const authName = document.getElementById('authName');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authErrorMessage = document.getElementById('authErrorMessage');
  const quickFillDemoBtn = document.getElementById('quickFillDemoBtn');
  let isRegisterMode = false;

  // Tabs Navigation
  const tabBtn1 = document.getElementById('tabBtn1');
  const tabBtn2 = document.getElementById('tabBtn2');
  const tabBtn3 = document.getElementById('tabBtn3');
  const tabContent1 = document.getElementById('tabContent1');
  const tabContent2 = document.getElementById('tabContent2');
  const tabContent3 = document.getElementById('tabContent3');

  // Dashboard Toolbar
  const simulateReadingBtn = document.getElementById('simulateReadingBtn');
  const refreshDataBtn = document.getElementById('refreshDataBtn');

  // Tab 1: Gauges & Metrics
  const tempGaugeValue = document.getElementById('tempGaugeValue');
  const tempGaugeCircle = document.getElementById('tempGaugeCircle');
  const tempSeekBar = document.getElementById('tempSeekBar');
  const tempPercentageText = document.getElementById('tempPercentageText');
  const tempStatusBadge = document.getElementById('tempStatusBadge');
  const tempMinVal = document.getElementById('tempMinVal');
  const tempMaxVal = document.getElementById('tempMaxVal');

  const humGaugeValue = document.getElementById('humGaugeValue');
  const humGaugeCircle = document.getElementById('humGaugeCircle');
  const humSeekBar = document.getElementById('humSeekBar');
  const humPercentageText = document.getElementById('humPercentageText');
  const humStatusBadge = document.getElementById('humStatusBadge');
  const humMinVal = document.getElementById('humMinVal');
  const humMaxVal = document.getElementById('humMaxVal');

  // Tab 1: Table & Pagination
  const recordsTableBody = document.getElementById('recordsTableBody');
  const recordsPerPage = document.getElementById('recordsPerPage');
  const paginationInfo = document.getElementById('paginationInfo');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const paginationNumbers = document.getElementById('paginationNumbers');

  // Tab 2: LCD
  const lcdForm = document.getElementById('lcdForm');
  const lcdLine1Input = document.getElementById('lcdLine1Input');
  const lcdLine2Input = document.getElementById('lcdLine2Input');
  const charCount1 = document.getElementById('charCount1');
  const charCount2 = document.getElementById('charCount2');
  const lcdPreviewRow1 = document.getElementById('lcdPreviewRow1');
  const lcdPreviewRow2 = document.getElementById('lcdPreviewRow2');
  const saveLcdBtn = document.getElementById('saveLcdBtn');
  const presetButtons = document.querySelectorAll('.preset-btn');

  // Tab 3: LED Actuator
  const neonLedBulb = document.getElementById('neonLedBulb');
  const ledStatusBadge = document.getElementById('ledStatusBadge');
  const ledStatusText = document.getElementById('ledStatusText');
  const ledToggleBtn = document.getElementById('ledToggleBtn');
  const ledBtnText = document.getElementById('ledBtnText');
  const ledBtnIcon = document.getElementById('ledBtnIcon');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  // ==========================================================
  // THEME MANAGEMENT (LIGHT / DARK)
  // ==========================================================
  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('iot_theme', theme);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.className = "bg-gradient-to-br from-slate-900 via-zinc-900 to-emerald-950 text-slate-100 min-h-screen flex flex-col transition-colors duration-300";
      themeIcon.className = 'fa-solid fa-sun text-lg text-amber-400';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className = "bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50 text-slate-800 min-h-screen flex flex-col transition-colors duration-300";
      themeIcon.className = 'fa-solid fa-moon text-lg text-slate-700';
    }

    if (state.charts.temp && state.charts.hum) {
      updateChartTheme();
    }
  }

  themeToggleBtn.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  // ==========================================================
  // TOAST NOTIFICATIONS
  // ==========================================================
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const isDark = state.theme === 'dark';
    
    let bgClasses = 'bg-emerald-600 text-white border-emerald-400';
    let icon = 'fa-solid fa-circle-check';

    if (type === 'error') {
      bgClasses = 'bg-rose-600 text-white border-rose-400';
      icon = 'fa-solid fa-circle-exclamation';
    } else if (type === 'info') {
      bgClasses = 'bg-cyan-600 text-white border-cyan-400';
      icon = 'fa-solid fa-circle-info';
    }

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border ${bgClasses} text-sm font-semibold pointer-events-auto transform transition-all duration-300 translate-y-4 opacity-0`;
    toast.innerHTML = `
      <i class="${icon} text-lg"></i>
      <span class="flex-grow">${message}</span>
      <button class="text-white/80 hover:text-white ml-2 text-xs" onclick="this.parentElement.remove()">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto remove after 3.5s
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ==========================================================
  // AUTHENTICATION LOGIC
  // ==========================================================
  function checkStoredAuth() {
    const storedUser = localStorage.getItem('iot_user');
    const storedToken = localStorage.getItem('iot_token');

    if (storedUser && storedToken) {
      try {
        state.user = JSON.parse(storedUser);
        state.token = storedToken;
        showDashboardView();
        return;
      } catch (e) {
        localStorage.removeItem('iot_user');
        localStorage.removeItem('iot_token');
      }
    }

    // Default: Check if we can auto-login as vedika for a smooth initial experience
    autoLoginDefaultUser();
  }

  function autoLoginDefaultUser() {
    state.user = {
      name: 'vedika',
      email: 'vedika@sbjain.edu'
    };
    state.token = 'jwt_simulated_default';
    localStorage.setItem('iot_user', JSON.stringify(state.user));
    localStorage.setItem('iot_token', state.token);
    showDashboardView();
  }

  function showDashboardView() {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    logoutBtn.classList.add('flex');
    navLoginBtn.classList.add('hidden');
    userGreetingContainer.classList.remove('hidden');
    userGreetingContainer.classList.add('flex');
    userGreetingText.textContent = `Welcome ${state.user ? state.user.name : 'vedika'}`;
  }

  function showAuthView() {
    dashboardSection.classList.add('hidden');
    authSection.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    navLoginBtn.classList.remove('hidden');
    userGreetingContainer.classList.add('hidden');
  }

  tabAuthLogin.addEventListener('click', () => {
    isRegisterMode = false;
    tabAuthLogin.className = "w-1/2 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white shadow-md transition";
    tabAuthRegister.className = "w-1/2 py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-white transition";
    authTitle.textContent = "Welcome Back";
    authSubtitle.textContent = "Sign in to manage Simple IoT World";
    authSubmitBtn.textContent = "Sign In to Dashboard";
    nameFieldGroup.classList.add('hidden');
    authErrorMessage.classList.add('hidden');
  });

  tabAuthRegister.addEventListener('click', () => {
    isRegisterMode = true;
    tabAuthRegister.className = "w-1/2 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white shadow-md transition";
    tabAuthLogin.className = "w-1/2 py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-white transition";
    authTitle.textContent = "Create an Account";
    authSubtitle.textContent = "Register to access your ESP8266 device station";
    authSubmitBtn.textContent = "Create Account & Login";
    nameFieldGroup.classList.remove('hidden');
    authErrorMessage.classList.add('hidden');
  });

  quickFillDemoBtn.addEventListener('click', () => {
    authEmail.value = 'vedika@sbjain.edu';
    authPassword.value = 'password123';
    if (isRegisterMode) {
      authName.value = 'vedika';
    }
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authErrorMessage.classList.add('hidden');

    const email = authEmail.value.trim();
    const password = authPassword.value;
    const name = authName.value.trim();

    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegisterMode ? { name, email, password } : { email, password };

    try {
      authSubmitBtn.disabled = true;
      authSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Authenticating...';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        state.user = data.user;
        state.token = data.token;
        localStorage.setItem('iot_user', JSON.stringify(state.user));
        localStorage.setItem('iot_token', state.token);
        
        showToast(isRegisterMode ? `Account registered! Welcome ${data.user.name}` : `Welcome back, ${data.user.name}!`);
        showDashboardView();
        fetchFullStatus();
        fetchReadings();
      } else {
        authErrorMessage.textContent = data.message || 'Authentication failed. Please check your credentials.';
        authErrorMessage.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      authErrorMessage.textContent = 'Server connection error. Please verify the backend is running.';
      authErrorMessage.classList.remove('hidden');
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = isRegisterMode ? 'Create Account & Login' : 'Sign In to Dashboard';
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('iot_user');
    localStorage.removeItem('iot_token');
    state.user = null;
    state.token = null;
    showToast('Logged out successfully', 'info');
    showAuthView();
  });

  navLoginBtn.addEventListener('click', () => {
    showAuthView();
  });

  // ==========================================================
  // TAB NAVIGATION
  // ==========================================================
  function switchTab(tabNumber) {
    state.activeTab = tabNumber;

    const tabButtons = [tabBtn1, tabBtn2, tabBtn3];
    const tabContents = [tabContent1, tabContent2, tabContent3];

    tabButtons.forEach((btn, idx) => {
      if (idx + 1 === tabNumber) {
        btn.className = "tab-button flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-sm transition bg-emerald-600 text-white shadow-md shadow-emerald-600/30";
      } else {
        btn.className = "tab-button flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-400 hover:text-white hover:bg-slate-700/60 transition";
      }
    });

    tabContents.forEach((content, idx) => {
      if (idx + 1 === tabNumber) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    });

    if (tabNumber === 1 && state.charts.temp && state.charts.hum) {
      state.charts.temp.resize();
      state.charts.hum.resize();
    }
  }

  tabBtn1.addEventListener('click', () => switchTab(1));
  tabBtn2.addEventListener('click', () => switchTab(2));
  tabBtn3.addEventListener('click', () => switchTab(3));

  // ==========================================================
  // GAUGES & METRICS LOGIC
  // ==========================================================
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 50; // ~314.159

  function updateTemperatureGauge(temp) {
    tempGaugeValue.textContent = Number(temp).toFixed(1);

    // Temp range: 0°C to 50°C
    const clampedTemp = Math.min(50, Math.max(0, temp));
    const percentage = Math.round((clampedTemp / 50) * 100);
    const strokeOffset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * percentage / 100);

    tempGaugeCircle.style.strokeDashoffset = strokeOffset;
    tempSeekBar.style.width = `${percentage}%`;
    tempPercentageText.textContent = `${percentage}%`;

    // Dynamic Color and Badge
    if (temp < 20) {
      tempGaugeCircle.setAttribute('stroke', '#06b6d4');
      tempStatusBadge.textContent = 'Cool';
      tempStatusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    } else if (temp <= 30) {
      tempGaugeCircle.setAttribute('stroke', '#10b981');
      tempStatusBadge.textContent = 'Comfortable';
      tempStatusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    } else if (temp <= 38) {
      tempGaugeCircle.setAttribute('stroke', '#f59e0b');
      tempStatusBadge.textContent = 'Warm';
      tempStatusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20';
    } else {
      tempGaugeCircle.setAttribute('stroke', '#ef4444');
      tempStatusBadge.textContent = 'Hot';
      tempStatusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }

    // Min / Max track
    if (temp < state.minMax.minTemp) {
      state.minMax.minTemp = temp;
      tempMinVal.textContent = `${Number(temp).toFixed(1)} °C`;
    }
    if (temp > state.minMax.maxTemp) {
      state.minMax.maxTemp = temp;
      tempMaxVal.textContent = `${Number(temp).toFixed(1)} °C`;
    }
  }

  function updateHumidityGauge(hum) {
    humGaugeValue.textContent = Math.round(hum);

    // Humidity range: 0% to 100%
    const clampedHum = Math.min(100, Math.max(0, hum));
    const strokeOffset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * clampedHum / 100);

    humGaugeCircle.style.strokeDashoffset = strokeOffset;
    humSeekBar.style.width = `${clampedHum}%`;
    humPercentageText.textContent = `${clampedHum}%`;

    // Dynamic Color and Badge
    if (hum < 30) {
      humGaugeCircle.setAttribute('stroke', '#f59e0b');
      humStatusBadge.textContent = 'Dry';
      humStatusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20';
    } else if (hum <= 65) {
      humGaugeCircle.setAttribute('stroke', '#06b6d4');
      humStatusBadge.textContent = 'Comfortable';
      humStatusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    } else {
      humGaugeCircle.setAttribute('stroke', '#3b82f6');
      humStatusBadge.textContent = 'High Humidity';
      humStatusBadge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }

    // Min / Max track
    if (hum < state.minMax.minHum) {
      state.minMax.minHum = hum;
      humMinVal.textContent = `${Math.round(hum)} %`;
    }
    if (hum > state.minMax.maxHum) {
      state.minMax.maxHum = hum;
      humMaxVal.textContent = `${Math.round(hum)} %`;
    }
  }

  // ==========================================================
  // CHART.JS INITIALIZATION & UPDATES
  // ==========================================================
  function initCharts() {
    const isDark = state.theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Temperature Chart
    const ctxTemp = document.getElementById('tempChart').getContext('2d');
    const gradTemp = ctxTemp.createLinearGradient(0, 0, 0, 240);
    gradTemp.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
    gradTemp.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    state.charts.temp = new Chart(ctxTemp, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Temperature (°C)',
          data: [],
          borderColor: '#10b981',
          borderWidth: 2.5,
          backgroundColor: gradTemp,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#34d399',
            borderColor: '#10b981',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => ` Temp: ${context.parsed.y} °C`
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10 } },
            suggestedMin: 20,
            suggestedMax: 45
          }
        }
      }
    });

    // Humidity Chart
    const ctxHum = document.getElementById('humChart').getContext('2d');
    const gradHum = ctxHum.createLinearGradient(0, 0, 0, 240);
    gradHum.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
    gradHum.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    state.charts.hum = new Chart(ctxHum, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Humidity (%)',
          data: [],
          borderColor: '#06b6d4',
          borderWidth: 2.5,
          backgroundColor: gradHum,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#22d3ee',
            borderColor: '#06b6d4',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => ` Humidity: ${context.parsed.y} %`
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10 } },
            suggestedMin: 30,
            suggestedMax: 90
          }
        }
      }
    });
  }

  function updateChartTheme() {
    const isDark = state.theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    [state.charts.temp, state.charts.hum].forEach(chart => {
      if (chart) {
        chart.options.scales.x.grid.color = gridColor;
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.y.grid.color = gridColor;
        chart.options.scales.y.ticks.color = textColor;
        chart.update();
      }
    });
  }

  async function fetchChartHistory() {
    try {
      const res = await fetch('/api/readings/history?count=15');
      const data = await res.json();
      if (data.success && data.history) {
        const labels = data.history.map(item => item.time || '');
        const temps = data.history.map(item => item.temperature);
        const hums = data.history.map(item => item.humidity);

        if (state.charts.temp) {
          state.charts.temp.data.labels = labels;
          state.charts.temp.data.datasets[0].data = temps;
          state.charts.temp.update();
        }

        if (state.charts.hum) {
          state.charts.hum.data.labels = labels;
          state.charts.hum.data.datasets[0].data = hums;
          state.charts.hum.update();
        }
      }
    } catch (err) {
      console.error('Failed to load chart history:', err);
    }
  }

  // ==========================================================
  // SAVED RECORDS TABLE & PAGINATION (TAB 1, SECTION 2)
  // Format required:
  // # | Temeprature | Humidity | Time | Date | Action (Delete)
  // 1 | 34 'C | 50% | HH:MM AM | DD-MM-YYYY | Delete
  // Timezone: Asia/Kolkata +5:30
  // ==========================================================
  async function fetchReadings() {
    try {
      const res = await fetch(`/api/readings?page=${state.pagination.page}&limit=${state.pagination.limit}`);
      const data = await res.json();

      if (data.success) {
        state.pagination.total = data.pagination.total;
        state.pagination.totalPages = data.pagination.totalPages;
        state.pagination.page = data.pagination.page;

        renderRecordsTable(data.readings);
        renderPaginationControls();
      }
    } catch (err) {
      console.error('Error fetching readings:', err);
      recordsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-6 text-center text-rose-400">
            <i class="fa-solid fa-triangle-exclamation mr-2"></i> Error loading sensor records
          </td>
        </tr>
      `;
    }
  }

  function renderRecordsTable(readings) {
    if (!readings || readings.length === 0) {
      recordsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-10 text-center text-slate-400">
            <div class="flex flex-col items-center justify-center gap-2">
              <i class="fa-solid fa-inbox text-3xl text-slate-500"></i>
              <p>No records found in database yet.</p>
              <button class="mt-2 text-xs font-semibold text-emerald-400 hover:underline" onclick="document.getElementById('simulateReadingBtn').click()">
                Click here to simulate a reading
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    recordsTableBody.innerHTML = readings.map((r, index) => {
      return `
        <tr class="hover:bg-slate-700/30 transition group">
          <td class="py-4 px-6 font-mono text-emerald-400 font-bold">${r.id}</td>
          <td class="py-4 px-6">
            <span class="inline-flex items-center gap-1.5 font-bold text-amber-400">
              <i class="fa-solid fa-temperature-half text-xs"></i>
              ${r.temperature} 'C
            </span>
          </td>
          <td class="py-4 px-6">
            <span class="inline-flex items-center gap-1.5 font-bold text-cyan-400">
              <i class="fa-solid fa-droplet text-xs"></i>
              ${r.humidity}%
            </span>
          </td>
          <td class="py-4 px-6 font-mono text-slate-300">
            <span class="inline-flex items-center gap-1">
              <i class="fa-regular fa-clock text-xs text-slate-500"></i>
              ${r.time}
            </span>
          </td>
          <td class="py-4 px-6 font-mono text-slate-300">
            <span class="inline-flex items-center gap-1">
              <i class="fa-regular fa-calendar text-xs text-slate-500"></i>
              ${r.date}
            </span>
          </td>
          <td class="py-4 px-6 text-right">
            <button 
              type="button" 
              class="delete-record-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition" 
              data-id="${r.id}"
              title="Delete record #${r.id}"
            >
              <i class="fa-solid fa-trash-can text-xs"></i>
              <span>Delete</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach delete handlers
    document.querySelectorAll('.delete-record-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        await deleteRecord(id);
      });
    });
  }

  function renderPaginationControls() {
    const { page, totalPages, total, limit } = state.pagination;

    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    paginationInfo.textContent = `Showing records ${start} to ${end} of ${total}`;

    prevPageBtn.disabled = page <= 1;
    nextPageBtn.disabled = page >= totalPages;

    paginationNumbers.innerHTML = '';
    // Show up to 5 page numbers
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let p = startPage; p <= endPage; p++) {
      const pageBtn = document.createElement('button');
      pageBtn.type = 'button';
      pageBtn.textContent = p;
      if (p === page) {
        pageBtn.className = "w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-600/30";
      } else {
        pageBtn.className = "w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition";
      }

      pageBtn.addEventListener('click', () => {
        state.pagination.page = p;
        fetchReadings();
      });
      paginationNumbers.appendChild(pageBtn);
    }
  }

  prevPageBtn.addEventListener('click', () => {
    if (state.pagination.page > 1) {
      state.pagination.page--;
      fetchReadings();
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (state.pagination.page < state.pagination.totalPages) {
      state.pagination.page++;
      fetchReadings();
    }
  });

  recordsPerPage.addEventListener('change', () => {
    state.pagination.limit = parseInt(recordsPerPage.value);
    state.pagination.page = 1;
    fetchReadings();
  });

  async function deleteRecord(id) {
    if (!confirm(`Are you sure you want to delete record #${id}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/readings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`Record #${id} deleted`, 'info');
        fetchReadings();
        fetchChartHistory();
      } else {
        showToast(data.message || 'Failed to delete record', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting record', 'error');
    }
  }

  // ==========================================================
  // TAB 2: SMART LCD 16x2 CONTROLLER
  // ==========================================================
  function updateLcdPreview() {
    let r1 = lcdLine1Input.value || '';
    let r2 = lcdLine2Input.value || '';

    charCount1.textContent = `${r1.length} / 16`;
    charCount2.textContent = `${r2.length} / 16`;

    // Pad to 16 characters for visual LCD grid
    lcdPreviewRow1.textContent = r1.padEnd(16, ' ');
    lcdPreviewRow2.textContent = r2.padEnd(16, ' ');
  }

  lcdLine1Input.addEventListener('input', updateLcdPreview);
  lcdLine2Input.addEventListener('input', updateLcdPreview);

  // LCD Preset buttons
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      lcdLine1Input.value = btn.getAttribute('data-line1') || '';
      lcdLine2Input.value = btn.getAttribute('data-line2') || '';
      updateLcdPreview();
    });
  });

  lcdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const line1 = lcdLine1Input.value.trim().substring(0, 16);
    const line2 = lcdLine2Input.value.trim().substring(0, 16);

    try {
      saveLcdBtn.disabled = true;
      saveLcdBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Transmitting to LCD...';

      const res = await fetch('/api/iot/lcd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line1, line2 })
      });
      const data = await res.json();

      if (data.success) {
        showToast('LCD text transmitted to ESP8266!');
        state.device.lcd.line1 = data.line1;
        state.device.lcd.line2 = data.line2;
      } else {
        showToast('Failed to update LCD', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error updating LCD', 'error');
    } finally {
      saveLcdBtn.disabled = false;
      saveLcdBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Save & Transmit to LCD';
    }
  });

  // ==========================================================
  // TAB 3: INNOVATIVE LED ACTUATOR CONTROLLER
  // ==========================================================
  function updateLedUI(isOn) {
    state.device.led = isOn;

    if (isOn) {
      // Glow neon bulb
      neonLedBulb.classList.add('active');
      
      // Update badge
      ledStatusBadge.className = "inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/20";
      ledStatusText.textContent = "LED IS ON";
      
      // Update tactile button
      ledToggleBtn.className = "tactile-power-btn btn-on";
      ledBtnText.textContent = "TURN LED OFF";
      ledBtnIcon.className = "fa-solid fa-power-off mr-3 text-xl text-white";
    } else {
      // Turn off bulb
      neonLedBulb.classList.remove('active');
      
      // Update badge
      ledStatusBadge.className = "inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm tracking-wider uppercase bg-slate-700/60 text-slate-300 border border-slate-600";
      ledStatusText.textContent = "LED IS OFF";
      
      // Update tactile button
      ledToggleBtn.className = "tactile-power-btn btn-off";
      ledBtnText.textContent = "TURN LED ON";
      ledBtnIcon.className = "fa-solid fa-power-off mr-3 text-xl text-slate-400";
    }
  }

  ledToggleBtn.addEventListener('click', async () => {
    const newState = !state.device.led;
    
    try {
      ledToggleBtn.disabled = true;
      const res = await fetch('/api/iot/led', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ led: newState })
      });
      const data = await res.json();

      if (data.success) {
        updateLedUI(data.led);
        showToast(`Hardware LED turned ${data.led ? 'ON' : 'OFF'}!`);
      } else {
        showToast('Failed to toggle LED state', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error syncing with LED actuator', 'error');
    } finally {
      ledToggleBtn.disabled = false;
    }
  });

  // ==========================================================
  // SIMULATION & MANUAL TEST BUTTON
  // ==========================================================
  simulateReadingBtn.addEventListener('click', async () => {
    try {
      simulateReadingBtn.disabled = true;
      simulateReadingBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Simulating...';

      const res = await fetch('/api/readings/simulate', { method: 'POST' });
      const data = await res.json();

      if (data.success && data.reading) {
        showToast(`Sensor pinged: ${data.reading.temperature} °C, ${data.reading.humidity}%`);
        updateTemperatureGauge(data.reading.temperature);
        updateHumidityGauge(data.reading.humidity);
        fetchReadings();
        fetchChartHistory();
        fetchFullStatus();
      }
    } catch (err) {
      console.error(err);
      showToast('Simulation failed', 'error');
    } finally {
      simulateReadingBtn.disabled = false;
      simulateReadingBtn.innerHTML = '<i class="fa-solid fa-vial mr-1"></i> Simulate Sensor';
    }
  });

  refreshDataBtn.addEventListener('click', () => {
    fetchFullStatus();
    fetchReadings();
    fetchChartHistory();
    showToast('Dashboard data refreshed', 'info');
  });

  // ==========================================================
  // FULL DEVICE STATUS & ONLINE/OFFLINE POLLING
  // ==========================================================
  async function fetchFullStatus() {
    try {
      const res = await fetch('/api/iot/status');
      const data = await res.json();

      if (data.success) {
        state.device.online = data.online;
        state.device.lastPing = data.lastPing;
        state.device.led = data.led;

        // Update Online / Offline status badge
        if (data.online) {
          deviceStatusPing.classList.remove('hidden');
          deviceStatusDot.className = "relative inline-flex rounded-full h-3 w-3 bg-emerald-500";
          deviceStatusText.className = "text-xs font-bold tracking-wider text-emerald-400 uppercase";
          deviceStatusText.textContent = "ONLINE";
          deviceStatusContainer.setAttribute('title', `ESP8266 is active. Last ping: ${new Date(data.lastPing).toLocaleTimeString()}`);
        } else {
          deviceStatusPing.classList.add('hidden');
          deviceStatusDot.className = "relative inline-flex rounded-full h-3 w-3 bg-rose-500";
          deviceStatusText.className = "text-xs font-bold tracking-wider text-rose-400 uppercase";
          deviceStatusText.textContent = "OFFLINE";
          deviceStatusContainer.setAttribute('title', data.lastPing ? `ESP8266 last seen: ${new Date(data.lastPing).toLocaleTimeString()}` : 'No ping received from ESP8266 yet');
        }

        // Update Gauges from currentReading
        if (data.currentReading) {
          if (data.currentReading.temperature !== undefined) {
            updateTemperatureGauge(data.currentReading.temperature);
          }
          if (data.currentReading.humidity !== undefined) {
            updateHumidityGauge(data.currentReading.humidity);
          }
        }

        // Update LED Actuator button state
        updateLedUI(Boolean(data.led));

        // Update LCD fields if not currently focused by user
        if (data.lcd && document.activeElement !== lcdLine1Input && document.activeElement !== lcdLine2Input) {
          if (lcdLine1Input.value === '' && data.lcd.line1) {
            lcdLine1Input.value = data.lcd.line1;
          }
          if (lcdLine2Input.value === '' && data.lcd.line2) {
            lcdLine2Input.value = data.lcd.line2;
          }
          updateLcdPreview();
        }
      }
    } catch (err) {
      console.warn('Status poll warning:', err);
    }
  }

  // ==========================================================
  // INITIALIZATION RUNNER
  // ==========================================================
  applyTheme(state.theme);
  initCharts();
  checkStoredAuth();
  updateLcdPreview();

  // Initial fetches
  fetchFullStatus();
  fetchReadings();
  fetchChartHistory();

  // Periodic polling every 5 seconds for live sync
  state.pollInterval = setInterval(() => {
    fetchFullStatus();
    // Refresh table and charts periodically if on Tab 1
    if (state.activeTab === 1) {
      fetchReadings();
      fetchChartHistory();
    }
  }, 5000);

});
