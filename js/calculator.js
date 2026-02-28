/**
 * 計算モデル定義
 * 各モデルはシュートパワー(omega)に対して異なる正規化を行う
 */
export const MODELS = {
    sqrt: {
        label: '平方根モデル (T/√ω)',
        formula: '性能値 = 回転時間（秒） ÷ √シュートパワー',
        description: '混合摩擦（経験則）- 一般的なケース',
        fn: (T, omega, _n) => T / Math.sqrt(omega),
    },
    linear: {
        label: '線形モデル (T/ω)',
        formula: '性能値 = 回転時間（秒） ÷ シュートパワー',
        description: 'クーロン摩擦 - 重いベイ・低速回転向け',
        fn: (T, omega, _n) => T / omega,
    },
    log: {
        label: '対数モデル (T/ln(ω))',
        formula: '性能値 = 回転時間（秒） ÷ ln(シュートパワー)',
        description: '粘性摩擦 - 軽いベイ・高速回転向け',
        fn: (T, omega, _n) => T / Math.log(omega),
    },
    power: {
        label: 'べき乗モデル (T/ωⁿ)',
        formula: '性能値 = 回転時間（秒） ÷ シュートパワーⁿ',
        description: '一般化モデル - 実験で最適な指数 n を決定',
        fn: (T, omega, n) => T / Math.pow(omega, n),
    },
};

/**
 * 性能値を計算する
 * @param {number|string} power - シュートパワー
 * @param {number|string} minutes - 分
 * @param {number|string} seconds - 秒
 * @param {string} modelKey - 計算モデルキー ('sqrt' | 'linear' | 'log' | 'power')
 * @param {number} powerN - べき乗モデル用の指数 n
 * @returns {number|null} 性能値（計算不能な場合は null）
 */
export function calculatePerformance(power, minutes, seconds, modelKey = 'sqrt', powerN = 0.5) {
    const omega = Number(power);
    if (!omega || omega <= 0) return null;

    const totalSeconds = getTotalSeconds(minutes, seconds);
    if (totalSeconds <= 0) return null;

    // 対数モデルは omega > 1 が必要（ln(1) = 0 で除算エラー、ln(x<1) < 0 で意味不明）
    if (modelKey === 'log' && omega <= 1) return null;

    const model = MODELS[modelKey];
    if (!model) return null;

    return model.fn(totalSeconds, omega, Number(powerN));
}

/**
 * 分・秒から合計秒数を算出する
 * @param {number|string} minutes
 * @param {number|string} seconds
 * @returns {number}
 */
export function getTotalSeconds(minutes, seconds) {
    return (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
}
