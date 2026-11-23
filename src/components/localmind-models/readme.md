# localmind-models



<!-- Auto Generated Below -->


## Properties

| Property | Attribute | Description | Type            | Default |
| -------- | --------- | ----------- | --------------- | ------- |
| `models` | --        |             | `OllamaModel[]` | `[]`    |
| `open`   | `open`    |             | `boolean`       | `false` |


## Events

| Event                | Description | Type               |
| -------------------- | ----------- | ------------------ |
| `modelsUpdatedEvent` |             | `CustomEvent<any>` |


## Methods

### `hide() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `show() => Promise<void>`



#### Returns

Type: `Promise<void>`




## Dependencies

### Used by

 - [localmind-app](../localmind-app)

### Depends on

- [localmind-model-overview](.)
- [localmind-model-table](.)
- [localmind-model-download-section](.)
- [localmind-model-delete-dialog](.)

### Graph
```mermaid
graph TD;
  localmind-models --> localmind-model-overview
  localmind-models --> localmind-model-table
  localmind-models --> localmind-model-download-section
  localmind-models --> localmind-model-delete-dialog
  localmind-app --> localmind-models
  style localmind-models fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
