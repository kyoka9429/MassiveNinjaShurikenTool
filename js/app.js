import { state, addBey, updateBey, deleteBey, upsertBeyByName } from './store.js';
import { BluetoothController } from './bluetooth.js';
import { renderBeyList, updateRanking, updateModelInfo } from './renderer.js';

// ---- タイマー ----

const timer = {
    _interval: null,
    _startTime: 0,
    _elapsed: 0,

    start() {
        this._startTime = Date.now();
        this._interval = setInterval(() => this._display(), 10);
    },

    stop() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        this._elapsed = Date.now() - this._startTime;
    },

    reset() {
        document.getElementById('timer').textContent = '00:00.000';
        this._elapsed = 0;
    },

    _display() {
        const ms = Date.now() - this._startTime;
        const m   = String(Math.floor(ms / 60000)).padStart(2, '0');
        const s   = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
        const mil = String(ms % 1000).padStart(3, '0');
        document.getElementById('timer').textContent = `${m}:${s}.${mil}`;
    },

    /** 停止時の経過時間を { minutes, seconds } で返す */
    getElapsed() {
        const ms = this._elapsed;
        return {
            minutes: Math.floor(ms / 60000),
            seconds: parseFloat(((ms % 60000) / 1000).toFixed(3)),
        };
    },
};

// ---- デバッグログ ----

const debugLogs = [];

function addDebugLog(message) {
    const ts = new Date().toLocaleTimeString();
    debugLogs.push(`[${ts}] ${message}`);
    console.log('[DEBUG]', message);

    const html = debugLogs.map(l => `<div>${l}</div>`).join('');
    const el1 = document.getElementById('debug-log');
    const el2 = document.getElementById('debug-log-connected');

    if (el1) {
        el1.innerHTML = html;
        el1.scrollTop = el1.scrollHeight;
        document.getElementById('debug-log-section').classList.remove('hidden');
    }
    if (el2) {
        el2.innerHTML = html;
        el2.scrollTop = el2.scrollHeight;
    }
}

// ---- Bluetooth ----

let isRecording = false;

const bt = new BluetoothController({
    onLog: addDebugLog,

    onBeySet() {
        document.getElementById('shoot-state').textContent = 'セット完了 - シュート待機中';
        document.getElementById('connection-status').textContent = 'セット検知 - シュートしてください';
    },

    onShootStart() {
        if (isRecording) return;
        isRecording = true;
        document.getElementById('shoot-state').textContent = 'シュート中...';
        setStopButtonActive(true);
        timer.reset();
        timer.start();
        addDebugLog('シュート開始 - タイマースタート');
    },

    onPowerUpdate(power) {
        document.getElementById('current-power').textContent = power;
    },

    onShootDataComplete(maxPower) {
        document.getElementById('shoot-state').textContent = 'ベイ回転中 - 停止したら停止ボタンを押してください';
        document.getElementById('connection-status').textContent = `計測中... 最大SP: ${maxPower}`;
        addDebugLog(`データ送信完了 - 最大SP: ${maxPower} - タイマーは継続中`);
    },
});

function setStopButtonActive(active) {
    const btn = document.getElementById('stop-btn');
    if (active) {
        btn.disabled = false;
        btn.classList.remove('bg-gray-700', 'text-gray-500', 'cursor-not-allowed');
        btn.classList.add(
            'bg-gradient-to-r', 'from-orange-600', 'to-red-600',
            'hover:from-orange-700', 'hover:to-red-700',
            'text-white', 'shadow-lg', 'shadow-orange-500/50'
        );
    } else {
        btn.disabled = true;
        btn.classList.add('bg-gray-700', 'text-gray-500', 'cursor-not-allowed');
        btn.classList.remove(
            'bg-gradient-to-r', 'from-orange-600', 'to-red-600',
            'hover:from-orange-700', 'hover:to-red-700',
            'text-white', 'shadow-lg', 'shadow-orange-500/50'
        );
    }
}

// ---- イベントハンドラ ----

async function handleConnect() {
    addDebugLog('ボタンがクリックされました');
    try {
        document.getElementById('connection-status').textContent = '接続中...';
        await bt.connect();
        document.getElementById('not-connected-section').classList.add('hidden');
        document.getElementById('connected-section').classList.remove('hidden');
        document.getElementById('connection-status').textContent = '接続済み - ベイをセットしてください';
        document.getElementById('shoot-state').textContent = 'セット待機中';
        addDebugLog('接続完了！');
    } catch (error) {
        addDebugLog(`エラー: ${error.name} - ${error.message}`);
        document.getElementById('connection-status').textContent = '接続失敗: ' + error.message;
    }
}

