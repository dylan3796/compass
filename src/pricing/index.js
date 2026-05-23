import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_PRICES = JSON.parse(readFileSync(join(__dirname, 'models.json'), 'utf-8'));

const DEFAULT_PRICE = { input_per_mtok: 3.00, output_per_mtok: 75.00 };

function priceForModel(model) {
  if (MODEL_PRICES[model]) return MODEL_PRICES[model];
  for (const [key, val] of Object.entries(MODEL_PRICES)) {
    if (model.startsWith(key)) return val;
  }
  if (model.includes('opus')) return MODEL_PRICES['claude-opus-4-7'];
  if (model.includes('haiku')) return MODEL_PRICES['claude-haiku-4-5-20251001'];
  if (model.includes('sonnet')) return MODEL_PRICES['claude-sonnet-4-6'];
  return DEFAULT_PRICE;
}

export function price(classifierResult) {
  const byAgent = {};
  const byModel = {};
  let totalUsd = 0;

  for (const agent of classifierResult.agents) {
    let agentTotal = 0;

    for (const [model, data] of Object.entries(agent.perModel)) {
      const pricing = priceForModel(model);
      const inputCost = (data.input / 1_000_000) * pricing.input_per_mtok;
      const outputCost = (data.output / 1_000_000) * pricing.output_per_mtok;
      const cacheWriteCost = (data.cacheWrite / 1_000_000) * pricing.input_per_mtok * 1.25;
      const cacheReadCost = (data.cacheRead / 1_000_000) * pricing.input_per_mtok * 0.10;
      const cost = inputCost + outputCost + cacheWriteCost + cacheReadCost;

      agentTotal += cost;

      if (!byModel[model]) byModel[model] = { tokens: 0, usd: 0 };
      byModel[model].tokens += data.input + data.output + data.cacheWrite + data.cacheRead;
      byModel[model].usd += cost;
    }

    byAgent[agent.id] = { totalUsd: agentTotal };
    totalUsd += agentTotal;
  }

  for (const model of Object.keys(byModel)) {
    byModel[model].usd = Math.round(byModel[model].usd * 100) / 100;
  }

  return { byAgent, byModel, totalUsd: Math.round(totalUsd * 100) / 100 };
}
