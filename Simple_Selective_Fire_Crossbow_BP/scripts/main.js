// アタレ式ボウガン (melnus:atare_crossbow)
// 自衛隊の小銃の切替レバー「ア・タ・レ」(+ 89式の「3」) をモチーフにしたクロスボウ。
//
//   ア = 安全   撃てない。長押しでリロード
//   タ = 単発   構えて、離すと1発
//   3 = 3点射   構えて、離すと3発
//   レ = 連発   構えたまま押している間、撃ち続ける
//
// 操作
//   右クリック(構えるボタン)長押し ... 構える(クロスヘアが出る)。離すと発射 (タ/3)
//   弾切れ、または「ア」で長押し ... リロード (バニラのクロスボウと同じ長押し)
//   スニーク+右クリック ........... レバー切替 (ア→タ→3→レ)
//
// 弾倉: 30発 (89式小銃と同じ)。リロードで矢を1本消費して満タンになる。
//       クリエイティブでは矢を消費せず、弾切れしない。

import { world, system } from "@minecraft/server";
import { KEYS, T } from "./i18n.js";

// ===== 調整用の数値 =====
const ITEM_ID = "melnus:atare_crossbow";
const ARROW_ID = "minecraft:arrow";
const MAG_SIZE = 30;            // 弾倉の容量
const ARROWS_PER_RELOAD = 1;    // リロード1回で消費する矢の本数
const RELOAD_TICKS = 25;        // リロードにかかる時間 (tick, バニラのクロスボウと同じ)
const AIM_TICKS = 5;            // 構え完了までの時間 (tick)
const POWER = 3.0;              // 矢の初速 (バニラの弓のフルチャージ相当)
const AUTO_INTERVAL = 2;        // 連発の発射間隔 (tick, 20tick=1秒。2で毎秒10発)
const BURST_INTERVAL = 2;       // 3点射の発射間隔 (tick)
const BURST_COUNT = 3;
const BURST_COOLDOWN = 10;      // 3点射のあと、次に構えられるまでの待ち (tick)
const SINGLE_COOLDOWN = 5;      // 単発の連打制限 (tick)
const ARROW_LIFETIME = 200;     // 当たらなかった矢を消すまでの時間 (tick)

const ARROW_TAG = "melnus_atare_arrow";
const PROP_MODE = "melnus:atare_mode";
const PROP_MAG = "melnus:atare_mag";
// クロスヘア表示の合図。resource pack の ui/hud_screen.json と同じ文字列にすること
// (この文字列のタイトルを送っている間だけ十字が出る。タイトル自体は表示されない)
const CROSSHAIR_MARK = "melnus_aim";
const CROSSHAIR_OFF_MARK = "melnus_off"; // 十字を消す合図 (これも画面には表示されない)

const MODES = [
  { key: "ア", nameKey: KEYS.MODE_SAFE, color: "§a" },
  { key: "タ", nameKey: KEYS.MODE_SINGLE, color: "§e" },
  { key: "3", nameKey: KEYS.MODE_BURST, color: "§6" },
  { key: "レ", nameKey: KEYS.MODE_AUTO, color: "§c" },
];
const MODE_SAFE = 0;
const MODE_SINGLE = 1;
const MODE_BURST = 2;
const MODE_AUTO = 3;

const using = new Set();        // 構えるボタンを押している間のプレイヤーID
const states = new Map();       // プレイヤーID -> { phase: "aim" | "reload", id, ready }
const busyUntil = new Map();    // プレイヤーID -> 次に構えられるtick

// ===== ユーティリティ =====
function getMode(player) {
  try {
    const v = player.getDynamicProperty(PROP_MODE);
    return typeof v === "number" && v >= 0 && v < MODES.length ? v : MODE_SINGLE;
  } catch {
    return MODE_SINGLE;
  }
}

function getMag(player) {
  try {
    const v = player.getDynamicProperty(PROP_MAG);
    return typeof v === "number" && v > 0 ? Math.min(v, MAG_SIZE) : 0;
  } catch {
    return 0;
  }
}

function setMag(player, n) {
  try {
    player.setDynamicProperty(PROP_MAG, n);
  } catch {}
}

function isCreative(player) {
  try {
    return String(player.getGameMode()).toLowerCase() === "creative";
  } catch {
    return false;
  }
}

function isHoldingCrossbow(player) {
  try {
    const container = player.getComponent("minecraft:inventory").container;
    return container.getItem(player.selectedSlotIndex)?.typeId === ITEM_ID;
  } catch {
    return false;
  }
}

function actionBar(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {}
}

