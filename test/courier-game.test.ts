import test from "node:test";
import assert from "node:assert/strict";
import {
  CHASMS,
  CHECKPOINTS,
  CRUMBLE_FALL_FRAMES,
  CRUMBLE_PLATFORMS,
  DOOR,
  MAX_HP,
  MOMENTS,
  MOVING_PLATFORMS,
  PHYS,
  PLAYER,
  SPRINGBOARDS,
  START_POS,
  WORLD,
  cameraX,
  canDeliver,
  createState,
  getMovingPlatformPos,
  playerBox,
  step,
  type Input,
  type State,
} from "../components/landing/courier/physics.ts";

const NONE: Input = { left: false, right: false, jump: false };
const RIGHT: Input = { left: false, right: true, jump: false };
const HOLD: Input = { left: false, right: false, jump: true };

function run(s: State, input: Input, frames: number) {
  const events: string[] = [];
  for (let i = 0; i < frames; i++) events.push(...step(s, input));
  return events;
}

test("pemain mulai di tanah, tidak menembus lantai", () => {
  const s = createState();
  run(s, NONE, 30);
  assert.equal(s.y, WORLD.groundY);
  assert.equal(s.grounded, true);
});

test("apex lompat penuh ~125px dan variable jump height memendekkan tap cepat", () => {
  // Full hold jump
  const full = createState();
  run(full, HOLD, 1);
  assert.ok(full.vy < 0, "frame pertama harus naik");
  let fullTop = full.y;
  for (let i = 0; i < 60 && full.vy < 0; i++) {
    step(full, HOLD);
    fullTop = Math.min(fullTop, full.y);
  }
  const fullApex = WORLD.groundY - fullTop;
  assert.ok(
    fullApex > 118 && fullApex < 134,
    `full apex ${fullApex.toFixed(1)}px di luar 118–134`
  );

  // Short 1-frame tap jump
  const tap = createState();
  step(tap, HOLD);
  let tapTop = tap.y;
  for (let i = 0; i < 60 && tap.vy < 0; i++) {
    step(tap, NONE);
    tapTop = Math.min(tapTop, tap.y);
  }
  const tapApex = WORLD.groundY - tapTop;
  assert.ok(
    tapApex > 44 && tapApex < 75,
    `short tap apex ${tapApex.toFixed(1)}px di luar 44–75`
  );
  assert.ok(tapApex < fullApex - 40, "tap cepat harus jauh lebih rendah daripada tahan penuh");
});

test("kecepatan horizontal konsisten", () => {
  const s = createState();
  const start = s.x;
  run(s, RIGHT, 10);
  assert.equal(s.x, start + PHYS.speed * 10);
});

test("tidak bisa keluar dari batas dunia", () => {
  const s = createState();
  s.x = 0;
  run(s, { left: true, right: false, jump: false }, 20);
  assert.equal(s.x, 0);
});

test("coyote time memberi kesempatan lompat setelah meninggalkan tepi", () => {
  const s = createState();
  s.grounded = false;
  s.coyote = PHYS.coyote;
  s.vy = 1;
  run(s, HOLD, 1);
  assert.ok(s.vy < 0, "harus tetap bisa lompat");

  const t = createState();
  t.grounded = false;
  t.coyote = 0;
  t.y = 300;
  t.vy = 1;
  run(t, HOLD, 1);
  assert.ok(t.vy > 0, "tanpa coyote tidak boleh lompat");
});

test("mendarat di ledge, bukan tembus", () => {
  const s = createState();
  s.x = 1100;
  s.y = 300;
  s.vy = 10;
  s.grounded = false;
  run(s, NONE, 40);
  assert.equal(s.y, 465);
  assert.equal(s.grounded, true);
});

test("foto diambil saat pemain menyentuhnya", () => {
  const s = createState();
  const foto = MOMENTS[0];
  s.x = foto.x - PLAYER.w / 2;
  s.y = 465;
  const events = run(s, NONE, 1);
  assert.deepEqual(s.collected, ["foto"]);
  assert.ok(events.includes("collect:foto"));
});

