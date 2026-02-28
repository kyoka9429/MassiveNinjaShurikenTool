/**
 * アプリケーション状態管理
 * ベイデータと現在の計算モデル設定を保持する
 */
export const state = {
    beyblades: [
        { id: 1, name: 'ベイA', power: 8100, minutes: 3, seconds: 12.15 },
        { id: 2, name: 'ベイB', power: 5000, minutes: 2, seconds: 10.03 },
    ],
    nextId: 3,
    currentModel: 'sqrt',
    powerExponent: 0.5,
};

/**
 * 新しいベイを追加する
 * @param {{ name: string, power: number|string, minutes: number|string, seconds: number|string }} data
 */
export function addBey(data) {
    state.beyblades.push({ id: state.nextId++, ...data });
}

/**
 * 名前でベイを検索し、存在すれば更新・なければ追加する
 * @param {string} name
 * @param {{ power: number, minutes: number, seconds: number }} data
 * @returns {boolean} true = 新規追加, false = 更新
 */
export function upsertBeyByName(name, data) {
    const existing = state.beyblades.find(b => b.name === name);
    if (existing) {
        Object.assign(existing, data);
        return false;
    }
    state.beyblades.push({ id: state.nextId++, name, ...data });
    return true;
}

/**
 * IDでベイのフィールドを更新する
 * @param {number} id
 * @param {Partial<{ name: string, power: number|string, minutes: number|string, seconds: number|string }>} updates
 * @returns {boolean} 更新に成功したか
 */
export function updateBey(id, updates) {
    const bey = state.beyblades.find(b => b.id === id);
    if (bey) {
        Object.assign(bey, updates);
        return true;
    }
    return false;
}

/**
 * IDでベイを削除する（1件以上残す制約あり）
 * @param {number} id
 * @returns {boolean} 削除に成功したか
 */
export function deleteBey(id) {
    if (state.beyblades.length <= 1) return false;
    const index = state.beyblades.findIndex(b => b.id === id);
    if (index !== -1) {
        state.beyblades.splice(index, 1);
        return true;
    }
    return false;
}
