import { StandardSchema, ValidationResult } from "./types"
import {
    JsonSchemaArray,
    JsonSchemaNumber,
    JsonSchemaString,
    InputSchema,
    JsonSchemaForInference
} from "@mcp-b/webmcp-types"

type Schema = InputSchema | JsonSchemaForInference

/**
 * Checks if a value implements the Standard Schema interface.
 * Used to detect Zod, Valibot, ArkType validators.
 */
export function isStandardSchema(value: unknown): value is StandardSchema {
   return value !== null &&
       typeof value === "object" &&
       "~standard" in value &&
       typeof (value as StandardSchema)
           ['~standard'].validate === "function"
}

/**
 * Validates input using a Standard Schema validator.
 */
export async function validateWithStandardSchema(schema: StandardSchema, input: unknown): Promise<ValidationResult> {
    const result = await schema["~standard"].validate(input)

    if (result.issues && result.issues.length > 0) {
        const issues = result.issues[0]
        const path = issues.path?.join('.') || ''
        const error = path ? `${path}: ${issues.message}` : issues.message
        return { valid: false, error }
    }
    return { valid: true }
}

/**
 * Validates input against a JSON Schema.
 * Lightweight validator covering common use cases.
 */
export function validateJsonSchema(schema: Schema, input: unknown): ValidationResult {
    // Handle const (exact value match)
    if ('const' in schema) {
        if (input !== schema.const) {
            return {
                valid: false,
                error: `Expected value to be ${JSON.stringify(schema.const)}`
            }
        }
        return { valid: true }
    }

    // Handle oneOf/anyOf (validates against at least one schema)
    if ("oneOf" in schema && Array.isArray(schema.oneOf) ||
        "oneOf" in schema && Array.isArray(schema.anyOf)) {
        const schemas = ('oneOf' in schema ? schema.oneOf : schema.anyOf) as Schema[]
        for (const subSchema of schemas) {
            const result = validateJsonSchema(subSchema, input)
            if (result.valid) {
                return { valid: true }
            }
        }
        return {
            valid: false,
            error: "Value does not match any of the allowed schemas"
        }
    }

    // Handle allOf (validates against all schemas)
    if ("allOf" in schema && Array.isArray(schema.allOf)) {
        for (const subSchema of schema.allOf) {
            const result = validateJsonSchema(subSchema, input)
            if (!result.valid) {
                return result
            }
        }
        return { valid: true }
    }

    // Handle if/then/else conditionals
    if ("if" in schema && schema.if) {
        const ifResult = validateJsonSchema(schema.if as Schema, input)

        if (ifResult.valid && "then" in schema && schema.then) {
            const thenResult = validateJsonSchema(schema.then as Schema, input)
            if (!thenResult.valid) {
                return thenResult
            }
        } else if (!ifResult.valid && "else" in schema && schema.else) {
            const elseResult = validateJsonSchema(schema.else as Schema, input)
            if (!elseResult.valid) {
                return elseResult
            }
        }
    }

    // Handle missing input
    if (input === undefined || input === null) {
        if (schema.type === "object" && schema.required && schema.required.length > 0) {
            return {
                valid: false,
                error: "Missing required input"
            }
        }
        return {valid: true}
    }

    // Validate type
    const typeError = validateType(input, schema)
    if (typeError) {
        return { valid: false, error: typeError }
    }

    // Validate object properties
    if ('properties' in schema && schema.properties && typeof input === "object" && !Array.isArray(input)) {
        const objectInput = input as Record<string, unknown>
        if (schema.required) {
            for (const key of schema.required){
                if (!(key in objectInput) || objectInput[key] === undefined) {
                    return {
                        valid: false,
                        error: `Missing required field: ${key}`
                    }
                }
            }
        }
        if (schema.properties) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (key in objectInput) {
                    const result = validateJsonSchema(propSchema, objectInput[key])
                    if (!result.valid) {
                        return {
                            valid: false,
                            error: `${key}: ${result.error}`
                        }
                    }
                }
            }
        }
    }

    // Validate array items
    if (schema.type === 'array' && Array.isArray(input)) {
        const arraySchema = schema as JsonSchemaArray
        if(arraySchema.items) {
            for (let i = 0; i < input.length; i++) {
                const result = validateJsonSchema(arraySchema.items, input[i])
                if (!result.valid) {
                    return {
                        valid: false,
                        error: `[${i}]: ${result.error}`
                    }
                }
            }
        }

        const {minItems, maxItems} = arraySchema
        if (minItems !== undefined && input.length < minItems) {
            return {
                valid: false,
                error: `Array must have at least ${minItems} items`
            }
        }
        if (maxItems !== undefined && input.length > maxItems) {
            return {
                valid: false,
                error: `Array must have at most ${maxItems} items`
            }
        }
    }

    return { valid: true }
}

/**
 * Validates that input matches the expected type.
 */
function validateType(input: unknown, schema: Schema) {
    const schemaType = schema.type

    if (!schemaType) {
        return null // No type constraint
    }

    const types = Array.isArray(schemaType) ? schemaType : [schemaType]

    for(const type of types) {
       if (matchType(type, input, schema)) {
           return null
       }
    }

    return `Expected ${types.join(" | ")}, got ${getTypeName(input)}`
}

/**
 * Checks if input matches a single type.
 */
function matchType(type: string, input: unknown, schema: Schema) {
    switch (type) {
        case "string":
            if (typeof input !== "string") return false
            return validateStringConstraints(input, schema)
        case "number":
        case "integer":
            if (typeof input !== "number") return false
            if (type === "integer" && !Number.isInteger(input)) return false
            return validateNumberConstraints(input, schema)
        case "boolean":
            return typeof input === "boolean"
        case "null":
            return input === null
        case "array":
            return Array.isArray(input)
        case "object":
            return typeof input === "object" && input !== null && !Array.isArray(input)
        default:
            return true // unknown type allowed
    }
}

/**
 * Validates string-specific constraints.
 */
function validateStringConstraints(input: string, schema: Schema) {
    const s = schema as JsonSchemaString
    if (s.minLength !== undefined && input.length < s.minLength) return false
    if (s.maxLength !== undefined && input.length > s.maxLength) return false
    if (s.enum !== undefined && !s.enum.includes(input)) return false

    if (s.pattern !== undefined) {
        try {
          const regex = new RegExp(s.pattern)
          if (!regex.test(input)) return false
        } catch {
            console.warn(`Invalid regex pattern: ${s.pattern}`)
        }
    }
    return true
}

/**
 * Validates number-specific constraints.
 */
function validateNumberConstraints(input: number, schema: Schema) {
    const n = schema as JsonSchemaNumber
    if (n.minimum !== undefined && input < n.minimum) return false
    if (n.maximum !== undefined && input > n.maximum) return false
    if (n.exclusiveMinimum !== undefined && input <= n.exclusiveMinimum) return false
    if (n.exclusiveMaximum !== undefined && input >= n.exclusiveMaximum) return false
    if (n.enum && !n.enum.includes(input)) return false
    return true
}

/**
 * Gets a human-readable type name for error messages.
 */
function getTypeName(value: unknown) {
    if (value === null) return "null"
    if (Array.isArray(value)) return "array"
    return typeof value
}