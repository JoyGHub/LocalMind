# localmind-history



<!-- Auto Generated Below -->


## Events

| Event                     | Description | Type                |
| ------------------------- | ----------- | ------------------- |
| `conversationChangeEvent` |             | `CustomEvent<void>` |
| `projectChangeEvent`      |             | `CustomEvent<void>` |


## Dependencies

### Used by

 - [localmind-sidebar](../localmind-sidebar)

### Depends on

- [localmind-rename-modal](../localmind-rename-modal)
- [localmind-delete-modal](../localmind-delete-modal)
- [localmind-move-to-project-modal](../localmind-move-to-project-modal)

### Graph
```mermaid
graph TD;
  localmind-history --> localmind-rename-modal
  localmind-history --> localmind-delete-modal
  localmind-history --> localmind-move-to-project-modal
  localmind-sidebar --> localmind-history
  style localmind-history fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
