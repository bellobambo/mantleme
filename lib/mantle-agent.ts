import 'server-only';

import OpenAI from 'openai';
import type { ResearchContext } from '@/lib/agent';
import { callReadOnlyMantleTool, listReadOnlyMantleTools } from '@/lib/mantle-mcp';
import { loadMantleSkill, selectMantleSkill } from '@/lib/mantle-skills';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

const MAX_TOOL_ROUNDS = 4;

const TOOLS_BY_SKILL: Record<string, Set<string>> = {
  'mantle-network-primer': new Set([
    'mantle_getChainInfo',
    'mantle_getChainStatus',
    'mantle_getTokenInfo',
    'mantle_resolveToken',
  ]),
  'mantle-data-indexer': new Set([
    'mantle_getChainInfo',
    'mantle_querySubgraph',
    'mantle_queryIndexerSql',
  ]),
  // Upstream requires mantle-cli for this workflow and explicitly forbids MCP.
  'mantle-portfolio-analyst': new Set(),
  'mantle-defi-operator': new Set([
    'mantle_getChainInfo',
    'mantle_getChainStatus',
    'mantle_resolveToken',
    'mantle_resolveAddress',
    'mantle_validateAddress',
    'mantle_getTokenPrices',
    'mantle_getTokenInfo',
    'mantle_getSwapQuote',
    'mantle_getPoolLiquidity',
    'mantle_getPoolOpportunities',
    'mantle_getLendingMarkets',
    'mantle_getProtocolTvl',
  ]),
  'mantle-risk-evaluator': new Set([
    'mantle_getChainInfo',
    'mantle_getChainStatus',
    'mantle_resolveToken',
    'mantle_resolveAddress',
    'mantle_validateAddress',
    'mantle_getTokenPrices',
    'mantle_getAllowances',
    'mantle_getSwapQuote',
    'mantle_getPoolLiquidity',
    'mantle_estimateGas',
  ]),
};

function toolResultText(result: Awaited<ReturnType<typeof callReadOnlyMantleTool>>) {
  if (result.structuredContent) return JSON.stringify(result.structuredContent);

  const content = Array.isArray(result.content) ? result.content : [];
  const text = content
    .map((item: unknown) => {
      if (
        typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        item.type === 'text' &&
        'text' in item &&
        typeof item.text === 'string'
      ) {
        return item.text;
      }
      return JSON.stringify(item);
    })
    .join('\n');

  return text || JSON.stringify(result);
}

export async function runMantleSkillAgent(query: string, dataContext: ResearchContext) {
  const selectedSkill = selectMantleSkill(query);
  const skill = await loadMantleSkill(selectedSkill);

  if (!process.env.OPENAI_API_KEY) {
    return {
      report: null,
      selectedSkill,
      mcpUsed: false,
      warning: 'OPENAI_API_KEY is not configured, so the Mantle skill tool loop was not executed.',
    };
  }

  try {
    const permittedForSkill = TOOLS_BY_SKILL[selectedSkill] || new Set<string>();
    const mcpTools = (await listReadOnlyMantleTools())
      .filter((tool) => permittedForSkill.has(tool.name));
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = mcpTools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || `Mantle MCP read tool: ${tool.name}`,
        parameters: tool.inputSchema as OpenAI.FunctionParameters,
      },
    }));

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: [
          'You are MantleMe, a read-only Mantle research agent.',
          'Follow the official Mantle Agent Skill below as workflow and guardrails.',
          'Use Mantle MCP tools as deterministic evidence. Never invent addresses, prices, balances, endpoints, or tool results.',
          'This application is research-only: never request or attempt transaction-building, signing, or broadcasting.',
          'If a required indexer endpoint or wallet address is missing, follow the skill blocked-output rules and state exactly what is required.',
          `Indexer configuration: GraphQL=${process.env.MANTLE_SUBGRAPH_ENDPOINT ? 'configured server-side' : 'not configured'}; SQL=${process.env.MANTLE_SQL_INDEXER_ENDPOINT ? 'configured server-side' : 'not configured'}. Never invent an endpoint.`,
          selectedSkill === 'mantle-portfolio-analyst'
            ? 'This upstream skill is CLI-only and forbids MCP. No CLI tools are exposed in this web runtime, so follow its blocked behavior rather than substituting MCP calls.'
            : '',
          'Cite each MCP tool used in a Data Sources section.',
          '',
          skill.instructions,
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          `Research request: ${query}`,
          '',
          'Existing independently sourced dashboard context:',
          JSON.stringify(dataContext),
          '',
          'Use MCP when it can improve or verify the answer. Treat unavailable fields as unknown.',
        ].join('\n'),
      },
    ];

    const usedTools = new Set<string>();

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? 'auto' : undefined,
        temperature: 0.1,
      });
      const message = response.choices[0]?.message;
      if (!message) throw new Error('The AI agent returned no message.');

      messages.push(message);
      if (!message.tool_calls?.length) {
        return {
          report: message.content || '# Mantle research report unavailable',
          selectedSkill,
          mcpUsed: usedTools.size > 0,
          toolsUsed: [...usedTools],
        };
      }

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue;

        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>;
        } catch {
          args = {};
        }

        usedTools.add(toolCall.function.name);

        try {
          const result = await callReadOnlyMantleTool(toolCall.function.name, args);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResultText(result),
          });
        } catch (error) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: error instanceof Error ? error.message : 'Mantle MCP tool failed',
            }),
          });
        }
      }
    }

    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        ...messages,
        {
          role: 'system',
          content: 'Tool-call limit reached. Produce the final report now using only evidence already collected.',
        },
      ],
      temperature: 0.1,
    });

    return {
      report: finalResponse.choices[0]?.message.content || '# Mantle research report unavailable',
      selectedSkill,
      mcpUsed: usedTools.size > 0,
      toolsUsed: [...usedTools],
    };
  } catch (error) {
    return {
      report: null,
      selectedSkill,
      mcpUsed: false,
      warning: error instanceof Error ? error.message : 'Mantle MCP integration failed.',
    };
  }
}
