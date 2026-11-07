import test from "node:test";
import assert from "node:assert/strict";
import {
  filterPosts,
  journalPosts,
  findPost,
  postHref,
} from "../src/data/journal.js";

test("eight complete entries have unique, addressable routes and photograph descriptions", () => {
  assert.equal(journalPosts.length, 8);
  assert.equal(new Set(journalPosts.map(postHref)).size, 8);
  for (const post of journalPosts) {
    assert.equal(findPost(post.slug), post);
    assert.match(postHref(post), /^\/concept\/journal\/[a-z0-9-]+$/);
    assert.equal(post.images.length, 5);
    assert.ok(post.opening.length >= 2 && post.ending.length > 30);
    for (const photo of [post.cover, ...post.images]) {
      assert.ok(photo.alt && photo.caption && photo.width && photo.height);
    }
    assert.doesNotMatch(
      JSON.stringify(post),
      /[—–]|lorem ipsum|goes here|can go here/i,
    );
  }
});

test("search finds place names, titles and words within the entry, ignoring case and spacing", () => {
  assert.deepEqual(
    filterPosts("  SIKKIM  ").map((p) => p.slug),
    ["a-few-days-in-the-hills"],
  );
  assert.deepEqual(
    filterPosts("Delhi").map((p) => p.slug),
    ["a-walk-through-delhi"],
  );
  assert.deepEqual(
    filterPosts("flower market").map((p) => p.slug),
    ["the-flower-market-before-noon"],
  );
  assert.ok(
    filterPosts("courtyard").some((p) => p.slug === "a-walk-through-delhi"),
  );
  assert.equal(filterPosts("not-a-place-in-this-journal").length, 0);
});

test("subject and search filters intersect and resetting exposes the whole catalog", () => {
  assert.equal(filterPosts("", "Kolkata").length, 6);
  assert.equal(filterPosts("Sikkim", "Kolkata").length, 0);
  assert.deepEqual(
    filterPosts("long way home", "Kolkata").map((p) => p.slug),
    ["i-took-the-long-way-home"],
  );
  assert.deepEqual(
    filterPosts("", "Delhi").map((p) => p.slug),
    ["a-walk-through-delhi"],
  );
  assert.deepEqual(
    filterPosts("Sikkim", "Travel").map((p) => p.slug),
    ["a-few-days-in-the-hills"],
  );
  assert.equal(filterPosts("  ", "All").length, 8);
});
