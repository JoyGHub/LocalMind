# localmind-settings



<!-- Auto Generated Below -->


## Properties

| Property                     | Attribute        | Description | Type      | Default     |
| ---------------------------- | ---------------- | ----------- | --------- | ----------- |
| `models` _(required)_        | --               |             | `any[]`   | `undefined` |
| `ollamaRunning` _(required)_ | `ollama-running` |             | `boolean` | `undefined` |
| `open`                       | `open`           |             | `boolean` | `false`     |


## Methods

### `hide() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `show() => Promise<void>`



#### Returns

Type: `Promise<void>`




## Dependencies

### Used by

 - [localmind-sidebar](../localmind-sidebar)

### Depends on

- [localmind-setting-tab](localmind-setting-tab)
- [localmind-settings-general](localmind-settings-general)
- [localmind-settings-model](localmind-settings-model)
- [localmind-settings-appearance](localmind-settings-appearance)
- [localmind-settings-memories](localmind-settings-memories)
- [localmind-settings-tts](localmind-settings-tts)

### Graph
```mermaid
graph TD;
  localmind-settings --> localmind-setting-tab
  localmind-settings --> localmind-settings-general
  localmind-settings --> localmind-settings-model
  localmind-settings --> localmind-settings-appearance
  localmind-settings --> localmind-settings-memories
  localmind-settings --> localmind-settings-tts
  localmind-sidebar --> localmind-settings
  style localmind-settings fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
