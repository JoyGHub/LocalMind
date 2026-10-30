# localmind-message-share-card



<!-- Auto Generated Below -->


## Properties

| Property               | Attribute | Description | Type      | Default     |
| ---------------------- | --------- | ----------- | --------- | ----------- |
| `message` _(required)_ | --        |             | `Message` | `undefined` |
| `open`                 | `open`    |             | `boolean` | `false`     |


## Events

| Event    | Description | Type                |
| -------- | ----------- | ------------------- |
| `closed` |             | `CustomEvent<void>` |


## Methods

### `hide() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `show() => Promise<void>`



#### Returns

Type: `Promise<void>`




## Dependencies

### Used by

 - [localmind-message-actions](../localmind-message-actions)

### Graph
```mermaid
graph TD;
  localmind-message-actions --> localmind-message-share-card
  style localmind-message-share-card fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
