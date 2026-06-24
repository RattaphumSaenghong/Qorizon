export interface ShareResult {
  total: number;
  perMember: Map<string, number>;
}

/** Split stop costs across trip people using scope + assignees. */
export function computeShares(
  stops: { cost: number | null; scope: 'shared' | 'assigned'; assignees: { id: string }[] }[],
  people: { id: string }[],
): ShareResult {
  const perMember = new Map(people.map((p) => [p.id, 0]));
  let total = 0;
  for (const s of stops) {
    const cost = s.cost ?? 0;
    if (!cost) continue;
    total += cost;
    const splitIds =
      s.scope === 'assigned' && s.assignees.length > 0
        ? s.assignees.map((a) => a.id)
        : people.map((p) => p.id);
    const each = cost / (splitIds.length || 1);
    for (const id of splitIds) {
      perMember.set(id, (perMember.get(id) ?? 0) + each);
    }
  }
  return { total, perMember };
}

export interface Transfer {
  from: string; // who pays
  to: string; // who receives
  amount: number; // rounded to the nearest unit
}

export interface SettlementResult extends ShareResult {
  paid: Map<string, number>; // what each person fronted
  net: Map<string, number>; // paid − share; >0 = owed to them, <0 = they owe
  transfers: Transfer[]; // minimal set of payments to settle up
}

type SettlementStop = {
  cost: number | null;
  scope: 'shared' | 'assigned';
  assignees: { id: string }[];
  paid_by: string | null;
  user_id: string; // stop creator — the fallback payer when paid_by is unset
};

/**
 * Who owes whom. Each cost is split across its responsible people (assignees, or
 * everyone if shared) and credited to whoever fronted it (`paid_by`, else the
 * creator). Net balances are reduced to a minimal set of transfers.
 */
export function computeSettlement(
  stops: SettlementStop[],
  people: { id: string }[],
): SettlementResult {
  const ids = people.map((p) => p.id);
  const idSet = new Set(ids);
  const share = new Map(ids.map((id) => [id, 0]));
  const paid = new Map(ids.map((id) => [id, 0]));
  let total = 0;

  for (const s of stops) {
    const cost = s.cost ?? 0;
    if (!cost) continue;
    total += cost;

    const splitIds =
      s.scope === 'assigned' && s.assignees.length > 0
        ? s.assignees.map((a) => a.id).filter((id) => idSet.has(id))
        : ids;
    const each = cost / (splitIds.length || 1);
    for (const id of splitIds) share.set(id, (share.get(id) ?? 0) + each);

    const payer =
      s.paid_by && idSet.has(s.paid_by) ? s.paid_by : idSet.has(s.user_id) ? s.user_id : ids[0];
    if (payer) paid.set(payer, (paid.get(payer) ?? 0) + cost);
  }

  const net = new Map(ids.map((id) => [id, (paid.get(id) ?? 0) - (share.get(id) ?? 0)]));
  return { total, perMember: share, paid, net, transfers: minTransfers(net) };
}

/** Greedy debtor↔creditor matching → minimal payments. Sub-unit balances are ignored. */
function minTransfers(net: Map<string, number>): Transfer[] {
  const EPS = 0.5;
  const debtors: { id: string; amt: number }[] = [];
  const creditors: { id: string; amt: number }[] = [];
  for (const [id, v] of net) {
    if (v < -EPS) debtors.push({ id, amt: -v });
    else if (v > EPS) creditors.push({ id, amt: v });
  }
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(pay) });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt <= EPS) i++;
    if (creditors[j].amt <= EPS) j++;
  }
  return transfers.filter((t) => t.amount > 0);
}
