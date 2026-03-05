// Game State Constants
const STARTING_BALANCE = 10000;

let gameState = {
    day: 1,
    balance: STARTING_BALANCE,
    cash: STARTING_BALANCE,
    inventory: {}, // assetId -> {qty, avgPrice}
    borrowed: 0,
    daysWithoutTrades: 0,
    hasUsedLeverage: false,
    gameOver: false
};

// Market Assets
const assets = {
    'gazmyas': { id: 'gazmyas', name: 'ОАО Газмяс', icon: '🛢', price: 1500, volatility: 0.1, trend: 0 },
    'sbercoin': { id: 'sbercoin', name: 'СберКоин', icon: '🏦', price: 3000, volatility: 0.05, trend: 0 },
    'shaverma': { id: 'shaverma', name: 'Шаурма-Инвест', icon: '🌯', price: 500, volatility: 0.2, trend: 0 },
    'yablofon': { id: 'yablofon', name: 'ТехноГруша', icon: '🍎', price: 8000, volatility: 0.08, trend: 0 },
    'tesla': { id: 'tesla', name: 'ИлонМоторс', icon: '🚗', price: 12000, volatility: 0.15, trend: 0 }
};

// Characters
const characters = {
    'prototype': { name: 'Прототип', avatar: '🧛‍♂️', role: 'Коллекционер лосей' },
    'futbolist': { name: 'Футболист', avatar: '⚽️', role: 'Лудоман' },
    'guru': { name: 'Гуру_Инвестор', avatar: '🧳', role: 'Вип-сигналы' },
    'homyak': { name: 'Хомяк-Обыкновенный', avatar: '🐹', role: 'Индикатор рынка' },
    'nastya': { name: 'Nastya_Buh', avatar: '👩‍💼', role: 'Игрок' }
};

// Pulse Posts Generators (Expanded 15+ quotes)
const pulseData = [
    // Futbolist (High Risk, 50-50 logic)
    { char: 'futbolist', text: 'Закинул последнюю зп жены в [ASSET] на 100-е плечо! Ракета неизбежна 🚀🚀🚀', impact: { asset: 'random', dir: '50-50' } },
    { char: 'futbolist', text: 'БЕРУ ДОНЕПРИЯТИЯ [ASSET] 🤑 Кто не рискует, тот не ест доширак.', impact: { asset: 'random', dir: '50-50' } },
    { char: 'futbolist', text: 'Отыгрался на ставках, теперь лонгую [ASSET]. Верняк 1000%!', impact: { asset: 'random', dir: '50-50' } },
    { char: 'futbolist', text: 'Продал почку, купил [ASSET]. Ждем х10.', impact: { asset: 'random', dir: '50-50' } },

    // Homyak (Contrarian / Panic)
    { char: 'homyak', text: 'Все покупают [ASSET], значит и мне надо. На хаях прокатимся!', impact: { asset: 'random', dir: -1 } }, // contrarian signal
    { char: 'homyak', text: 'ПАМАГИТИ! [ASSET] падает, фиксирую убытки -80%! 😭😭😭', impact: { asset: 'random', dir: 1 } }, // bottom signal
    { char: 'homyak', text: 'Усредняю [ASSET]. Двойное дно в подарок...', impact: { asset: 'random', dir: -1 } },
    { char: 'homyak', text: 'Где кнопка "Отмена сделки"? Я случайно купил [ASSET]...', impact: { asset: 'random', dir: 0 } },
    { char: 'homyak', text: 'Мам, я инвестор. Купил [ASSET] на сдачу с пирожков.', impact: { asset: 'random', dir: 0 } },

    // Guru (Pumper / Scammer)
    { char: 'guru', text: 'График [ASSET] пробил фигуру "Чашка с дошираком" на лонгах. Покупайте мой курс, чтобы не слить депозит.', impact: { asset: 'random', dir: 1 } },
    { char: 'guru', text: 'Инсайд из вип-канала: [ASSET] завтра взлетит. Подписка всего 5000р в месяц.', impact: { asset: 'random', dir: 1 } },
    { char: 'guru', text: 'Закрыл шорт по [ASSET] с +300%. Кто не успел - тот опоздал. Учим матчасть.', impact: { asset: 'random', dir: -1 } },
    { char: 'guru', text: 'Фундаментально [ASSET] переоценен. Справедливая цена - 0.', impact: { asset: 'random', dir: -2 } },

    // Prototype (Margin Call Collector)
    { char: 'prototype', text: 'Ох, как же я люблю запах свежих маржин-коллов по утрам! Особенно по бумаге [ASSET] 😈', impact: { asset: 'random', dir: -1 } },
    { char: 'prototype', text: 'Кто тут в шортах сидит по [ASSET]? Готовьте денежки на ликвидацию.', impact: { asset: 'random', dir: 1 } },
    { char: 'prototype', text: 'Вижу ваши плечи... Я уже иду за вами.', impact: { asset: 'none', dir: 0 } }
];

