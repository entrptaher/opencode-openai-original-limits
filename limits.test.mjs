import assert from "node:assert/strict"
import test from "node:test"
import { setup } from "./limits.mjs"
import plugin from "opencode-openai-original-limits"

function harness(options = {}) {
  const callbacks = []
  return {
    callbacks,
    ctx: {
      options,
      model: { async transform(callback) { callbacks.push(callback) } },
    },
    replay(models, sources) {
      const editor = {
        provider: { get: (id) => id === "openai" && sources ? { models: sources } : undefined },
        list: (id) => models.filter((model) => model.providerID === id),
        update(providerID, id, update) {
          const model = models.find((model) => model.providerID === providerID && model.id === id)
          assert.ok(model, "must update an existing candidate")
          update(model)
        },
      }
      for (const callback of callbacks) callback(editor)
    },
  }
}

const candidate = (id, modelID = id, providerID = "openai") => ({
  id, modelID, providerID, limit: { context: 10, input: 8, output: 2 },
  options: { serviceTier: "priority" }, enabled: true,
})
const source = (context, input, output) => Object.freeze({
  limit: Object.freeze({ context, input, output }),
})

test("package entrypoint exposes the plugin and registers a working transform", async () => {
  assert.equal(plugin.id, "openai-original-limits")
  assert.equal(plugin.setup, setup)
  const h = harness()
  await plugin.setup(h.ctx)
  assert.equal(h.callbacks.length, 1)
  const models = [candidate("base")]
  const sources = new Map([["base", source(1000, 800, 200)]])
  h.replay(models, sources)
  assert.deepEqual(models[0].limit, sources.get("base").limit)
})

test("restores full source limits, exact IDs before aliases, only for OpenAI", async () => {
  const h = harness({ enabled: true })
  await setup(h.ctx)
  const models = [candidate("base"), candidate("base-fast", "base"),
    candidate("exact", "base"), candidate("base", "base", "other"), candidate("missing")]
  const before = structuredClone(models)
  const sources = new Map([["base", source(1000, 800, 200)], ["exact", source(500, 400, 100)]])
  h.replay(models, sources)
  assert.deepEqual(models[0].limit, sources.get("base").limit)
  assert.deepEqual(models[1].limit, sources.get("base").limit)
  assert.deepEqual(models[2].limit, sources.get("exact").limit)
  assert.deepEqual(models.slice(3), before.slice(3))
  for (let i = 0; i < 3; i++) {
    assert.deepEqual({ ...models[i], limit: before[i].limit }, before[i])
  }
  assert.notEqual(models[0].limit, sources.get("base").limit)
  assert.notEqual(models[0].limit, models[1].limit)
  models[0].limit.context = 1
  assert.equal(sources.get("base").limit.context, 1000)
  assert.equal(models[1].limit.context, 1000)
})

test("explicit disable registers no transform", async () => {
  const h = harness({ enabled: false })
  await setup(h.ctx)
  assert.equal(h.callbacks.length, 0)
})

test("default enable replays against fresh sources and candidates", async () => {
  const h = harness()
  await setup(h.ctx)
  assert.equal(h.callbacks.length, 1)
  const first = [candidate("base")]
  h.replay(first, new Map([["base", source(100, 80, 20)]]))
  assert.equal(first[0].limit.context, 100)
  const refreshed = [candidate("base"), candidate("base-fast", "base")]
  h.replay(refreshed, new Map([["base", source(200, 160, 40)]]))
  assert.deepEqual(refreshed.map((model) => model.limit.context), [200, 200])
  assert.equal(h.callbacks.length, 1)
})

test("missing provider source is a no-op", async () => {
  const h = harness()
  await setup(h.ctx)
  const models = [candidate("base")]
  const before = structuredClone(models)
  h.replay(models, undefined)
  assert.deepEqual(models, before)
})
