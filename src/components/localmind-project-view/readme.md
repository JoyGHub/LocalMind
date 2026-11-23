# localmind-project-view



<!-- Auto Generated Below -->


## Properties

| Property                        | Attribute            | Description | Type                                   | Default     |
| ------------------------------- | -------------------- | ----------- | -------------------------------------- | ----------- |
| `isWritingAnswer` _(required)_  | `is-writing-answer`  |             | `boolean`                              | `undefined` |
| `models` _(required)_           | --                   |             | `OllamaModel[]`                        | `undefined` |
| `ollamaRunning` _(required)_    | `ollama-running`     |             | `boolean`                              | `undefined` |
| `requestIsPending` _(required)_ | `request-is-pending` |             | `boolean`                              | `undefined` |
| `selectedModel` _(required)_    | --                   |             | `OllamaModel`                          | `undefined` |
| `thinkingLevel`                 | `thinking-level`     |             | `"high" \| "low" \| "medium" \| "off"` | `'off'`     |


## Events

| Event                     | Description | Type                |
| ------------------------- | ----------- | ------------------- |
| `conversationChangeEvent` |             | `CustomEvent<void>` |


## Dependencies

### Used by

 - [localmind-app](../localmind-app)

### Depends on

- [localmind-composer](../localmind-composer)
- [localmind-rename-modal](../localmind-rename-modal)
- [localmind-delete-modal](../localmind-delete-modal)
- [localmind-project-sources-modal](../localmind-project-sources-modal)

### Graph
```mermaid
graph TD;
  localmind-project-view --> localmind-composer
  localmind-project-view --> localmind-rename-modal
  localmind-project-view --> localmind-delete-modal
  localmind-project-view --> localmind-project-sources-modal
  localmind-composer --> localmind-welcome
  localmind-composer --> localmind-attached-files
  localmind-project-sources-modal --> localmind-project-source-entry-modal
  localmind-app --> localmind-project-view
  style localmind-project-view fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