let marketEffects = {}; // For next day impacts
let selectedTradeAsset = null;

// Endings Data
const ENDINGS = {
    DOSHIRAK: {
        title: "ЭЛИТНЫЙ ДОШИРАК",
        author: "Настя-бухгалтер",
        message: "Ты заработала 50,000 ₽! Элитный доширак со вкусом камчатского краба твой. Завтра подаем заявление на увольнение!",
        avatar: "🍜",
        theme: "success"
    },
    LAMBO: {
        title: "УОЛЛ-СТРИТ ВОЛК",
        author: "Настя-бухгалтер",
        message: "1 000 000 ₽! Какой доширак? Мы берем Ламбу! Настя стала легендой Пульса и теперь сама продает курсы.",
        avatar: "🏎",
        theme: "success"
    },
    MARGIN_CALL: {
        title: "МАРЖИН-КОЛЛ",
        author: "Прототип",
        message: "Ага! Попалась на плечах! Твоих средств недостаточно. Я забираю все твои активы. Ты стала моим рабом.",
        avatar: "🧛‍♂️",
        theme: "danger"
    },
    HAMSTER: {
        title: "ХОМЯК-ЛЕГЕНДА",
        author: "Хомяк-Обыкновенный",
        message: "Слить баланс с 10к до 1к покупая на хаях и продавая на дне, да еще и на свои деньги? Ты превзошла даже меня! Уважение.",
        avatar: "🐹",
        theme: "danger"
    },
    INFLATION: {
        title: "ЖЕРТВА ИНФЛЯЦИИ",
        author: "Настя-бухгалтер",
        message: "30 дней без сделок. Кэш обесценился из-за реальной инфляции 0.5% в день. Инвестиции – это не твое. Возвращаемся на вклад в Сбер под 4%.",
        avatar: "📉",
        theme: "warning" /* we'll just use panel styles */
    }
};

// DOM Elements mapped later
const DOM = {};

function mapDOM() {
    DOM.screens = {
        start: document.getElementById('start-screen'),
        app: document.getElementById('main-app')
    };
    DOM.tabs = {
        portfolio: document.getElementById('tab-portfolio'),
        exchange: document.getElementById('tab-exchange'),
        pulse: document.getElementById('tab-pulse')
    };
    DOM.navItems = document.querySelectorAll('.nav-item');
    DOM.navBar = document.getElementById('bottom-navigation');

    DOM.modals = {
        tradeSheet: document.getElementById('trade-sheet'),
        tradeOverlay: document.getElementById('close-trade-overlay'),
        ending: document.getElementById('ending-modal')
    };

    DOM.buttons = {
        start: document.getElementById('start-btn'),
        nextDay: document.getElementById('next-day-btn'),
        closeTrade: document.getElementById('close-trade'),
        buy: document.getElementById('buy-btn'),
        sell: document.getElementById('sell-btn'),
        restart: document.getElementById('restart-btn'),
        qtyPlus: document.getElementById('qty-plus'),
        qtyMinus: document.getElementById('qty-minus'),
        qtyMax: document.getElementById('qty-max')
    };

    DOM.text = {
        day: document.getElementById('current-day'),
        hdrEq: document.getElementById('header-equity'),
        totBal: document.getElementById('total-balance'),
        cash: document.getElementById('cash-balance'),
        assets: document.getElementById('assets-value'),
        profit: document.getElementById('daily-profit'),
        mStatus: document.getElementById('margin-status'),
        mBar: document.getElementById('margin-bar')
    };

    DOM.lists = {
        myAssets: document.getElementById('my-assets-list'),
        exchange: document.getElementById('exchange-assets-list'),
        pulse: document.getElementById('pulse-feed-container')
    };

    DOM.trade = {
        name: document.getElementById('trade-asset-name'),
        price: document.getElementById('trade-asset-price'),
        qty: document.getElementById('trade-quantity'),
        slider: document.getElementById('leverage-slider'),
        sliderVal: document.getElementById('leverage-value'),
        warning: document.getElementById('leverage-warning'),
        own: document.getElementById('trade-own-funds'),
        borrow: document.getElementById('trade-borrowed-funds'),
        tot: document.getElementById('trade-total-position'),
        ownedQty: document.getElementById('owned-quantity'),
        ownedVal: document.getElementById('owned-value')
    };

    DOM.ending = {
        box: document.getElementById('ending-content-box'),
        avatarBox: document.getElementById('ending-avatar-box'),
        avatar: document.getElementById('ending-avatar'),
        title: document.getElementById('ending-title'),
        author: document.getElementById('ending-author'),
        msg: document.getElementById('ending-message'),
        days: document.getElementById('ending-days'),
        bal: document.getElementById('ending-balance')
    };
}

