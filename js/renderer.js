import { calculatePerformance, getTotalSeconds, MODELS } from './calculator.js';
import { state } from './store.js';

// ---- ベイカード ----

/**
 * 全ベイカードを再描画する
 * data-bey-id / data-field / data-action 属性でイベント委譲に対応
 */
export function renderBeyList() {
    document.getElementById('bey-list').innerHTML =
        state.beyblades.map(renderBeyCard).join('');
}

function renderBeyCard(bey) {
    const performance = calculatePerformance(
        bey.power, bey.minutes, bey.seconds,
        state.currentModel, state.powerExponent
    );
    const totalSecs = getTotalSeconds(bey.minutes, bey.seconds);
    const canDelete = state.beyblades.length > 1;
    const model = MODELS[state.currentModel];

    return `
        <div class="bey-card rounded-xl shadow-xl p-6" data-bey-id="${bey.id}">
            <div class="flex items-start justify-between mb-4">
                <input type="text" value="${escapeHtml(String(bey.name))}"
                    data-bey-id="${bey.id}" data-field="name"
                    class="text-xl font-semibold bg-transparent border-b-2 border-transparent
                           hover:border-teal-400 focus:border-teal-500 focus:outline-none
                           px-2 text-white transition-colors">
                <button data-action="delete" data-bey-id="${bey.id}"
                    class="text-red-400 hover:text-red-300 transition-colors
                           ${canDelete ? '' : 'opacity-50 cursor-not-allowed'}"
                    ${canDelete ? '' : 'disabled'}>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">シュートパワー</label>
                    <input type="number" value="${bey.power}"
                        data-bey-id="${bey.id}" data-field="power"
                        class="w-full input-dark rounded-lg px-3 py-2" min="0" placeholder="例: 8100">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">回転時間（分）</label>
                    <input type="number" value="${bey.minutes}"
                        data-bey-id="${bey.id}" data-field="minutes"
                        class="w-full input-dark rounded-lg px-3 py-2" min="0" placeholder="例: 3">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">回転時間（秒）</label>
                    <input type="number" step="0.01" value="${bey.seconds}"
                        data-bey-id="${bey.id}" data-field="seconds"
                        class="w-full input-dark rounded-lg px-3 py-2" min="0" max="59.99" placeholder="例: 12.15">
                </div>
            </div>

            <div class="bg-black/30 rounded-lg p-4 border border-teal-500/20">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-400">合計回転時間</p>
                        <p class="text-2xl font-bold text-teal-400">
                            ${performance !== null ? totalSecs.toFixed(2) + '秒' : '---'}
                        </p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-400">性能値 <span class="text-xs">(${escapeHtml(model?.label ?? '')})</span></p>
                        <p class="text-2xl font-bold gradient-text">
                            ${performance !== null ? performance.toFixed(3) : '---'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ---- ランキング ----

export function updateRanking() {
    const ranked = state.beyblades
        .map(bey => ({
            ...bey,
            performance: calculatePerformance(
                bey.power, bey.minutes, bey.seconds,
                state.currentModel, state.powerExponent
            ),
        }))
        .filter(bey => bey.performance !== null)
        .sort((a, b) => b.performance - a.performance);

    const section = document.getElementById('ranking-section');
    if (ranked.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    const maxPerf = ranked[0].performance;

    document.getElementById('ranking-list').innerHTML = ranked.map((bey, index) => {
        const pct = (bey.performance / maxPerf) * 100;
        const isTop = index === 0;

        const badgeClass = isTop
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-yellow-900'
            : index === 1
                ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700'
                : index === 2
                    ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900'
                    : 'bg-gray-700 text-gray-300';

        const barClass = isTop
            ? 'bg-gradient-to-r from-yellow-500 to-orange-600'
            : 'bg-gradient-to-r from-purple-600 to-teal-600';

        return `
            <div class="space-y-2">
                <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-12 h-12 rounded-lg font-bold text-lg shadow-lg ${badgeClass}">
                        #${index + 1}
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-semibold text-white">${escapeHtml(bey.name)}</span>
                            ${isTop ? '<span class="bg-gradient-to-r from-yellow-400 to-orange-500 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">🏆 最高性能</span>' : ''}
                        </div>
                        <div class="bg-gray-800 rounded-full h-8 overflow-hidden border border-gray-700">
                            <div class="${barClass} h-full flex items-center justify-end px-3 text-white text-sm font-semibold transition-all duration-300"
                                 style="width: ${pct}%">
                                ${bey.performance.toFixed(3)}
                            </div>
                        </div>
                    </div>
                    <div class="w-16 text-sm text-gray-400 text-right">${pct.toFixed(1)}%</div>
                </div>
            </div>
        `;
    }).join('');
}

// ---- モデル情報 ----

/**
 * 選択中モデルのラベル・数式・説明を更新し、
 * べき乗モデルの場合のみ指数 n 入力欄を表示する
 */
export function updateModelInfo() {
    const model = MODELS[state.currentModel];
    if (!model) return;

    document.getElementById('model-formula').textContent = model.formula;
    document.getElementById('model-description').textContent = model.description;
    document.getElementById('power-n-section').classList.toggle('hidden', state.currentModel !== 'power');
}

// ---- ユーティリティ ----

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
