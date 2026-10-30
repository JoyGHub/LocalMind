# localmind-sidebar



<!-- Auto Generated Below -->


## Properties

| Property                     | Attribute        | Description | Type      | Default     |
| ---------------------------- | ---------------- | ----------- | --------- | ----------- |
| `collapsed`                  | `collapsed`      |             | `boolean` | `false`     |
| `models` _(required)_        | --               |             | `any[]`   | `undefined` |
| `ollamaRunning` _(required)_ | `ollama-running` |             | `boolean` | `undefined` |


## Events

| Event             | Description | Type                |
| ----------------- | ----------- | ------------------- |
| `modelsCardEvent` |             | `CustomEvent<void>` |
| `newChatEvent`    |             | `CustomEvent<void>` |
| `tempChatEvent`   |             | `CustomEvent<void>` |


## Dependencies

### Used by

 - [localmind-app](../localmind-app)

### Depends on

- [localmind-history](../localmind-history)
- [localmind-ollama-status](../localmind-ollama-status)
- [localmind-settings](../localmind-settings)
- [localmind-about-modal](../localmind-about-modal)

### Graph
```mermaid
graph TD;
  localmind-sidebar --> localmind-history
  localmind-sidebar --> localmind-ollama-status
  localmind-sidebar --> localmind-settings
  localmind-sidebar --> localmind-about-modal
  localmind-history --> localmind-rename-modal
  localmind-history --> localmind-delete-modal
  localmind-settings --> localmind-setting-tab
  localmind-settings --> localmind-settings-general
  localmind-settings --> localmind-settings-model
  localmind-settings --> localmind-settings-appearance
  localmind-settings --> localmind-settings-memories
  localmind-settings --> localmind-settings-tts
  localmind-app --> localmind-sidebar
  style localmind-sidebar fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
