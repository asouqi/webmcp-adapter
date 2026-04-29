# WebMCP Adapter

WebMCP Adapter is a lightweight utility designed to register, validate, and manage tool lifecycles within the `navigator.modelContext` environment. By leveraging the official [@mcp-b/webmcp-types](https://github.com/WebMCP-org/npm-packages) for its type system, the library automatically infers TypeScript argument types directly from your JSON schemas. This ensures your tools remain strictly compliant with the Model Context Protocol while providing a seamless, "zero-config" developer experience for modern web AI applications.
## 🚀 Installation

```bash
npm install webmcp-adapter
# or
yarn add webmcp-adapter
```

## 🛠 API Reference

### `defineTool(config)`
A type-safe helper to create a tool definition. It does not register the tool but ensures the `execute` handler receives the correct types based on the `schema`.

### `registerTool(tool)`
Registers a single tool with the `navigator.modelContext` environment.
- **Returns**: A cleanup function `() => void`. Calling this function will unregister that specific tool.

### `registerBatch(tools)`
Registers an array of tools simultaneously.
- **Returns**: A single cleanup function that unregisters all tools in the batch.

### `unregisterTool(name)`
Unregisters a specific tool by its string name. Returns `true` if the tool was found and removed.

### `unregisterAllTools()`
A global reset that removes every tool registered via this adapter. Useful for logout or page-transition scenarios.

### `isWebMCPSupported()`
A utility function that returns `true` if the current environment (browser/extension) supports the `navigator.modelContext` API.


Here is the Quick Start section isolated in a single Markdown block for you:
Markdown

## Quick Start

The `defineTool` function is the heart of the library. When you define a `schema`, the `execute` function automatically knows the shape of its arguments.

### Define and Register a Tool

```typescript
import { defineTool, registerTool } from 'webmcp-adapter';

// 1. Define your tool logic and schema
const calculateTool = defineTool({
  name: "calculate_area",
  description: "Calculates the area of a rectangle",
  schema: {
    type: "object",
    properties: {
      width: { type: "number" },
      height: { type: "number" }
    },
    required: ["width", "height"]
  },
  execute: async (args) => {
    // 'args' is automatically typed as { width: number; height: number }
    const area = args.width * args.height;
    return {
      content: [{ type: "text", text: `The area is ${area}` }]
    };
  }
});

// 2. Register the tool with the browser
const unregister = registerTool(calculateTool);

// 3. Unregister whenever you're done (e.g., on component unmount)
// unregister();