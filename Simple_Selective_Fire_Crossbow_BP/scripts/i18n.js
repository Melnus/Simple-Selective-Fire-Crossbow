// 画面に出す文言の翻訳キーをここにまとめる。
// 訳文そのものは resource pack の texts/*.lang にある (遊んでいる人の言語で表示される)。
// 文言を足すときは、ここにキーを足して、すべての .lang に同じキーの訳を足すこと。

export const KEYS = {
  MODE_SAFE: "melnus.atare.mode.safe",     // ア
  MODE_SINGLE: "melnus.atare.mode.single", // タ
  MODE_BURST: "melnus.atare.mode.burst",   // 3
  MODE_AUTO: "melnus.atare.mode.auto",     // レ
  STATUS: "melnus.atare.status",           // %1=色 %2=記号 %3=モード名 %4=残弾 %5=容量 %6=補足
  FULL: "melnus.atare.full",               // 弾倉が満タン
  RELOAD: "melnus.atare.reload",           // %1=進み具合のバー
  NO_ARROW: "melnus.atare.no_arrow",
  EMPTY: "melnus.atare.empty",             // 弾切れ
};

// 翻訳キーを RawMessage にする。parts は with に渡す値 (文字列、または T() の戻り値)
export function T(key, parts) {
  if (!parts) return { translate: key };
  return {
    translate: key,
    with: { rawtext: parts.map((p) => (typeof p === "object" ? p : { text: String(p) })) },
  };
}