// Utils
function formatMoney(amount) {
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}
function getRandomAsset() {
    const keys = Object.keys(assets);
    return keys[Math.floor(Math.random() * keys.length)];
}

// Navigation Logic
function switchTab(tabId) {
    // Hide all tabs
    Object.values(DOM.tabs).forEach(el => el.style.display = 'none');
    // Remove active from nav items
    DOM.navItems.forEach(el => el.classList.remove('active'));

    // Show selected
    if (DOM.tabs[tabId]) DOM.tabs[tabId].style.display = 'block';
    const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (activeNav) activeNav.classList.add('active');
}

// Initialization
function initGame() {
    DOM.screens.start.classList.remove('active');
    setTimeout(() => {
        DOM.screens.start.style.display = 'none';
        DOM.screens.app.classList.add('active');
        DOM.navBar.style.display = 'flex';
        DOM.buttons.nextDay.style.display = 'flex';
    }, 300);

    // Reset state
    gameState = {
        day: 1, balance: STARTING_BALANCE, cash: STARTING_BALANCE,
        inventory: {}, borrowed: 0, daysWithoutTrades: 0,
        hasUsedLeverage: false, gameOver: false
    };

    // Reset Prices
    assets['gazmyas'].price = 1500;
    assets['sbercoin'].price = 3000;
    assets['shaverma'].price = 500;
    assets['yablofon'].price = 8000;
    assets['tesla'].price = 12000;

    Object.keys(assets).forEach(key => gameState.inventory[key] = { qty: 0, avgPrice: 0 });

    DOM.modals.tradeSheet.classList.remove('active');
    DOM.modals.ending.classList.remove('active');
    DOM.modals.ending.style.display = 'none';

    switchTab('portfolio');
    updateUI();
    generatePulse();
}

// Core Value Checks
function calculateAssetsValue() {
    let val = 0;
    Object.keys(gameState.inventory).forEach(key => {
        val += gameState.inventory[key].qty * assets[key].price;
    });
    return val;
}

function calculatePortfolioValue() {
    return gameState.cash + calculateAssetsValue();
}

// Day Simulation & Mechanics
function nextDay() {
    if (gameState.gameOver) return;

    gameState.day++;
    gameState.daysWithoutTrades++;

    // 1. apply inflation (0.5% per day if mostly cash to penalize sitting)
    if (gameState.daysWithoutTrades > 0) {
        gameState.cash = gameState.cash * 0.995;
    }

    let oldTotalValue = calculatePortfolioValue();

    // 2. Process market prices
    Object.keys(assets).forEach(key => {
        let a = assets[key];
        let move = (Math.random() - 0.5) * 2 * a.volatility;

        if (marketEffects[key]) {
            let effect = marketEffects[key];
            if (effect === '50-50') {
                move += (Math.random() > 0.5 ? 0.35 : -0.35);
            } else {
                move += effect * 0.15;
            }
            delete marketEffects[key];
        }

        a.price = Math.max(10, a.price * (1 + move));
    });

    // 3. Re-calculate state
    let newAssetsValue = calculateAssetsValue();
    gameState.balance = gameState.cash + newAssetsValue;

    // Daily Profit % on total balance
    let profitPercent = ((gameState.balance - oldTotalValue) / oldTotalValue) * 100;
    DOM.text.profit.textContent = (profitPercent >= 0 ? '+' : '') + profitPercent.toFixed(2) + '%';
    DOM.text.profit.className = 'profit-badge ' + (profitPercent >= 0 ? 'positive' : 'negative');

    updateUI();

    // 4. Check Endings
    if (!checkEndings()) {
        generatePulse();
    }
}

