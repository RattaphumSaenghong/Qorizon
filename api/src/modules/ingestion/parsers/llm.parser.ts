import { ConfigService } from '@nestjs/config';
import type { ParsedInventory } from './jsonld.parser';

export async function parseWithAnthropic(
  config: ConfigService,
  subject: string,
  bodyText: string,
): Promise<ParsedInventory | null> {
  const apiKey = config.get<string>('ANTHROPIC_API_KEY');
  if (!apiKey || !bodyText.trim()) return null;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content:
            'Extract one travel confirmation as strict JSON only. ' +
            'Schema: {"type":"flight|hotel","title":"string","ref":"string?","origin":"string?","destination":"string?","dep_time":"string?","arr_time":"string?","hotel_name":"string?","check_in":"string?","check_out":"string?","nights":number?,"amount_thb":number?}. ' +
            `Subject: ${subject}\nBody:\n${bodyText.slice(0, 12000)}`,
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === 'text')?.text;
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as ParsedInventory;
    return parsed.type === 'flight' || parsed.type === 'hotel' ? parsed : null;
  } catch {
    return null;
  }
}