// extraKey: 末尾に付ける補足の翻訳キー (なければ省略)
function showStatus(player, extraKey = null) {
  const m = MODES[getMode(player)];
  const mag = isCreative(player) ? "∞" : String(getMag(player));
  actionBar(
    player,
    T(KEYS.STATUS, [m.color, m.key, T(m.nameKey), mag, MAG_SIZE, extraKey ? T(extraKey) : ""])
  );
}

function sound(player, id) {
  try {
    player.playSound(id);
  } catch {}
}

// ===== クロスヘア (画面中央の十字。表示はresource packのJSON UIが担当) =====
function showCrosshair(player) {
  try {
    player.onScreenDisplay.setTitle(CROSSHAIR_MARK, {
      fadeInDuration: 0,
      stayDuration: 12,
      fadeOutDuration: 0,
    });
  } catch {}
}

function hideCrosshair(player) {
  // タイトル文字列は消えたあとも最後の値が残るので、「消す」合図を明示的に送る
  try {
    player.onScreenDisplay.setTitle(CROSSHAIR_OFF_MARK, {
      fadeInDuration: 0,
      stayDuration: 1,
      fadeOutDuration: 0,
    });
  } catch {
    try {
      player.runCommand("title @s clear");
    } catch {}
  }
}

// ===== 矢の消費 =====
function countArrows(player) {
  let n = 0;
  try {
    const container = player.getComponent("minecraft:inventory").container;
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);
      if (item && item.typeId === ARROW_ID) n += item.amount;
    }
  } catch {}
  return n;
}

function consumeArrows(player, count) {
  if (isCreative(player)) return true;
  if (countArrows(player) < count) return false;
  try {
    const container = player.getComponent("minecraft:inventory").container;
    let left = count;
    for (let i = 0; i < container.size && left > 0; i++) {
      const item = container.getItem(i);
      if (!item || item.typeId !== ARROW_ID) continue;
      const take = Math.min(item.amount, left);
      left -= take;
      if (item.amount > take) {
        item.amount -= take;
        container.setItem(i, item);
      } else {
        container.setItem(i, undefined);
      }
    }
    return left === 0;
  } catch {
    return false;
  }
}

// ===== 状態の後始末 =====
function stopState(player) {
  const st = states.get(player.id);
  if (!st) return;
  try {
    system.clearRun(st.id);
  } catch {}
  states.delete(player.id);
  if (st.phase === "aim") hideCrosshair(player);
}

// ===== 発射 =====
function takeRound(player) {
  if (isCreative(player)) return true;
  const mag = getMag(player);
  if (mag <= 0) return false;
  setMag(player, mag - 1);
  return true;
}

function fireOne(player, uncertainty) {
  if (!takeRound(player)) {
    actionBar(player, T(KEYS.EMPTY));
    sound(player, "random.click");
    return false;
  }
  try {
    const dir = player.getViewDirection();
    const head = player.getHeadLocation();
    const pos = { x: head.x + dir.x, y: head.y + dir.y - 0.1, z: head.z + dir.z };
    const arrow = player.dimension.spawnEntity(ARROW_ID, pos);
    arrow.addTag(ARROW_TAG);
    const proj = arrow.getComponent("minecraft:projectile");
    try {
      proj.owner = player;
    } catch {}
    proj.shoot({ x: dir.x * POWER, y: dir.y * POWER, z: dir.z * POWER }, { uncertainty });
    // 外れて飛び続けた矢の後始末 (矢の回収による増殖を防ぐ)
    system.runTimeout(() => {
      try {
        arrow.remove();
      } catch {}
    }, ARROW_LIFETIME);
    sound(player, "crossbow.shoot");
  } catch (e) {
    console.warn(`[atare] failed to fire: ${e}`);
    return false;
  }
  showStatus(player);
  return true;
}

function fireBurst(player, count, interval, uncertainty) {
  if (!fireOne(player, uncertainty)) return;
  let n = 1;
  const id = system.runInterval(() => {
    if (n >= count || !isHoldingCrossbow(player)) {
      system.clearRun(id);
      return;
    }
    n++;
    if (!fireOne(player, uncertainty)) system.clearRun(id);
  }, interval);
}

