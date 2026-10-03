# OpenAI original limits

A dependency-free **OpenCode V2 only** plugin that restores each OpenAI model's
complete `limit` object from OpenCode's OpenAI source catalog, including context,
input, and output limits. No model names or limit values are hardcoded.

## Install

If you already registered a local copy, remove its existing configuration entry
before installing this package to avoid duplicate installation. Also remove any
auto-loaded copy from your plugin directory.

```sh
opencode plugin add github:entrptaher/opencode-openai-original-limits
```

## Behavior

- Only models belonging to the `openai` provider are changed.
- The candidate's ID is matched first, then its underlying `modelID`, supporting
  aliases such as fast variants.
- Models with no matching source are left unchanged. A missing OpenAI source
  provider is a no-op.
- Catalog refreshes replay the transform using fresh source definitions.
- The full source `limit` object is copied; other model properties are preserved.

Restoration may override manually configured limits. Other transforms applied
later can override these restored values. Source catalog limits are **not a
guarantee** that your account or backend accepts that context, input, or output size.

## Disable or remove

To disable by plugin ID, add the native V2 disable entry to your existing
`plugins` array in `opencode.json(c)`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["-openai-original-limits"]
}
```

Alternatively, change the installed package entry to pass `enabled: false`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "github:entrptaher/opencode-openai-original-limits",
      "options": { "enabled": false }
    }
  ]
}
```

Merge these examples into your configuration rather than replacing unrelated
settings. The plugin is enabled by default when installed.

To remove the package registration:

```sh
opencode plugin remove github:entrptaher/opencode-openai-original-limits
```

## Tests

From this repository, run the dependency-free checks (no install needed):

```sh
npm test
```

Reference: [OpenCode V2 plugins](https://opencode.ai/v2/docs/build/plugins).
