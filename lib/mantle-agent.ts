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
  // Web-safe, read-only subset of the CLI-first upstream portfolio workflow.
  'mantle-portfolio-analyst': new Set([
    'mantle_validateAddress',
    'mantle_getChainInfo',
    'mantle_getChainStatus',
    'mantle_getBalance',
    'mantle_getTokenBalances',
    'mantle_getAllowances',
    'mantle_getTokenPrices',
    'mantle_getTokenInfo',
  ]),
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
          'Return only the final user-facing findings. Never expose internal workflow steps, planning, command examples, tool-call syntax, placeholders, or statements about what you will do next.',
          'Format the report as normal Markdown headings, paragraphs, and lists. Never wrap the full report in a fenced code block.',
          'Write dates for people, for example "June 19, 2026 at 2:28 PM UTC". Do not expose raw field names such as collected_at_utc.',
          'Use Mantle Mainnet by default. Mention the network once in the report; do not ask the user to confirm it unless they explicitly request another network.',
          'If a required indexer endpoint or wallet address is missing, follow the skill blocked-output rules and state exactly what is required.',
          `Indexer configuration: GraphQL=${process.env.MANTLE_SUBGRAPH_ENDPOINT ? 'configured server-side' : 'not configured'}; SQL=${process.env.MANTLE_SQL_INDEXER_ENDPOINT ? 'configured server-side' : 'not configured'}. Never invent an endpoint.`,
          'Cite each MCP tool used in a Data Sources section.',
          '',
          skill.instructions,
          '',
          'APPLICATION-SPECIFIC OUTPUT RULES (these override conflicting workflow presentation or tool restrictions above):',
          selectedSkill === 'mantle-portfolio-analyst'
            ? [
                'WEB PORTFOLIO MODE: adapt the CLI-first skill to the available read-only MCP tools.',
                'Use the wallet address from the request and assume Mantle Mainnet.',
                'Call the available validation, chain, balance, token-balance, price, and allowance tools when their required inputs are known.',
                'Do not print or recommend mantle-cli commands.',
                'Do not claim Aave or LP coverage because those position tools are unavailable in this web runtime.',
                'If allowance pairs are not supplied and cannot be resolved, omit allowance results and label that coverage gap in one short sentence.',
                'Present compact sections for wallet summary, balances, approvals if available, and coverage notes.',
              ].join(' ')
            : '',
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