test("kejutan tidak bisa diambil dua kali", () => {
  const s = createState();
  const foto = MOMENTS[0];
  s.x = foto.x - PLAYER.w / 2;
  s.y = 465;
  const events = run(s, NONE, 30);
  assert.equal(s.collected.filter((id) => id === "foto").length, 1);
  assert.equal(events.filter((e) => e === "collect:foto").length, 1);
});

test("kurir bisa langsung mengantar ke penerima walau belum mengumpulkan kado (0/3, sebagian, maupun 3/3)", () => {
  // 0/3 gifts -> can deliver immediately
  const zero = createState();
  zero.x = DOOR.x + 20;
  zero.y = WORLD.groundY;
  assert.equal(canDeliver(zero), true);
  const zeroEvents = run(zero, NONE, 1);
  assert.equal(zero.won, true);
  assert.ok(zeroEvents.includes("win"));

  // Partial 1/3 gifts -> can deliver
  const partial = createState();
  partial.x = DOOR.x + 20;
  partial.y = WORLD.groundY;
  partial.collected = ["foto"];
  assert.equal(canDeliver(partial), true);
  const partialEvents = run(partial, NONE, 1);
  assert.equal(partial.won, true);
  assert.ok(partialEvents.includes("win"));

  // Full 3/3 gifts -> can deliver
  const full = createState();
  full.x = DOOR.x + 20;
  full.y = WORLD.groundY;
  full.collected = ["foto", "lagu", "surat"];
  const fullEvents = run(full, NONE, 1);
  assert.equal(full.won, true);
  assert.ok(fullEvents.includes("win"));
});

test("kamera mengikuti pemain dan berhenti di ujung dunia", () => {
  const s = createState();
  assert.equal(cameraX(s), 0);

  s.x = WORLD.w - PLAYER.w;
  assert.equal(cameraX(s), WORLD.w - WORLD.viewW);

  s.x = 1600;
  const cam = cameraX(s);
  assert.ok(cam > 0 && cam < WORLD.w - WORLD.viewW);
});

test("kotak pemain sejajar dengan titik kaki", () => {
  const s = createState();
  const box = playerBox(s);
  assert.equal(box.y + box.h, s.y);
  assert.equal(box.w, PLAYER.w);
});

test("double jump sudah dihapus: tekan lompat lagi di udara tidak memberi dorongan kedua", () => {
  const s = createState();
  // Lompat pertama dari tanah
  step(s, HOLD);
  assert.equal(s.grounded, false);

  // Lepas tombol dan tunggu sampai mulai melambat / turun di udara
  for (let i = 0; i < 12; i++) {
    step(s, NONE);
  }
  const vyBefore = s.vy;

  // Coba tekan lompat kedua di udara
  const events = step(s, HOLD);
  assert.equal(events.includes("doublejump"), false, "tidak boleh ada event doublejump");
  assert.equal(events.includes("jump"), false, "tidak boleh lompat lagi di udara");
  assert.ok(s.vy > vyBefore, "kecepatan vertikal harus tetap ditarik gravitasi tanpa dorongan kedua");
});

test("papan loncat (trampolin) melontarkan kurir penuh tanpa terpotong variable jump", () => {
  const s = createState();
  s.x = SPRINGBOARDS[0].x;
  s.y = 540;
  s.vy = 5;
  const events = step(s, NONE);
  assert.ok(events.includes("bounce"));
  assert.ok(s.vy < -15, "lontaran trampolin harus sangat tinggi");

  // Frame berikutnya tanpa menahan tombol lompat — tidak boleh dipotong ke jumpCutVy
  step(s, NONE);
  assert.ok(s.vy < -14, "pantulan trampolin tidak boleh terpotong variable jump height");
});

