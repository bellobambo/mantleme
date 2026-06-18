import { NextResponse } from 'next/server';
import { executeTokenSkill, executeTVLSkill, executeWalletSkill, executeRiskSkill, generateReport } from '@/lib/agent';
import { runMantleSkillAgent } from '@/lib/mantle-agent';

export const runtime = 'nodejs';

async function collectResearchData() {
  const [tokenData, tvlData, walletData] = await Promise.all([
    executeTokenSkill(),
    executeTVLSkill(),
    executeWalletSkill(),
  ]);
  const riskData = await executeRiskSkill(tokenData.data, tvlData.data);

  return {
    data: {
      token: tokenData.data,
      tvl: tvlData.data,
      wallet: walletData.data,
      risk: riskData.data,
    },
    skillsUsed: [tokenData.name, tvlData.name, walletData.name, riskData.name],
  };
}

export async function GET() {
  try {
    return NextResponse.json(await collectResearchData());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to load Mantle dashboard data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    const { data: dataContext, skillsUsed } = await collectResearchData();
    const researchQuery = typeof query === 'string' && query.trim()
      ? query.trim()
      : 'General Mantle Research';
    const mantleAgent = await runMantleSkillAgent(researchQuery, dataContext);

    const report = mantleAgent.report || await generateReport(researchQuery, dataContext);

    return NextResponse.json({
      report,
      data: dataContext,
      skillsUsed: [...skillsUsed, mantleAgent.selectedSkill],
      mantleAgent: {
        selectedSkill: mantleAgent.selectedSkill,
        mcpUsed: mantleAgent.mcpUsed,
        toolsUsed: mantleAgent.toolsUsed || [],
        warning: mantleAgent.warning,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to run research agent' }, { status: 500 });
  }
}
