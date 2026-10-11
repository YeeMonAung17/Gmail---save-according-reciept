import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AssistantMessageDto } from './assistant.dto';
import { DashboardService } from '../dashboard/dashboard.service';
import { savingFor } from '../domain/money';
import { parseReceipt, receiptFixtures } from '../receipts/fixtures';

const instructions = `You are the RecurrSave savings coach. Understand the product, help users build affordable savings habits and propose concrete changes. Use concise British English and plain text, without Markdown formatting.
The product idea is Gmail API + Engine Spaces: receipt amounts from Gmail inform savings rules, which transfer affordable small amounts into a goal Space. Budget safeguards protect essentials and an emergency cushion; visible goal progress and confirmed budget streaks encourage consistency. The current app simulates Gmail receipts, Engine Spaces, transfers and interest boosts. Only this chat uses a live external API. Never claim to access Gmail, a bank or real balances. You cannot change settings, submit receipts or move money.
When explaining the concept, explicitly separate the planned product from the current demo. Include this exact sentence: "Gmail and Engine Spaces are simulated in this demo." Never describe live Gmail scanning or bank transfers as implemented. The RecurrSave backend calculates budgets and checks affordability; Engine Spaces is the proposed destination for savings, not the budget calculation engine.
Onboarding has five steps: income and essentials, emergency allocation, goal and deadline, budget summary, then weekly allowance and savings rule. Weekly allowance is monthly discretionary budget times 12 divided by 52, rounded down to pennies. Weekly and calendar month limits both apply.
On the dashboard, receive a sample receipt, review its rule, then confirm the saving. Receiving or reviewing alone changes no balances. Rules support rounding to the next £5 or £10 or a percentage match between 0 and 100. There is no arbitrary fixed amount strategy and no minimum saving. Exact rounding boundaries save zero. A paused rule saves zero. Savings are skipped if the budget is insufficient. Replaying the same receipt never saves twice.
Users can edit savings rules and mark purchases already included in essentials to avoid counting them twice. Savings still consume discretionary budget. Spending can be recorded manually. Ten consecutive confirmed days within budget award an illustrative 0.01 percentage point boost from 2.00% to 2.01%. Users must confirm all spending before closing a day. The demo calendar advances one day at a time.
The visible Accessibility control offers larger text, high contrast and reduced motion. The completed income, emergency allocation and goal plan is fixed for this session. Merchant savings rules can be edited under Savings rules and saved using Save rules. Changes to income, emergency allocation or goal dates are planning suggestions for a future setup, not actions currently available on the dashboard. Do not tell users to reset their data.
For savings help, identify one practical next step: review an unused subscription, record missing spending, choose an affordable merchant rule, or confirm spending before closing the day. Do not assume every receipt recurs or project guaranteed monthly savings from one receipt. Ask about frequency before making a recurring estimate. Protect essentials and the emergency cushion; reduce or pause savings when limits are exhausted.
For a proposed rule change, name the merchant, current rule, proposed rule, saving per example receipt, budget impact and how to review and save the rule in the app. Use the server calculated candidate amounts and availableAfterPurchase when supplied, rather than the balance before recording the purchase. Candidate affordability applies to that receipt individually; multiple changes must fit the budget together. Prefer a small affordable change rather than maximising percentages. Never claim a suggestion has been applied. Proposals are optional and require the user's decision.
A separate system message provides sample receipt facts and, only if the user enabled Share my budget summary, a current saved plan summary from this session. All money values in summaries are integer pennies, so divide by 100 when displaying GBP. Use only these facts for personalisation; previous chat is not a source of live balances. Recheck the latest summary on every reply. Goal weekly saving needed is a planning estimate, not a guarantee or permission to exceed the remaining budget. If a deadline has passed, help reassess the plan without inventing a new deadline.
Without a saved plan summary, explain the concept and provide general examples. For personal recommendations, suggest enabling Share my budget summary or ask one focused question. Do not request credentials or bank details, promise returns or give personalised investment advice. Do not invent app features.`;

@Injectable()
export class AssistantService {
  constructor(private readonly dashboard: DashboardService) {}

  private readonly limits = new Map<
    string,
    { count: number; expires: number; pending: boolean }
  >();

