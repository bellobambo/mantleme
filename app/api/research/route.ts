import { NextResponse } from 'next/server';
import { executeTokenSkill, executeTVLSkill, executeWalletSkill, executeRiskSkill, generateReport } from '@/lib/agent';

async function collectResearchData() {
  const [tokenData, tvlData, walletData, riskData] = await Promise.all([
    executeTokenSkill(),
    executeTVLSkill(),
    executeWalletSkill(),
    executeRiskSkill(),
  ]);

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

    // Generate markdown report
    const report = await generateReport(query || "General Mantle Research", dataContext);

    return NextResponse.json({
      report,
      data: dataContext,
      skillsUsed,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to run research agent' }, { status: 500 });
  }
}