// Endings Logic
function showEnding(endingKey) {
    gameState.gameOver = true;
    const end = ENDINGS[endingKey];

    DOM.ending.title.textContent = end.title;
    DOM.ending.author.textContent = end.author;
    DOM.ending.msg.textContent = end.message;
    DOM.ending.avatar.textContent = end.avatar;

    DOM.ending.days.textContent = gameState.day;
    DOM.ending.bal.textContent = formatMoney(gameState.balance) + ' ₽';

    // Styling
    DOM.ending.box.className = 'modal-content glass-panel'; // reset
    DOM.ending.avatarBox.className = 'avatar-container'; // reset
    if (end.theme === 'danger') {
        DOM.ending.box.classList.add('border-red');
        DOM.ending.avatarBox.classList.add('border-red');
        DOM.ending.title.className = "glow danger-text text-center";
    } else if (end.theme === 'success') {
        DOM.ending.box.classList.add('border-green');
        DOM.ending.avatarBox.classList.add('border-green');
        DOM.ending.title.className = "glow success-text text-center";
    } else {
        DOM.ending.title.className = "glow text-center";
    }

    DOM.modals.ending.style.display = 'flex';
    setTimeout(() => DOM.modals.ending.classList.add('active'), 10);
}

function checkEndings() {
    let eq = calculatePortfolioValue();
    let position = calculateAssetsValue();

    // 1. Lambo (1M)
    if (eq >= 1000000) { showEnding('LAMBO'); return true; }

    // 2. Doshirak (50k)
    if (eq >= 50000) { showEnding('DOSHIRAK'); return true; }

    // 3. Margin Call (Equity < 10% of Position, and using borrowed cash)
    if (gameState.cash < 0) {
        let marginLevel = eq / position;
        if (eq <= 100 || marginLevel < 0.1) {
            showEnding('MARGIN_CALL'); return true;
        }
    }

    // 4. Hamster Legend (Balance < 1k, NO leverage used ever)
    if (eq <= 1000 && !gameState.hasUsedLeverage) {
        showEnding('HAMSTER'); return true;
    }

    // 5. Inflation Victim (30 days without trading, just holding cash)
    if (gameState.daysWithoutTrades >= 30 && eq < STARTING_BALANCE) {
        showEnding('INFLATION'); return true;
    }

    return false;
}

// UI Updates
function updateUI() {
    DOM.text.day.textContent = gameState.day;

    let assetsValue = calculateAssetsValue();
    gameState.balance = gameState.cash + assetsValue;

    DOM.text.hdrEq.textContent = formatMoney(gameState.balance);
    DOM.text.totBal.textContent = formatMoney(gameState.balance);
    DOM.text.cash.textContent = formatMoney(gameState.cash);
    DOM.text.assets.textContent = formatMoney(assetsValue);

    // Margin Indicator
    let marginStatus = 'Безопасный';
    let marginClass = 'safe';
    let marginWidth = 100;

    if (gameState.cash < 0) {
        let marginLevel = gameState.balance / assetsValue;
        if (marginLevel > 0.4) {
            marginStatus = 'В норме';
            marginWidth = marginLevel * 100;
        } else if (marginLevel > 0.15) {
            marginStatus = 'Риск';
            marginClass = 'warning';
            marginWidth = marginLevel * 100;
        } else {
            marginStatus = 'КРИТИЧЕСКИЙ';
            marginClass = 'danger';
            marginWidth = marginLevel * 100;
        }
    }

    DOM.text.mStatus.textContent = marginStatus;
    DOM.text.mStatus.className = marginClass;
    DOM.text.mBar.className = 'progress-bar ' + marginClass;
    DOM.text.mBar.style.width = Math.max(5, marginWidth) + '%';

    renderExchange();
    renderMyAssets();
}

