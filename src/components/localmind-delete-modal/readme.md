# localmind-delete-modal



<!-- Auto Generated Below -->


## Properties

| Property     | Attribute     | Description | Type                          | Default          |
| ------------ | ------------- | ----------- | ----------------------------- | ---------------- |
| `entityType` | `entity-type` |             | `"conversation" \| "project"` | `'conversation'` |
| `open`       | `open`        |             | `boolean`                     | `false`          |


## Events

| Event                  | Description | Type                                                 |
| ---------------------- | ----------- | ---------------------------------------------------- |
| `deleteConfirm`        |             | `CustomEvent<string>`                                |
| `projectDeleteConfirm` |             | `CustomEvent<{ id: string; deleteChats: boolean; }>` |


## Methods

### `hide() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `show(id: string, name: string) => Promise<void>`



#### Parameters

| Name   | Type     | Description |
| ------ | -------- | ----------- |
| `id`   | `string` |             |
| `name` | `string` |             |

#### Returns

Type: `Promise<void>`




## Dependencies

### Used by

 - [localmind-history](../localmind-history)
 - [localmind-project-view](../localmind-project-view)
 - [localmind-sidebar](../localmind-sidebar)

### Graph
```mermaid
graph TD;
  localmind-history --> localmind-delete-modal
  localmind-project-view --> localmind-delete-modal
  localmind-sidebar --> localmind-delete-modal
  style localmind-delete-modal fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
