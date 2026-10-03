export async function setup(ctx) {
  if (ctx.options.enabled === false) return

  await ctx.model.transform((editor) => {
    const sources = editor.provider.get("openai")?.models
    if (!sources) return

    for (const model of editor.list("openai")) {
      const source = sources.get(model.id) ?? sources.get(model.modelID)
      if (!source) continue
      editor.update("openai", model.id, (draft) => {
        draft.limit = { ...source.limit }
      })
    }
  })
}