function handleDisconnect() {
    bt.disconnect();
    isRecording = false;
    timer.stop();
    timer.reset();
    document.getElementById('not-connected-section').classList.remove('hidden');
    document.getElementById('connected-section').classList.add('hidden');
    addDebugLog('切断しました');
}

function handleStopRecording() {
    if (!isRecording) return;

    timer.stop();
    isRecording = false;
    setStopButtonActive(false);

    const { minutes, seconds } = timer.getElapsed();
    const beyName   = document.getElementById('bey-name-input').value.trim() || `ベイ${state.nextId}`;
    const finalPower = bt.maxPower;

    addDebugLog(`記録: ${beyName} - SP: ${finalPower}, 時間: ${minutes}分${seconds}秒`);

    const wasAdded = upsertBeyByName(beyName, { power: finalPower, minutes, seconds });
    document.getElementById('connection-status').textContent = wasAdded
        ? `「${beyName}」を追加しました`
        : `「${beyName}」のデータを更新しました`;
    addDebugLog(wasAdded ? `「${beyName}」を追加` : `「${beyName}」を更新`);

    document.getElementById('shoot-state').textContent = '記録完了 - 次のシュート待機中';
    document.getElementById('bey-name-input').value = '';
    timer.reset();
    bt.resetShootData();
    document.getElementById('current-power').textContent = '0';

    renderBeyList();
    updateRanking();
}

function handleAddBey() {
    const name = `ベイ${String.fromCharCode(64 + state.nextId)}`;
    addBey({ name, power: '', minutes: '', seconds: '' });
    renderBeyList();
    updateRanking();
}

/** ベイリストの input[change] をイベント委譲で処理する */
function handleBeyListChange(e) {
    const input = e.target;
    const id    = parseInt(input.dataset.beyId);
    const field = input.dataset.field;
    if (!id || !field) return;

    let value;
    switch (field) {
        case 'name':
            value = input.value;
            break;
        case 'power':
        case 'seconds':
            value = input.value === '' ? '' : parseFloat(input.value) || '';
            break;
        case 'minutes':
            value = input.value === '' ? '' : parseInt(input.value) || '';
            break;
        default:
            return;
    }

    updateBey(id, { [field]: value });

    // 名前変更はカード再描画不要（表示は input.value のまま）
    if (field !== 'name') {
        renderBeyList();
        updateRanking();
    }
}

/** ベイリストの削除ボタンをイベント委譲で処理する */
function handleBeyListClick(e) {
    const btn = e.target.closest('[data-action="delete"]');
    if (!btn) return;
    const id = parseInt(btn.dataset.beyId);
    if (deleteBey(id)) {
        renderBeyList();
        updateRanking();
    }
}

function handleModelChange() {
    state.currentModel = document.getElementById('model-select').value;
    updateModelInfo();
    renderBeyList();
    updateRanking();
}

function handlePowerNChange() {
    const val = parseFloat(document.getElementById('power-n-input').value);
    if (!isNaN(val) && val > 0) {
        state.powerExponent = val;
        renderBeyList();
        updateRanking();
    }
}

// ---- Bluetooth サポート確認 ----

function checkBluetoothSupport() {
    if (!navigator.bluetooth) {
        document.getElementById('bluetooth-not-supported').classList.remove('hidden');
        const btn = document.getElementById('connect-btn');
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        addDebugLog('Bluetooth API not supported');
    } else {
        addDebugLog('Bluetooth API supported');
    }
}

// ---- 初期化 ----

document.addEventListener('DOMContentLoaded', () => {
    checkBluetoothSupport();
    updateModelInfo();
    renderBeyList();
    updateRanking();

    document.getElementById('connect-btn').addEventListener('click', handleConnect);
    document.getElementById('disconnect-btn').addEventListener('click', handleDisconnect);
    document.getElementById('add-bey-btn').addEventListener('click', handleAddBey);
    document.getElementById('stop-btn').addEventListener('click', handleStopRecording);
    document.getElementById('model-select').addEventListener('change', handleModelChange);
    document.getElementById('power-n-input').addEventListener('input', handlePowerNChange);

    const beyList = document.getElementById('bey-list');
    beyList.addEventListener('change', handleBeyListChange);
    beyList.addEventListener('click', handleBeyListClick);
});
