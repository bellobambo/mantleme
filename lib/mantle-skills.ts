import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const mantleSkillNames = [
  'mantle-network-primer',
  'mantle-data-indexer',
  'mantle-portfolio-analyst',
  'mantle-defi-operator',
  'mantle-risk-evaluator',
] as const;

export type MantleSkillName = (typeof mantleSkillNames)[number];

const SKILLS_ROOT = path.join(process.cwd(), 'skills', 'skills');

export function selectMantleSkill(query: string): MantleSkillName {
  const normalized = query.toLowerCase();
  const hasWalletAddress = /0x[a-f0-9]{40}/i.test(query);
  const isHistorical =
    /\b(history|historical|activity|transactions?|volume|users?|flows?|whales?|past\s+\d+|last\s+(week|month|year))\b/.test(normalized);
  const isStateChanging =
    /\b(swap|approve|supply|borrow|repay|withdraw|add liquidity|remove liquidity)\b/.test(normalized);

  if (isHistorical) {
    return 'mantle-data-indexer';
  }

  if (hasWalletAddress || /\b(portfolio|balance|allowance|approval|holdings|position)\b/.test(normalized)) {
    return 'mantle-portfolio-analyst';
  }

  if (isStateChanging &&
    /\b(risk|safe|safety|slippage|price impact|deadline|gas check|preflight)\b/.test(normalized)
  ) {
    return 'mantle-risk-evaluator';
  }

  if (
    /\b(defi|swap|liquidity|pool|lending|borrow|supply|aave|merchant moe|agni|fluxion|yield|apy|tvl)\b/.test(normalized)
  ) {
    return 'mantle-defi-operator';
  }

  return 'mantle-network-primer';
}

export async function loadMantleSkill(name: MantleSkillName) {
  const skillPath = path.join(SKILLS_ROOT, name, 'SKILL.md');
  const instructions = await readFile(skillPath, 'utf8');

  return {
    name,
    instructions,
    source: `mantle-xyz/mantle-skills@${name}`,
  };
}
