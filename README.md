# Simple Selective-Fire Crossbow（アタレ式ボウガン）


[![Demo](https://raw.githubusercontent.com/Melnus/Simple-Selective-Fire-Crossbow/refs/heads/main/SSFC_Thumbnail.png)](https://youtu.be/4Czys1de2Zs?si=VgRqBebliilCqNPU)


## English

A vanilla-style crossbow inspired by the Japanese **"Atare" fire selector** used on Japan Self-Defense Forces rifles. It also features the three-round burst mode of the Type 89 rifle.

### Features

- **ア (Safe)**: Firing is disabled. Hold the button to reload.
- **タ (Single)**: Aim, then release the button to fire one shot.
- **3 (3-round burst)**: Aim, then release the button to fire three shots.
- **レ (Full-auto)**: Keeps firing while you hold the button.
- **30-round magazine**: Reloading consumes one arrow and fills the magazine.
- **Vanilla-style handling**: Uses the vanilla crossbow's aiming pose, with a crosshair displayed while aiming.
- **Multilingual support**: On-screen text is available in 15 languages.

### Controls

- Hold right-click (the use button) to aim, then release to fire.
- Sneak + right-click to switch the fire selector.
- Hold the button to reload when the magazine is empty or the selector is set to **ア (Safe)**.

### Recipe

Craft the crossbow at a crafting table using:

- 1 Crossbow
- 2 Iron Ingots
- 1 Redstone

### Notes

- Arrows disappear on impact to prevent them from being picked up and duplicated.
- In Creative mode, arrows are not consumed and the magazine never runs out.
- Requires Minecraft Bedrock Edition with support for Script API (`@minecraft/server` 2.9.0).
- Translations into languages other than Japanese and English may include machine-translated text.

---

## 日本語

自衛隊の小銃にある切替レバー「ア・タ・レ」をモチーフにした、バニラ風のクロスボウです。89式小銃の「3」点射機能も再現しています。

### 特徴

- **ア（安全）**：発射できません。長押しでリロードします。
- **タ（単発）**：構えて、ボタンを離すと1発撃ちます。
- **3（3点射）**：構えて、ボタンを離すと3発撃ちます。
- **レ（連発）**：構えたままボタンを押し続けると、連続して発射します。
- **30発マガジン**：リロード時に矢を1本消費し、弾倉が満タンになります。
- **バニラ風の操作感**：バニラのクロスボウと同じ構え方で、構えている間は画面中央に照準が表示されます。
- **多言語対応**：画面上のテキストは15言語に対応しています。

### 操作方法

- 右クリック（使用ボタン）を長押しして構え、ボタンを離すと発射します。
- スニークしながら右クリックすると、射撃モードを切り替えます。
- 弾切れ時、または「ア（安全）」に設定しているときに長押しすると、リロードします。

### 入手方法

クラフト台で以下のアイテムを組み合わせます。

- クロスボウ × 1
- 鉄インゴット × 2
- レッドストーン × 1

### 注意事項

- 発射した矢は、何かに当たると消滅します。矢を回収して増殖できないようにするための仕様です。
- クリエイティブモードでは矢を消費せず、弾切れも発生しません。
- 動作には、Script API（`@minecraft/server` 2.9.0）に対応したバージョンのMinecraft統合版が必要です。
- 日本語・英語以外の言語の翻訳には、機械翻訳を使用している場合があります。