function renderExchange() {
    DOM.lists.exchange.innerHTML = '';
    Object.keys(assets).forEach(key => {
        let a = assets[key];
        let card = document.createElement('div');
        card.className = 'asset-card';
        card.onclick = () => openTradeModal(key);

        card.innerHTML = `
            <div class="asset-info">
                <div class="asset-icon">${a.icon}</div>
                <div class="asset-details">
                    <h4>${a.name}</h4>
                    <p>${key.toUpperCase()}</p>
                </div>
            </div>
            <div class="asset-price-box">
                <div class="asset-price">${formatMoney(a.price)} ₽</div>
                <div class="asset-change positive">Купить</div>
            </div>
        `;
        DOM.lists.exchange.appendChild(card);
    });
}

function renderMyAssets() {
    DOM.lists.myAssets.innerHTML = '';
    let hasOwned = false;

    Object.keys(gameState.inventory).forEach(key => {
        let inv = gameState.inventory[key];
        if (inv.qty > 0) {
            hasOwned = true;
            let a = assets[key];
            let profit = (a.price - inv.avgPrice) * inv.qty;
            let pStr = profit >= 0 ? '+' + formatMoney(profit) : formatMoney(profit);
            let pClass = profit >= 0 ? 'positive' : 'negative';

            let card = document.createElement('div');
            card.className = 'asset-card';
            card.onclick = () => openTradeModal(key);

            card.innerHTML = `
                <div class="asset-info">
                    <div class="asset-icon">${a.icon}</div>
                    <div class="asset-details">
                        <h4>${a.name}</h4>
                        <p>${inv.qty} шт. по ${formatMoney(inv.avgPrice)} ₽</p>
                    </div>
                </div>
                <div class="asset-price-box">
                    <div class="asset-price">${formatMoney(inv.qty * a.price)} ₽</div>
                    <div class="asset-change ${pClass}">${pStr} ₽</div>
                </div>
            `;
            DOM.lists.myAssets.appendChild(card);
        }
    });

    if (!hasOwned) {
        DOM.lists.myAssets.innerHTML = '<div class="empty-state">Нет открытых позиций! Перейдите на Биржу.</div>';
    }
}

function generatePulse() {
    marketEffects = {};
    let numPosts = Math.floor(Math.random() * 2) + 2;
    let shuffledPosts = pulseData.sort(() => 0.5 - Math.random());

    for (let i = 0; i < numPosts; i++) {
        let postData = shuffledPosts[i];
        let char = characters[postData.char];

        let targetAssetKey = postData.impact.asset === 'random' ? getRandomAsset() : postData.impact.asset;
        let targetAsset = assets[targetAssetKey];

        if (postData.impact.dir !== 0) {
            marketEffects[targetAssetKey] = postData.impact.dir;
        }

        let text = postData.text.replace('[ASSET]', `<span class="post-asset-tag">${targetAsset.name}</span>`);

        // Time randomizer
        let hr = Math.floor(Math.random() * 8) + 9;
        let min = Math.floor(Math.random() * 60).toString().padStart(2, '0');

        let el = document.createElement('div');
        el.className = 'post-card mb-1';
        el.innerHTML = `
            <div class="post-header">
                <div class="post-avatar">${char.avatar}</div>
                <div class="post-meta">
                    <span class="post-author">${char.name}</span>
                    <span class="post-time">Сегодня, ${hr}:${min}</span>
                </div>
            </div>
            <p class="post-content">${text}</p>
        `;
        DOM.lists.pulse.prepend(el); // Prepend to show newest at top
    }
}

// Trade Modal 
function openTradeModal(assetId) {
    if (gameState.gameOver) return;

    selectedTradeAsset = assetId;
    let asset = assets[assetId];
    let inv = gameState.inventory[assetId];

    DOM.trade.name.textContent = asset.name;
    DOM.trade.price.textContent = formatMoney(asset.price);

    DOM.trade.ownedQty.textContent = inv.qty;
    DOM.trade.ownedVal.textContent = formatMoney(inv.qty * asset.price);

    DOM.trade.slider.value = 1;
    DOM.trade.sliderVal.textContent = '1';
    DOM.trade.qty.value = 1;

    DOM.buttons.sell.disabled = inv.qty <= 0;
    DOM.modals.tradeSheet.classList.add('active');

    calculateTrade();
}

