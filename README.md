# WebMCP Adapter

A lightweight utility designed to register, validate, and manage tool lifecycles within the `navigator.modelContext` environment. By leveraging the official [@mcp-b/webmcp-types](https://github.com/mcp-b/webmcp-types), it provides a type-safe, framework-agnostic way to expose browser-side tools to AI models.

## 🧠 What is WebMCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) is an open standard that enables AI models to securely connect to local and remote tools. [WebMCP](https://webmcp.dev/) brings this protocol directly into the browser — letting web applications expose tools to AI models via `navigator.modelContext`.

## 🚀 Installation

```bash
npm install webmcp-adapter
# or
yarn add webmcp-adapter
```

---

## 🛠 API Reference

### `defineTool(config)`

A type-safe helper to create a tool definition. Does not register the tool — it just ensures the `execute` handler receives the correct types based on `inputSchema`.

```typescript
import { defineTool } from 'webmcp-adapter'

const calculateTool = defineTool({
  name: 'calculate_area',
  description: 'Calculates the area of a rectangle',
  inputSchema: {
    type: 'object',
    properties: {
      width: { type: 'number' },
      height: { type: 'number' }
    },
    required: ['width', 'height']
  },
  execute: ({ width, height }) => {
    // 'width' and 'height' are fully typed as number
    return {
      content: [{ type: 'text', text: `The area is ${width * height}` }]
    }
  }
})
```

---

### `registerTool(tool)`

Registers a single tool with `navigator.modelContext`. The `execute` function is automatically wrapped with validation and error handling.

- **Returns**: A cleanup function `() => void` to unregister that specific tool.
- **Silent no-op** if WebMCP is not supported in the current environment.

```typescript
import { defineTool, registerTool } from 'webmcp-adapter'

const tool = defineTool({ ... })
const unregister = registerTool(tool)

// Later, to clean up:
unregister()
```

---

### `registerBatch(tools)`

Registers an array of tools simultaneously and returns a single cleanup function.

- **Returns**: A single `() => void` that unregisters all tools in the batch.

```typescript
import { defineTool, registerBatch } from 'webmcp-adapter'

const searchTool = defineTool({ name: 'search_products', ... })
const cartTool = defineTool({ name: 'add_to_cart', ... })
const checkoutTool = defineTool({ name: 'checkout', ... })

const unregisterAll = registerBatch([searchTool, cartTool, checkoutTool])

// Later, to clean up all three:
unregisterAll()
```

```typescript
// React usage
useEffect(() => {
  const unregister = registerBatch([searchTool, cartTool, checkoutTool])
  return unregister // Cleanup on unmount
}, [])
```

---

### `unregisterTool(name)`

Unregisters a specific tool by its string name.

- **Returns**: `true` if the tool was found and removed, `false` otherwise.

```typescript
import { unregisterTool } from 'webmcp-adapter'

unregisterTool('calculate_area') // true
unregisterTool('unknown_tool')   // false
```

---

### `unregisterAllTools()`

A global reset that removes every tool registered through this adapter. Useful for logout or page-transition scenarios.

```typescript
import { unregisterAllTools } from 'webmcp-adapter'

// On page unload
window.addEventListener('beforeunload', () => {
  unregisterAllTools()
})

// On user logout
function handleLogout() {
  unregisterAllTools()
  // ... other cleanup
}
```

---

### `hasTool(name)`

Checks whether a tool with the given name is currently registered.

- **Returns**: `true` if the tool is registered, `false` otherwise.
- Useful for **conditional registration** — avoids re-registering a tool that is already active, e.g. when user state or cart state changes.

```typescript
import { hasTool, registerTool } from 'webmcp-adapter'

if (!hasTool('checkout_form')) {
  registerTool(checkoutTool)
}
```

---

### `getRegisteredTools()`

Returns the names of all tools currently registered through this adapter as a `string[]`.

Useful for debugging, logging, or verifying which tools are active at any point in the application lifecycle.

```typescript
import { getRegisteredTools } from 'webmcp-adapter'

console.log(getRegisteredTools())
// ['search_products', 'add_to_cart', 'checkout_form']
```

```typescript
// Verify tools registered after a batch
registerBatch([searchTool, cartTool, checkoutTool])
console.log(getRegisteredTools().length) // 3
```

---

### `isWebMCPSupported()`

Returns `true` if the current environment supports the `navigator.modelContext` API.

```typescript
import { isWebMCPSupported } from 'webmcp-adapter'

if (isWebMCPSupported()) {
  registerTool(myTool)
} else {
  console.warn('WebMCP is not available in this environment')
}
```

---

## 🛡️ Runtime Validation

The browser's native WebMCP API (`navigator.modelContext.registerTool`) performs only basic JSON Schema validation. `webmcp-adapter` adds an **additional validation layer** on top — wrapping every tool's `execute` function so that input is validated more thoroughly before your code ever runs.

When validation fails, instead of the model receiving a generic error, it gets a structured `isError: true` response with field-level details. This allows the AI to see exactly which fields failed and why, correct its input, and retry — rather than simply crashing.

Additionally, the adapter natively supports [Standard Schema](https://github.com/standard-schema/standard-schema), meaning you can use libraries like **Zod** or **Valibot** to enforce strict constraints (like regex, emails, or custom cross-field logic) that basic JSON Schema cannot handle.

### 1. Built-in JSON Schema validation (default)

If no `validator` is provided, the adapter validates input against the `inputSchema` using a lightweight built-in validator. It covers:

- Type checking (`string`, `number`, `boolean`, `array`, `object`, `null`)
- String constraints: `minLength`, `maxLength`, `pattern`, `enum`
- Number constraints: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`
- Array constraints: `minItems`, `maxItems`, `items`
- Object constraints: `required`, `properties`
- Composites: `oneOf`, `anyOf`, `allOf`, `if/then/else`

```typescript
import { defineTool, registerTool } from 'webmcp-adapter'

const calculateTool = defineTool({
  name: 'calculate_area',
  description: 'Calculates the area of a rectangle',
  inputSchema: {
    type: 'object',
    properties: {
      width: { type: 'number', minimum: 0 },
      height: { type: 'number', minimum: 0 }
    },
    required: ['width', 'height']
  },
  // No validator provided — built-in JSON Schema validation runs automatically
  execute: ({ width, height }) => {
    return {
      content: [{ type: 'text', text: `The area is ${width * height}` }]
    }
  }
})

registerTool(calculateTool)
```

### 2. Standard Schema validation (Zod, Valibot, ArkType)

Pass any [Standard Schema](https://github.com/standard-schema/standard-schema)-compatible library via the `validator` option for strict runtime validation. When provided, this **replaces** the built-in JSON Schema validation.

Use this when you need constraints that JSON Schema cannot express — such as regex patterns, email formats, cross-field rules, or custom `refine` logic.

```typescript
import { defineTool, registerTool } from 'webmcp-adapter'
import { z } from 'zod'

const schema = z.object({
  width: z.number().positive('Width must be a positive number'),
  height: z.number().positive('Height must be a positive number')
})

const calculateTool = defineTool({
  name: 'calculate_area',
  description: 'Calculates the area of a rectangle',
  inputSchema: {
    type: 'object',
    properties: {
      width: { type: 'number' },
      height: { type: 'number' }
    },
    required: ['width', 'height']
  },
  validator: schema,  // ← Zod schema replaces built-in validation
  execute: ({ width, height }) => {
    // Reaches here only if Zod validation passed
    return {
      content: [{ type: 'text', text: `The area is ${width * height}` }]
    }
  }
})

registerTool(calculateTool)
```

### Validation error response

When validation fails the adapter returns a structured response back to the AI model so it can correct its input and retry:

```typescript
// Validation failure — AI should fix input and retry
{
  content: [{ type: 'text', text: 'Validation error: width: Expected number, got string' }],
  isError: true,
  structuredContent: {
    success: false,
    validationFailed: true,                          // ← input was invalid, not a crash
    error: 'width: Expected number, got string',     // top-level summary
    errors: {
      width: 'Expected number, got string'           // field-keyed for targeted correction
    }
  }
}
```

Compare this to a **runtime error** (an exception thrown inside `execute`), which has `validationFailed: false`:

```typescript
// Runtime crash — retrying with the same input won't help
{
  content: [{ type: 'text', text: 'Error: Something went wrong' }],
  isError: true,
  structuredContent: {
    success: false,
    validationFailed: false,     // ← something crashed, not a validation issue
    error: 'Something went wrong',
    errors: {}
  }
}
```

The `validationFailed` flag lets the model distinguish between **"fix your input and retry"** vs **"something crashed on the server side"**.

## 🔧 Validation Utilities

These are exported for use in higher-level libraries (e.g. `webmcp-forms`) that need to run validation outside of the tool registration flow.

### `validateJsonSchema(schema, input)`

Validates `input` against a JSON Schema object. Returns a `ValidationResult`.

```typescript
import { validateJsonSchema } from 'webmcp-adapter'

const result = validateJsonSchema(
  { type: 'string', minLength: 3 },
  'hi'
)
// { valid: false, error: 'String must be at least 3 characters, got 2' }
```

### `validateWithStandardSchema(schema, input)`

Validates `input` against a Standard Schema (Zod, Valibot, etc.). Returns a `Promise<ValidationResult>` with a full field-keyed `errors` map.

- Issues with a `path` are keyed by `path.join('.')` (e.g. `"address.zip"`)
- Issues with no path (top-level `refine`, cross-field rules) are keyed under `_form`

```typescript
import { validateWithStandardSchema } from 'webmcp-adapter'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18)
})

