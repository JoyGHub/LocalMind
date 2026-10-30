# localmind-rename-modal



<!-- Auto Generated Below -->


## Properties

| Property | Attribute | Description | Type      | Default |
| -------- | --------- | ----------- | --------- | ------- |
| `open`   | `open`    |             | `boolean` | `false` |


## Events

| Event           | Description | Type                                            |
| --------------- | ----------- | ----------------------------------------------- |
| `renameConfirm` |             | `CustomEvent<{ id: string; newName: string; }>` |


## Methods

### `hide() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `show(id: string, currentName: string) => Promise<void>`



#### Parameters

| Name          | Type     | Description |
| ------------- | -------- | ----------- |
| `id`          | `string` |             |
| `currentName` | `string` |             |

#### Returns

Type: `Promise<void>`




## Dependencies

### Used by

 - [localmind-history](../localmind-history)

### Graph
```mermaid
graph TD;
  localmind-history --> localmind-rename-modal
  style localmind-rename-modal fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