// ===== リロード (長押し) =====
function startReload(player) {
  if (!isCreative(player) && getMag(player) >= MAG_SIZE) {
    showStatus(player, KEYS.FULL);
    return;
  }
  if (isCreative(player)) {
    setMag(player, MAG_SIZE);
    showStatus(player);
    return;
  }
  if (countArrows(player) < ARROWS_PER_RELOAD) {
    actionBar(player, T(KEYS.NO_ARROW));
    sound(player, "random.click");
    return;
  }

  const start = system.currentTick;
  sound(player, "crossbow.loading.start");
  const id = system.runInterval(() => {
    const st = states.get(player.id);
    if (!st || st.id !== id || !using.has(player.id) || !isHoldingCrossbow(player)) {
      stopState(player);
      return;
    }
    const t = system.currentTick - start;
    const filled = Math.min(10, Math.floor((t / RELOAD_TICKS) * 10));
    actionBar(player, T(KEYS.RELOAD, ["■".repeat(filled) + "□".repeat(10 - filled)]));
    if (t === Math.floor(RELOAD_TICKS / 2)) sound(player, "crossbow.loading.middle");
    if (t >= RELOAD_TICKS) {
      stopState(player);
      if (consumeArrows(player, ARROWS_PER_RELOAD)) {
        setMag(player, MAG_SIZE);
        sound(player, "crossbow.loading.end");
        showStatus(player);
      } else {
        actionBar(player, T(KEYS.NO_ARROW));
      }
    }
  }, 1);
  states.set(player.id, { phase: "reload", id, ready: false });
}

// ===== 構え (長押し。クロスヘア表示) =====
function startAim(player, mode) {
  const start = system.currentTick;
  const id = system.runInterval(() => {
    const st = states.get(player.id);
    if (!st || st.id !== id || !using.has(player.id) || !isHoldingCrossbow(player)) {
      stopState(player);
      return;
    }
    const t = system.currentTick - start;
    if (t % 5 === 0) showCrosshair(player);
    if (!st.ready && t >= AIM_TICKS) {
      st.ready = true;
      showStatus(player);
    }
    // 連発は、構え完了後は押している間ずっと撃つ
    if (mode === MODE_AUTO && st.ready && (t - AIM_TICKS) % AUTO_INTERVAL === 0) {
      if (!fireOne(player, 1.0)) stopState(player);
    }
  }, 1);
  states.set(player.id, { phase: "aim", id, ready: false });
  showCrosshair(player);
  showStatus(player);
}

// ===== イベント =====
world.afterEvents.itemStartUse.subscribe((ev) => {
  const player = ev.source;
  if (player?.typeId !== "minecraft:player") return;
  if (ev.itemStack?.typeId !== ITEM_ID) return;

  // スニーク+右クリック = ア→タ→3→レ の順に切替
  if (player.isSneaking) {
    const next = (getMode(player) + 1) % MODES.length;
    try {
      player.setDynamicProperty(PROP_MODE, next);
    } catch {}
    sound(player, "random.click");
    showStatus(player);
    return;
  }

  stopState(player);
  using.add(player.id);
  const mode = getMode(player);

  // 安全、または弾切れ = リロード
  if (mode === MODE_SAFE || (!isCreative(player) && getMag(player) <= 0)) {
    startReload(player);
    return;
  }

  if ((busyUntil.get(player.id) ?? 0) > system.currentTick) return;
  startAim(player, mode);
});

world.afterEvents.itemStopUse.subscribe((ev) => {
  const player = ev.source;
  if (player?.typeId !== "minecraft:player") return;
  using.delete(player.id);

  const st = states.get(player.id);
  const mode = getMode(player);
  const now = system.currentTick;
  // 構え完了後に離すと発射 (タ/3)
  if (st && st.phase === "aim" && st.ready && isHoldingCrossbow(player)) {
    if (mode === MODE_SINGLE) {
      busyUntil.set(player.id, now + SINGLE_COOLDOWN);
      fireOne(player, 0.3);
    } else if (mode === MODE_BURST) {
      busyUntil.set(player.id, now + BURST_COUNT * BURST_INTERVAL + BURST_COOLDOWN);
      fireBurst(player, BURST_COUNT, BURST_INTERVAL, 0.6);
    }
  }
  stopState(player);
});

world.afterEvents.playerLeave.subscribe((ev) => {
  using.delete(ev.playerId);
  busyUntil.delete(ev.playerId);
  const st = states.get(ev.playerId);
  if (st) {
    try {
      system.clearRun(st.id);
    } catch {}
    states.delete(ev.playerId);
  }
});

// 当たった矢は消す (回収して増やせないように)
function removeHitArrow(projectile) {
  try {
    if (!projectile || !projectile.hasTag(ARROW_TAG)) return;
    system.run(() => {
      try {
        projectile.remove();
      } catch {}
    });
  } catch {}
}
world.afterEvents.projectileHitBlock.subscribe((ev) => removeHitArrow(ev.projectile));
world.afterEvents.projectileHitEntity.subscribe((ev) => removeHitArrow(ev.projectile));