const result = await validateWithStandardSchema(schema, { email: 'bad', age: 16 })
// {
//   valid: false,
//   error: 'email: Invalid email, age: Number must be greater than or equal to 18',
//   errors: {
//     email: 'Invalid email',
//     age: 'Number must be greater than or equal to 18'
//   }
// }
```

### `isStandardSchema(value)`

Type guard that returns `true` if `value` implements the Standard Schema interface. Used internally to detect Zod, Valibot, and ArkType validators.

```typescript
import { isStandardSchema } from 'webmcp-adapter'
import { z } from 'zod'

isStandardSchema(z.object({ name: z.string() })) // true
isStandardSchema({ type: 'object' })              // false — plain JSON Schema
```

---

## 📦 Exported Types

```typescript
// From @mcp-b/webmcp-types
export type { InputSchema, JsonValue, ToolResponse }

// From webmcp-adapter
export type { ToolDefinition, ToolConfig, UnregisterFn, ValidationResult, StandardSchema }
```

### `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean
  error?: string                   // top-level summary string
  errors?: Record<string, string>  // field-keyed errors map
}
```

### `ToolConfig`

```typescript
interface ToolConfig<TSchema extends InputSchema = InputSchema> {
  name: string
  description: string
  inputSchema: InputSchema
  annotations?: ToolAnnotations
  validator?: StandardSchema       // optional Zod/Valibot/ArkType schema
  execute: (input: InferArgsFromInputSchema<TSchema>) => Promise<ToolResponse> | ToolResponse
}
```

### `ToolDefinition`

The normalized, readonly shape returned by `defineTool()` and consumed by `registerTool()` / `registerBatch()`.

```typescript
interface ToolDefinition<TSchema extends InputSchema = InputSchema> {
  readonly name: string
  readonly description: string
  readonly inputSchema: TSchema
  readonly annotations: ToolAnnotations
  readonly validator?: StandardSchema
  readonly execute: (input: InferArgsFromInputSchema<TSchema>) => Promise<ToolResponse> | ToolResponse
}
```