test("platform runtuh goyang lalu jatuh setelah CRUMBLE_FALL_FRAMES", () => {
  const s = createState();
  s.x = CRUMBLE_PLATFORMS[0].x + 10;
  s.y = CRUMBLE_PLATFORMS[0].y;
  s.vy = 2;
  step(s, NONE);
  assert.equal(s.grounded, true);
  assert.ok(s.crumbleTimers[0] > 0, "timer runtuh harus aktif saat diinjak");

  // Sebelum batas CRUMBLE_FALL_FRAMES masih menopang kurir
  for (let i = 0; i < CRUMBLE_FALL_FRAMES - 10; i++) {
    step(s, NONE);
  }
  assert.equal(s.grounded, true, "platform harus tetap kokoh sebelum durasi runtuh habis");

  // Setelah melewati batas CRUMBLE_FALL_FRAMES platform runtuh
  for (let i = 0; i < 15; i++) {
    step(s, NONE);
  }
  assert.ok(s.crumbleTimers[0] >= CRUMBLE_FALL_FRAMES, "platform sudah runtuh");
  assert.equal(s.grounded, false, "kurir mulai jatuh setelah platform runtuh");
});

test("musuh Paket Bandel berpatroli bolak-balik di dalam rentang minX..maxX", () => {
  const s = createState();
  const enemy = s.enemies[0];
  const startX = enemy.x;
  run(s, NONE, 260);
  assert.ok(enemy.x >= enemy.minX && enemy.x + enemy.w <= enemy.maxX);
  assert.notEqual(enemy.x, startX, "musuh harus bergerak patroli");
});

test("injak Paket Bandel dari atas membuat musuh gepeng dan kurir memantul", () => {
  const s = createState();
  const enemy = s.enemies[0];
  s.x = enemy.x;
  s.y = enemy.y - enemy.h - 4;
  s.vy = 6;
  s.grounded = false;
  const events = run(s, NONE, 3);
  assert.ok(events.some((e) => e.startsWith("stomp:")), "harus memicu event stomp");
  assert.equal(enemy.alive, false, "musuh mati setelah diinjak");
  assert.ok(enemy.squashTimer > 0, "animasi gepeng aktif");
  assert.ok(s.vy < 0, "kurir memantul naik");
  assert.equal(s.hp, MAX_HP, "nyawa tidak berkurang saat menginjak");
});

test("sentuh Paket Bandel dari samping kurangi 1 hati dan aktifkan invuln + knockback", () => {
  const s = createState();
  const enemy = s.enemies[0];
  s.x = enemy.x - PLAYER.w + 8;
  s.y = enemy.y;
  s.grounded = true;
  const events = run(s, NONE, 1);
  assert.ok(events.some((e) => e.startsWith("hurt:")), "harus memicu hurt");
  assert.equal(s.hp, MAX_HP - 1);
  assert.ok(s.invuln > 0, "status kebal sementara aktif");
  assert.ok(s.knockbackTimer > 0, "knockback aktif");

  // Selama invuln, menyentuh musuh lagi tidak mengurangi HP
  const hpAfterFirstHit = s.hp;
  s.x = enemy.x - PLAYER.w + 8;
  s.y = enemy.y;
  run(s, NONE, 2);
  assert.equal(s.hp, hpAfterFirstHit);
});

test("lewati checkpoint lalu jatuh ke jurang respawn di checkpoint terakhir dengan -1 hati", () => {
  const s = createState();
  const cp1 = CHECKPOINTS[0];
  s.x = cp1.x - PLAYER.w / 2 + 4;
  s.y = cp1.y;
  const cpEvents = run(s, NONE, 1);
  assert.ok(cpEvents.includes(`checkpoint:${cp1.id}`));
  assert.equal(s.checkpointX, cp1.x - PLAYER.w / 2);

  // Jatuh ke jurang kedua
  s.x = 2200;
  s.y = WORLD.h + 40;
  s.vy = 10;
  const fallEvents = run(s, NONE, 1);
  assert.ok(fallEvents.includes("fall"));
  assert.equal(s.hp, MAX_HP - 1);
  assert.equal(s.x, cp1.x - PLAYER.w / 2);
  assert.equal(s.y, cp1.y);
  assert.ok(s.invuln > 0);
});