function calculateTrade() {
    if (!selectedTradeAsset) return;
    let asset = assets[selectedTradeAsset];

    let qty = parseInt(DOM.trade.qty.value) || 1;
    let leverage = parseInt(DOM.trade.slider.value) || 1;

    let totalValue = qty * asset.price;
    DOM.trade.tot.textContent = formatMoney(totalValue) + ' ₽';
    DOM.trade.sliderVal.textContent = leverage;

    if (leverage === 1) {
        DOM.trade.warning.textContent = "Только свои (скучно).";
        DOM.trade.warning.className = "leverage-warning text-center";
    } else if (leverage <= 10) {
        DOM.trade.warning.textContent = "Среднее плечо.";
        DOM.trade.warning.className = "leverage-warning text-center warning";
    } else {
        DOM.trade.warning.textContent = "ЭКСТРИМ. Прототип близко.";
        DOM.trade.warning.className = "leverage-warning text-center danger-text font-bold";
    }

    let ownFundsRequired = totalValue / leverage;
    let borrowedFunds = totalValue - ownFundsRequired;

    DOM.trade.own.textContent = formatMoney(ownFundsRequired) + ' ₽';
    DOM.trade.borrow.textContent = borrowedFunds > 0 ? formatMoney(borrowedFunds) + ' ₽' : '0 ₽';
}

function executeBuy() {
    if (!selectedTradeAsset) return;
    let asset = assets[selectedTradeAsset];
    let qty = parseInt(DOM.trade.qty.value) || 1;
    let leverage = parseInt(DOM.trade.slider.value) || 1;

    let totalValue = qty * asset.price;
    let ownFundsRequired = totalValue / leverage;
    let equity = calculatePortfolioValue();

    if (ownFundsRequired > equity && equity > 0) {
        alert("Недостаточно эквити для обеспечения сделки с плечом.");
        return;
    }
    if (equity <= 0 && ownFundsRequired > 0) {
        alert("Недостаточно средств."); return;
    }

    if (leverage > 1) gameState.hasUsedLeverage = true;
    gameState.daysWithoutTrades = 0; // reset inactivity

    let inv = gameState.inventory[selectedTradeAsset];
    let holdValOld = inv.qty * inv.avgPrice;

    inv.qty += qty;
    inv.avgPrice = (holdValOld + totalValue) / inv.qty;
    gameState.cash -= totalValue;

    closeTradeModal();
    updateUI();
    checkEndings(); // Might trigger margin call immediately on bad buy
}

function executeSell() {
    if (!selectedTradeAsset) return;
    let asset = assets[selectedTradeAsset];
    let inv = gameState.inventory[selectedTradeAsset];

    if (inv.qty <= 0) return;

    let totalValue = inv.qty * asset.price;
    gameState.cash += totalValue;
    inv.qty = 0;
    inv.avgPrice = 0;

    gameState.daysWithoutTrades = 0; // reset inactivity

    closeTradeModal();
    updateUI();
    checkEndings();
}

function closeTradeModal() {
    DOM.modals.tradeSheet.classList.remove('active');
    selectedTradeAsset = null;
}

// Binders
document.addEventListener('DOMContentLoaded', () => {
    mapDOM();

    // Core Buttons
    DOM.buttons.start.addEventListener('click', initGame);
    DOM.buttons.nextDay.addEventListener('click', nextDay);
    DOM.buttons.closeTrade.addEventListener('click', closeTradeModal);
    DOM.modals.tradeOverlay.addEventListener('click', closeTradeModal);

    // Trade Form
    DOM.trade.qty.addEventListener('input', calculateTrade);
    DOM.trade.slider.addEventListener('input', calculateTrade);
    DOM.buttons.qtyPlus.addEventListener('click', () => {
        DOM.trade.qty.value = parseInt(DOM.trade.qty.value) + 1; calculateTrade();
    });
    DOM.buttons.qtyMinus.addEventListener('click', () => {
        if (DOM.trade.qty.value > 1) { DOM.trade.qty.value = parseInt(DOM.trade.qty.value) - 1; calculateTrade(); }
    });
    DOM.buttons.qtyMax.addEventListener('click', () => {
        let eq = calculatePortfolioValue();
        if (eq <= 0) return;
        let leverage = parseInt(DOM.trade.slider.value) || 1;
        let maxBuyVal = eq * leverage;
        let asset = assets[selectedTradeAsset];
        DOM.trade.qty.value = Math.floor(maxBuyVal / asset.price) || 1;
        calculateTrade();
    });

    DOM.buttons.buy.addEventListener('click', executeBuy);
    DOM.buttons.sell.addEventListener('click', executeSell);
    DOM.buttons.restart.addEventListener('click', initGame);

    // Tabs Navigation
    DOM.navItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
    });
});
