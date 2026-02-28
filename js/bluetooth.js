const SERVICE_UUID        = '55c40000-f8eb-11ec-b939-0242ac120002';
const CHARACTERISTIC_UUID = '55c4f002-f8eb-11ec-b939-0242ac120002';

/**
 * ベイパス Bluetooth 接続を管理するクラス
 *
 * コールバック:
 *   onLog(message)          - デバッグログ
 *   onShootStart()          - シュート開始検知
 *   onPowerUpdate(power)    - SPデータ受信
 *   onShootDataComplete(maxPower) - 全SPデータ受信完了
 *   onBeySet()              - ベイセット検知
 */
export class BluetoothController {
    #device = null;
    #characteristic = null;
    #callbacks;

    constructor(callbacks = {}) {
        this.#callbacks = callbacks;
        this.maxPower = 0;
        this.currentPower = 0;
    }

    get isConnected() {
        return this.#device?.gatt?.connected ?? false;
    }

    async connect() {
        this.#log('接続処理を開始...');
        this.#device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [SERVICE_UUID] }],
        });
        this.#log(`デバイス発見: ${this.#device.name || '名前なし'}`);

        const server = await this.#device.gatt.connect();
        this.#log('GATT接続成功');

        const service = await server.getPrimaryService(SERVICE_UUID);
        this.#log('サービス取得成功');

        this.#characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
        this.#log('キャラクタリスティック取得成功');

        this.#characteristic.addEventListener(
            'characteristicvaluechanged',
            this.#handleNotification.bind(this)
        );
        await this.#characteristic.startNotifications();
        this.#log('通知リスナー設定完了');

        this.resetShootData();
    }

    disconnect() {
        if (this.#device?.gatt?.connected) {
            this.#device.gatt.disconnect();
        }
        this.#device = null;
        this.#characteristic = null;
        this.resetShootData();
    }

    resetShootData() {
        this.maxPower = 0;
        this.currentPower = 0;
    }

    // ---- private ----

    #readPower(data, i) {
        const lo = data.getUint8(i * 2 + 1);
        const hi = data.getUint8(i * 2 + 2);
        return (hi << 8) | lo;
    }

    #handleNotification(event) {
        const data = event.target.value;
        const idx = data.getUint8(0);

        let hex = '';
        for (let i = 0; i < data.byteLength; i++) {
            hex += data.getUint8(i).toString(16).padStart(2, '0') + ' ';
        }
        this.#log(`受信: [${idx}] ${hex}`);

        // ベイセット検知
        if (idx === 160) {
            this.#log('ベイセット検知');
            this.#callbacks.onBeySet?.();
        }

        // シュート開始 (index 112)
        if (idx >= 112 && idx <= 115) {
            if (idx === 112) {
                this.#log('シュート開始');
                this.#callbacks.onShootStart?.();
            }
        }

        // SPデータ (176–181): 1パケットにつき8個
        if (idx >= 176 && idx <= 181) {
            this.#log(`SPデータ受信 [${idx}]`);
            for (let i = 0; i < 8; i++) {
                const sp = this.#readPower(data, i);
                if (sp !== 0) {
                    this.currentPower = sp;
                    this.maxPower = sp;
                    this.#callbacks.onPowerUpdate?.(sp);
                    this.#log(`SP: ${sp}`);
                }
            }
        }

        // SPデータ (182): 最終パケット、2個のみ + シュート回数
        if (idx === 182) {
            this.#log('SPデータ受信 [182] - 最終');
            for (let i = 0; i < 2; i++) {
                const sp = this.#readPower(data, i);
                if (sp !== 0) {
                    this.currentPower = sp;
                    this.maxPower = sp;
                    this.#callbacks.onPowerUpdate?.(sp);
                    this.#log(`SP: ${sp}`);
                }
            }
            const shootCount = data.getUint8(9);
            this.#log(`シュート回数: ${shootCount}`);
        }

        // 全SPデータ送信完了
        if (idx === 115) {
            this.#log(`データ送信完了 - 最大SP: ${this.maxPower}`);
            this.#callbacks.onShootDataComplete?.(this.maxPower);
        }
    }

    #log(message) {
        this.#callbacks.onLog?.(message);
    }
}
