#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { getDb, closeDb, getDbPath } from './database.js';
import { listTools } from './tools/lists.js';
import { taskTools } from './tools/tasks.js';
import { priorityTools } from './tools/priorities.js';
import { goalTools } from './tools/goals.js';
import { subtaskTools } from './tools/subtasks.js';
import { scheduleTools } from './tools/schedule.js';
import { analyticsTools } from './tools/analytics.js';
import { createScopedLogger, createToolTimer, getLogFilePath } from './logger.js';

const serverLog = createScopedLogger('server');

// ============================================================================
// Combine all tools
// ============================================================================

const allTools = {
  ...listTools,
  ...taskTools,
  ...priorityTools,
  ...goalTools,
  ...subtaskTools,
  ...scheduleTools,
  ...analyticsTools,
};

type ToolName = keyof typeof allTools;

// ============================================================================
// Convert Zod schemas to JSON Schema for MCP
// ============================================================================

function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Simple conversion for our schemas
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodType;
      properties[key] = zodFieldToJsonSchema(zodValue);

      // Check if required (not optional)
      if (!(zodValue instanceof z.ZodOptional) && !(zodValue instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return { type: 'object' };
}

function zodFieldToJsonSchema(field: z.ZodType): Record<string, unknown> {
  // Handle optional
  if (field instanceof z.ZodOptional) {
    return zodFieldToJsonSchema(field.unwrap());
  }

  // Handle default
  if (field instanceof z.ZodDefault) {
    const inner = zodFieldToJsonSchema(field._def.innerType);
    return { ...inner, default: field._def.defaultValue() };
  }

  // Handle nullable
  if (field instanceof z.ZodNullable) {
    const inner = zodFieldToJsonSchema(field.unwrap());
    return { ...inner, nullable: true };
  }

  // Handle string
  if (field instanceof z.ZodString) {
    const result: Record<string, unknown> = { type: 'string' };
    if (field.description) result.description = field.description;
    return result;
  }

  // Handle number
  if (field instanceof z.ZodNumber) {
    const result: Record<string, unknown> = { type: 'number' };
    if (field.description) result.description = field.description;

    // Check for min/max
    for (const check of field._def.checks) {
      if (check.kind === 'min') result.minimum = check.value;
      if (check.kind === 'max') result.maximum = check.value;
    }

    return result;
  }

  // Handle boolean
  if (field instanceof z.ZodBoolean) {
    const result: Record<string, unknown> = { type: 'boolean' };
    if (field.description) result.description = field.description;
    return result;
  }

  // Handle enum
  if (field instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: field.options,
      description: field.description,
    };
  }

  // Handle array
  if (field instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodFieldToJsonSchema(field.element),
      description: field.description,
    };
  }

  // Handle object
  if (field instanceof z.ZodObject) {
    return zodToJsonSchema(field);
  }

  // Fallback
  return { type: 'string' };
}

// ============================================================================
// Create MCP Server
// ============================================================================

serverLog.info('Creating MCP server instance');

const server = new Server(
  {
    name: 'uptier',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// List Tools Handler
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  serverLog.debug('ListTools request received');

  const tools = Object.entries(allTools).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema),
  }));

  serverLog.debug('ListTools response', { toolCount: tools.length });
  return { tools };
});

// ============================================================================
// Call Tool Handler
// ============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const timer = createToolTimer(name, args as Record<string, unknown>);
  timer.start();

  const tool = allTools[name as ToolName];
  if (!tool) {
    const error = new Error(`Unknown tool: ${name}`);
    timer.error(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: false, error: error.message }),
        },
      ],
    };
  }

  try {
    // Initialize database on first tool call
    getDb();

    // Parse and validate input
    const parsed = tool.inputSchema.parse(args);

    // Execute handler
    const result = (tool.handler as (input: unknown) => unknown)(parsed);

    timer.success();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    timer.error(error instanceof Error ? error : new Error(errorMessage));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
          }),
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  serverLog.info('UpTier MCP Server starting', {
    dbPath: getDbPath(),
    logPath: getLogFilePath(),
  });

  // Log startup info to stderr (stdout is for MCP protocol)
  console.error('UpTier MCP Server starting...');
  console.error(`Database path: ${getDbPath()}`);
  console.error(`Log file: ${getLogFilePath()}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  serverLog.info('UpTier MCP Server running');
  console.error('UpTier MCP Server running');

  // Handle shutdown
  process.on('SIGINT', () => {
    serverLog.info('Received SIGINT, shutting down');
    console.error('Shutting down...');
    closeDb();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    serverLog.info('Received SIGTERM, shutting down');
    console.error('Shutting down...');
    closeDb();
    process.exit(0);
  });

  process.on('uncaughtException', (error) => {
    serverLog.error('Uncaught exception', error);
    console.error('Uncaught exception:', error);
    closeDb();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    serverLog.error('Unhandled rejection', reason as Error);
    console.error('Unhandled rejection:', reason);
  });
}

main().catch((error) => {
  serverLog.fatal('Fatal error during startup', { error: error instanceof Error ? error.message : String(error) });
  console.error('Fatal error:', error);
  process.exit(1);
});
