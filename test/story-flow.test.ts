import test from "node:test";
import assert from "node:assert/strict";
import {
  STORY_GAMES,
  storyGameFor,
  storyStepCount,
  isStoryFinished,
  nextStage,
} from "../lib/story.ts";

test("game per kategori", () => {
  assert.equal(storyGameFor("ungkapan-sayang"), "collect");
  assert.equal(storyGameFor("birthday"), "hold");
  assert.equal(storyGameFor("anniversary"), null);
  assert.equal(storyGameFor("permintaan-maaf"), null);
  assert.equal(storyGameFor(undefined), null);
});

test("semua kategori punya entri", () => {
  assert.deepEqual(Object.keys(STORY_GAMES).sort(), [
    "anniversary",
    "birthday",
    "permintaan-maaf",
    "ungkapan-sayang",
  ]);
});

test("jumlah tahap mengikuti adanya game", () => {
  assert.equal(storyStepCount("collect"), 2);
  assert.equal(storyStepCount("hold"), 2);
  assert.equal(storyStepCount(null), 1);
});

test("tahap tidak bisa melompati total", () => {
  assert.equal(nextStage(0, 2), 1);
  assert.equal(nextStage(1, 2), 2);
  assert.equal(nextStage(2, 2), 2);
  assert.equal(nextStage(-1, 2), 0);
  assert.equal(nextStage(0, 1), 1);
});

test("story selesai hanya saat stage >= total", () => {
  assert.equal(isStoryFinished(0, 2), false);
  assert.equal(isStoryFinished(1, 2), false);
  assert.equal(isStoryFinished(2, 2), true);
  assert.equal(isStoryFinished(1, 1), true);
});