test("kehabisan 3 hati memicu state lost dan event gameover", () => {
  const s = createState();
  s.hp = 1;
  s.x = 980;
  s.y = WORLD.h + 40;
  s.vy = 10;
  const events = run(s, NONE, 1);
  assert.ok(events.includes("gameover"));
  assert.equal(s.hp, 0);
  assert.equal(s.lost, true);

  // Pastikan step berhenti memajukan dunia setelah lost
  const tFrozen = s.t;
  run(s, RIGHT, 5);
  assert.equal(s.t, tFrozen);
});

test("level 4800px dapat ditamatkan 100% hanya dengan lompat tunggal (tanpa double jump)", () => {
  const s = createState();
  let frames = 0;
  let holdJumpFrames = 0;

  while (!s.won && !s.lost && frames < 5000) {
    const px = s.x + PLAYER.w / 2;
    const mp = getMovingPlatformPos(MOVING_PLATFORMS[0], s.t);

    // Tunggu di tepi kanan Platform 3 (x~2445..2480) hingga platform bergerak mendekat
    const waitMoving =
      s.grounded &&
      s.y === 460 &&
      s.x + PLAYER.w >= 2445 &&
      s.x <= 2480 &&
      mp.x > 2535;

    // Tunggu di platform bergerak hingga cukup dekat dengan Platform 4
    const onMoving = s.grounded && s.y === 435;
    const waitExitMoving = onMoving && mp.x + mp.w < 2690;

    const nearChasmEdge =
      s.grounded &&
      CHASMS.some((c) => s.x + PLAYER.w >= c.x - 16 && s.x + PLAYER.w <= c.x + 12);

    const nearPlatformEdge =
      s.grounded &&
      s.y < WORLD.groundY &&
      ((s.x + PLAYER.w >= 2135 && s.x <= 2160) || // P2 -> P3
        (s.x + PLAYER.w >= 2450 && s.x <= 2480) || // P3 -> move-1
        (s.x + PLAYER.w >= 3735 && s.x <= 3760) || // P5 -> crumble-1
        (s.x + PLAYER.w >= 3950 && s.x <= 3975)); // crumble-1 -> P6

    const nearStepUp =
      s.grounded &&
      s.y === WORLD.groundY &&
      ((px >= 905 && px <= 945) || (px >= 1880 && px <= 1925) || (px >= 3510 && px <= 3555));

    const enemyAhead =
      s.grounded &&
      s.enemies.some(
        (e) =>
          e.alive &&
          Math.abs(e.y - s.y) < 30 &&
          e.x - (s.x + PLAYER.w) > 0 &&
          e.x - (s.x + PLAYER.w) < 62
      );

    const startJump =
      !waitMoving &&
      !waitExitMoving &&
      s.grounded &&
      (nearChasmEdge || nearPlatformEdge || nearStepUp || enemyAhead || (onMoving && !waitExitMoving));

    if (startJump) {
      holdJumpFrames = 18;
    } else if (s.grounded) {
      holdJumpFrames = 0;
    }

    const jump = holdJumpFrames > 0;
    if (holdJumpFrames > 0) holdJumpFrames--;

    step(s, { left: false, right: !waitMoving && !waitExitMoving, jump });
    frames++;
  }

  assert.equal(
    s.lost,
    false,
    `bot tidak boleh kehabisan nyawa (x=${s.x.toFixed(1)}, y=${s.y.toFixed(1)}, hp=${s.hp})`
  );
  assert.deepEqual([...s.collected].sort(), ["foto", "lagu", "surat"]);
  assert.equal(s.won, true, "level 4800px harus bisa ditamatkan murni dengan lompat tunggal");
  assert.ok(s.checkpointsReached.includes("cp-1"));
  assert.ok(s.checkpointsReached.includes("cp-2"));
  assert.ok(s.x >= START_POS.x);
});
