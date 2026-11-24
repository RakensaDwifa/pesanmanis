import test from "node:test";
import assert from "node:assert/strict";
import {
  CHASMS,
  CHECKPOINTS,
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

test("apex lompat cukup untuk tanjakan 90px", () => {
  const s = createState();
  run(s, HOLD, 1);
  assert.ok(s.vy < 0, "frame pertama harus naik");
  let top = s.y;
  for (let i = 0; i < 60 && s.vy < 0; i++) {
    step(s, HOLD);
    top = Math.min(top, s.y);
  }
  const apex = WORLD.groundY - top;
  assert.ok(apex > 90 && apex < 105, `apex ${apex.toFixed(1)}px di luar 90–105`);
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
  assert.equal(s.y, 470);
  assert.equal(s.grounded, true);
});

test("foto diambil saat pemain menyentuhnya", () => {
  const s = createState();
  const foto = MOMENTS[0];
  s.x = foto.x - PLAYER.w / 2;
  s.y = 470;
  const events = run(s, NONE, 1);
  assert.deepEqual(s.collected, ["foto"]);
  assert.ok(events.includes("collect:foto"));
});

test("kejutan tidak bisa diambil dua kali", () => {
  const s = createState();
  const foto = MOMENTS[0];
  s.x = foto.x - PLAYER.w / 2;
  s.y = 470;
  const events = run(s, NONE, 30);
  assert.equal(s.collected.filter((id) => id === "foto").length, 1);
  assert.equal(events.filter((e) => e === "collect:foto").length, 1);
});

test("pintu terkunci sampai tiga kejutan terkumpul", () => {
  const s = createState();
  s.x = DOOR.x + 20;
  s.y = WORLD.groundY;
  s.collected = ["foto", "lagu"];
  run(s, NONE, 1);
  assert.equal(canDeliver(s), false);
  assert.equal(s.won, false);

  s.collected = ["foto", "lagu", "surat"];
  const events = run(s, NONE, 1);
  assert.equal(s.won, true);
  assert.ok(events.includes("win"));
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

test("double jump memberi dorongan lompatan kedua di udara", () => {
  const s = createState();
  // Lompat pertama
  step(s, { left: false, right: false, jump: true });
  assert.equal(s.hasJumped, true);
  assert.equal(s.jumpsLeft, 1);

  // Tunggu beberapa frame sampai kecepatan ke atas melambat
  for (let i = 0; i < 8; i++) {
    step(s, { left: false, right: false, jump: false });
  }

  // Lompat kedua (double jump)
  const events = step(s, { left: false, right: false, jump: true });
  assert.ok(events.includes("doublejump"));
  assert.equal(s.jumpsLeft, 0);
  assert.ok(s.vy < -9, "lompatan kedua harus memberikan dorongan ke atas");
});

test("papan loncat (trampolin) melontarkan kurir tinggi ke udara", () => {
  const s = createState();
  s.x = SPRINGBOARDS[0].x;
  s.y = 540;
  s.vy = 5;
  const events = step(s, { left: false, right: false, jump: false });
  assert.ok(events.includes("bounce"));
  assert.ok(s.vy < -15, "lontaran trampolin harus sangat tinggi");
  assert.equal(s.jumpsLeft, 1, "masih bisa double jump setelah membal");
});

test("platform runtuh goyang lalu jatuh setelah diinjak", () => {
  const s = createState();
  s.x = CRUMBLE_PLATFORMS[0].x + 10;
  s.y = CRUMBLE_PLATFORMS[0].y;
  s.vy = 2;
  step(s, { left: false, right: false, jump: false });
  assert.equal(s.grounded, true);
  assert.ok(s.crumbleTimers[0] > 0, "timer runtuh harus aktif saat diinjak");

  // Tunggu 40 frame sampai platform runtuh
  for (let i = 0; i < 40; i++) {
    step(s, { left: false, right: false, jump: false });
  }
  assert.ok(s.crumbleTimers[0] >= 35, "platform sudah runtuh");
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

test("level 4800px dengan jurang dan platform bisa diselesaikan", () => {
  const s = createState();
  let frames = 0;
  while (!s.won && !s.lost && frames < 5000) {
    const px = s.x + PLAYER.w / 2;
    const mp = getMovingPlatformPos(MOVING_PLATFORMS[0], s.t);

    // Tunggu di tepi kanan Platform 3 (x~2380..2420) hingga platform bergerak mendekat
    const waitMoving =
      s.grounded &&
      s.y === 450 &&
      s.x + PLAYER.w >= 2385 &&
      s.x <= 2420 &&
      mp.x > 2475;

    // Tunggu di tepi kanan Platform bergerak hingga dekat Platform 4
    const onMoving = s.grounded && s.y === 400;
    const waitExitMoving = onMoving && mp.x + mp.w < 2610;

    const overChasm = CHASMS.some((c) => s.x + PLAYER.w > c.x && s.x < c.x + c.w);
    const nearChasmEdge =
      s.grounded &&
      CHASMS.some((c) => s.x + PLAYER.w >= c.x - 18 && s.x + PLAYER.w <= c.x + 12);
    const nearPlatformEdge =
      s.grounded &&
      s.y < WORLD.groundY &&
      ((s.x + PLAYER.w >= 2115 && s.x <= 2140) ||
        (s.x + PLAYER.w >= 2395 && s.x <= 2420) ||
        (s.x + PLAYER.w >= 3725 && s.x <= 3750) ||
        (s.x + PLAYER.w >= 3925 && s.x <= 3950));
    const nearStepUp =
      s.grounded &&
      s.y === WORLD.groundY &&
      ((px >= 890 && px <= 930) || (px >= 1860 && px <= 1905) || (px >= 3460 && px <= 3495));
    const enemyAhead =
      s.grounded &&
      s.enemies.some(
        (e) =>
          e.alive &&
          Math.abs(e.y - s.y) < 30 &&
          e.x - (s.x + PLAYER.w) > 0 &&
          e.x - (s.x + PLAYER.w) < 62
      );
    const needDoubleJump =
      !s.grounded &&
      s.jumpsLeft > 0 &&
      s.vy > 0 &&
      (overChasm || s.y > 460);

    const wantJump =
      !waitMoving &&
      !waitExitMoving &&
      (nearChasmEdge ||
        nearPlatformEdge ||
        nearStepUp ||
        enemyAhead ||
        needDoubleJump ||
        (onMoving && !waitExitMoving));

    const jump = wantJump && !s.jumpHeld;
    step(s, { left: false, right: !waitMoving && !waitExitMoving, jump });
    frames++;
  }
  assert.equal(s.lost, false, `bot tidak boleh kehabisan nyawa (x=${s.x.toFixed(1)}, y=${s.y.toFixed(1)}, hp=${s.hp})`);
  assert.deepEqual([...s.collected].sort(), ["foto", "lagu", "surat"]);
  assert.equal(s.won, true, "level 4800px harus bisa ditamatkan");
  assert.ok(s.checkpointsReached.includes("cp-1"));
  assert.ok(s.checkpointsReached.includes("cp-2"));
  assert.ok(s.x >= START_POS.x);
});