  private summary(sessionId: string) {
    const data = this.dashboard.get(sessionId);
    if (
      !data.onboarded ||
      !data.budget ||
      !data.goal ||
      !data.usage ||
      !data.rules ||
      !data.receipts
    )
      return { onboarded: false, date: data.date };
    const remaining = Math.max(0, data.goal.target - data.goal.saved);
    const daysToDeadline = Math.ceil(
      (Date.parse(data.goal.targetDate) - Date.parse(data.date)) / 86_400_000,
    );
    return {
      onboarded: true,
      date: data.date,
      simulated: data.demo,
      budget: data.budget,
      usage: data.usage,
      goal: {
        kind: data.goal.kind,
        target: data.goal.target,
        saved: data.goal.saved,
        targetDate: data.goal.targetDate,
        remaining,
        weeklySavingNeeded:
          daysToDeadline > 0
            ? Math.ceil(remaining / (daysToDeadline / 7))
            : null,
      },
      streak: data.streak,
      dayClosed: data.dayClosed,
      rules: data.rules,
      receiptOptions: data.receipts.map((receipt) => {
        const rule = data.rules.find(
          (item) => item.merchant === receipt.merchant,
        )!;
        const availableAfterPurchase =
          Math.min(data.usage.weeklyRemaining, data.usage.monthlyRemaining) -
          (rule.essential ? 0 : receipt.amount);
        const candidates = [
          { strategy: 'round5' as const, percentage: rule.percentage },
          { strategy: 'round10' as const, percentage: rule.percentage },
          ...[5, 10, 15].map((percentage) => ({
            strategy: 'percentage' as const,
            percentage,
          })),
        ];
        return {
          merchant: receipt.merchant,
          amount: receipt.amount,
          currentSaving: receipt.expectedSaving,
          availableAfterPurchase,
          candidates: candidates.map((candidate) => {
            const saving = savingFor(receipt.amount, {
              ...rule,
              ...candidate,
              enabled: true,
            });
            return {
              ...candidate,
              saving,
              affordable: saving > 0 && saving <= availableAfterPurchase,
            };
          }),
        };
      }),
    };
  }

  async chat(
    sessionId: string,
    messages: AssistantMessageDto[],
    includeBudget = false,
  ) {
    if (
      messages.length % 2 !== 1 ||
      messages.some(
        (message, index) =>
          message.role !== (index % 2 === 0 ? 'user' : 'assistant'),
      )
    ) {
      throw new BadRequestException(
        'Send alternating user and assistant messages, ending with your question.',
      );
    }
    const key = process.env.OPENROUTER_API_KEY;
    if (!key)
      throw new ServiceUnavailableException(
        'The assistant is not configured. Add OPENROUTER_API_KEY to the backend environment.',
      );
    const now = Date.now();
    for (const [id, limit] of this.limits) {
      if (limit.expires <= now && !limit.pending) this.limits.delete(id);
    }
    const limit = this.limits.get(sessionId) || {
      count: 0,
      expires: now + 60_000,
      pending: false,
    };
    if (limit.pending || limit.count >= 6)
      throw new HttpException(
        'Please wait a moment before asking another question.',
        429,
      );
    if (!this.limits.has(sessionId) && this.limits.size >= 1000)
      throw new ServiceUnavailableException(
        'The assistant is busy. Please try again shortly.',
      );
    limit.count++;
    limit.pending = true;
    this.limits.set(sessionId, limit);
    try {
      const facts = {
        sampleReceipts: Object.entries(receiptFixtures).map(
          ([merchant, receipt]) => ({
            merchant,
            amount: parseReceipt(receipt.body),
          }),
        ),
        savedPlan: includeBudget ? this.summary(sessionId) : null,
      };
      let response: Response;
      try {
        response = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'openrouter/free',
              provider: { max_price: { prompt: 0, completion: 0, request: 0 } },
              messages: [
                { role: 'system', content: instructions },
                {
                  role: 'system',
                  content: `Verified app facts (money in integer pennies):\n${JSON.stringify(facts)}`,
                },
                ...messages,
              ],
              max_tokens: 1024,
              reasoning: { enabled: false, exclude: true },
            }),
            signal: AbortSignal.timeout(30_000),
          },
        );
      } catch (error) {
        throw new ServiceUnavailableException(
          error instanceof Error &&
            (error.name === 'TimeoutError' || error.name === 'AbortError')
            ? 'The assistant took too long to reply. Please try again.'
            : 'Cannot reach the assistant provider. Please try again.',
        );
      }
      if (response.status === 429)
        throw new HttpException(
          'The free model limit has been reached. Please try again later.',
          429,
        );
      if (response.status === 401 || response.status === 403)
        throw new ServiceUnavailableException(
          'The assistant provider rejected its configuration. Check the backend API key and OpenRouter settings.',
        );
      if (!response.ok)
        throw new ServiceUnavailableException(
          'The free assistant is unavailable. Please try again later.',
        );
      let data: {
        choices?: { message?: { content?: unknown } }[];
        error?: unknown;
      };
      try {
        data = await response.json();
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'TimeoutError' || error.name === 'AbortError')
        ) {
          throw new ServiceUnavailableException(
            'The assistant took too long to reply. Please try again.',
          );
        }
        throw new BadGatewayException(
          'The assistant returned an unreadable reply. Please try again.',
        );
      }
      const reply = data?.choices?.[0]?.message?.content;
      if (data?.error || typeof reply !== 'string' || !reply.trim())
        throw new BadGatewayException(
          'The assistant returned an empty reply. Please try again.',
        );
      return { reply: reply.trim() };
    } finally {
      limit.pending = false;
    }
  }
}
