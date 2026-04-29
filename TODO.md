# 📝 WebMCP Adapter TODOs

## 🔴  (State & Observability)
These features are critical for developers building dynamic applications (like React/Vue) on top of the adapter.

- [ ] **Implement `hasTool(name: string): boolean`**
    - *Why:* Allows developers and higher-level libraries to check if a tool is already registered before trying to mount it, preventing duplicate registration errors during Hot Module Replacement (HMR) or React Strict Mode.
- [ ] **Implement `getRegisteredTools(): ToolDefinition[]` (or string[])**
    - *Why:* Provides a way to inspect the current state. Essential for building UI components that show users which AI tools are currently active.

## 🟡 (Execution & Middleware)
These features improve the user experience and give developers more control over how tools run.

- [ ] **Add Global Execution Hooks (`onToolExecutionStart`, `onToolExecutionEnd`)**
    - *Why:* Allows developers to easily trigger global loading spinners or UI updates whenever the AI is actively using a tool, without having to hardcode state into every single tool's `execute` function.
- [ ] **Add Abort / Timeout Support**
    - *Why:* Pass an `AbortSignal` to the `execute` function. If a tool makes a slow network request, the browser or the AI needs a way to cancel the execution so it doesn't hang indefinitely.
- [ ] **Implement Context Injection**
    - *Why:* Create a standardized way to pass shared context (like User IDs, auth tokens, or database instances) into tools, avoiding the need for global variables in the tool definitions.

## 🟢 (Future WebMCP Spec Expansion)
Features to add once the core Tool lifecycle is perfectly stable and the browser `navigator.modelContext` API matures.

- [ ] **Implement `defineResource()` / `registerResource()`**
    - *Why:* Expands adapter to support the WebMCP "Resources" primitive (exposing local browser state or files to the AI).
- [ ] **Implement `definePrompt()` / `registerPrompt()`**
    - *Why:* Expands adapter to support the WebMCP "Prompts" primitive (providing predefined UI prompt templates to the AI).