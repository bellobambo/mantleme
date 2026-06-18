import 'server-only';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '@mantleio/mantle-mcp/server.js';

const READ_ONLY_TOOLS = new Set([
  'mantle_getBalance',
  'mantle_getTokenBalances',
  'mantle_getAllowances',
  'mantle_getSwapQuote',
  'mantle_getPoolLiquidity',
  'mantle_getPoolOpportunities',
  'mantle_getLendingMarkets',
  'mantle_getProtocolTvl',
  'mantle_resolveToken',
  'mantle_resolveAddress',
  'mantle_validateAddress',
  'mantle_getChainInfo',
  'mantle_getChainStatus',
  'mantle_getTokenPrices',
  'mantle_getTokenInfo',
  'mantle_estimateGas',
  'mantle_querySubgraph',
  'mantle_queryIndexerSql',
  'mantle_checkRpcHealth',
  'mantle_probeEndpoint',
]);

type MantleMcpConnection = {
  client: Client;
};

declare global {
  var __mantleMcpConnection: Promise<MantleMcpConnection> | undefined;
}

async function createConnection() {
  const client = new Client(
    { name: 'mantleme-research-agent', version: '1.0.0' },
    { capabilities: {} },
  );
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return { client };
}

export async function getMantleMcpClient() {
  globalThis.__mantleMcpConnection ??= createConnection().catch((error) => {
    globalThis.__mantleMcpConnection = undefined;
    throw error;
  });

  return globalThis.__mantleMcpConnection;
}

export async function listReadOnlyMantleTools() {
  const { client } = await getMantleMcpClient();
  const response = await client.listTools();
  return response.tools
    .filter((tool) => READ_ONLY_TOOLS.has(tool.name))
    .filter((tool) => tool.name !== 'mantle_querySubgraph' || Boolean(process.env.MANTLE_SUBGRAPH_ENDPOINT))
    .filter((tool) => tool.name !== 'mantle_queryIndexerSql' || Boolean(process.env.MANTLE_SQL_INDEXER_ENDPOINT))
    .map((tool) => {
      const endpointConfigured =
        (tool.name === 'mantle_querySubgraph' && process.env.MANTLE_SUBGRAPH_ENDPOINT) ||
        (tool.name === 'mantle_queryIndexerSql' && process.env.MANTLE_SQL_INDEXER_ENDPOINT);
      if (!endpointConfigured) return tool;

      const properties = { ...(tool.inputSchema.properties || {}) };
      delete properties.endpoint;

      return {
        ...tool,
        inputSchema: {
          ...tool.inputSchema,
          properties,
          required: Array.isArray(tool.inputSchema.required)
            ? tool.inputSchema.required.filter((field) => field !== 'endpoint')
            : tool.inputSchema.required,
        },
      };
    });
}

export async function callReadOnlyMantleTool(name: string, args: Record<string, unknown>) {
  if (!READ_ONLY_TOOLS.has(name)) {
    throw new Error(`Mantle MCP tool "${name}" is not permitted in research-only mode.`);
  }

  const { client } = await getMantleMcpClient();
  const serverArgs = { ...args };

  if (name === 'mantle_querySubgraph') {
    if (!process.env.MANTLE_SUBGRAPH_ENDPOINT) {
      throw new Error('MANTLE_SUBGRAPH_ENDPOINT is not configured.');
    }
    serverArgs.endpoint = process.env.MANTLE_SUBGRAPH_ENDPOINT;
  }

  if (name === 'mantle_queryIndexerSql') {
    if (!process.env.MANTLE_SQL_INDEXER_ENDPOINT) {
      throw new Error('MANTLE_SQL_INDEXER_ENDPOINT is not configured.');
    }
    serverArgs.endpoint = process.env.MANTLE_SQL_INDEXER_ENDPOINT;
  }

  return client.callTool({ name, arguments: serverArgs });
}
