import type { ModelContext } from '@mcp-b/webmcp-types';

declare global {
    interface Navigator {
        modelContext: ModelContext
    }
}