import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

type Q = { then: (fn: (value: any) => any) => Promise<any>; catch: (fn: (reason: any) => any) => Promise<any>; _queue: any[]; [key: string]: any };

vi.mock('../db/index.js', () => {
  function makeQ(queue: any[] = []): Q {
    const q: Q = (_table?: string) => q;
    q._queue = queue;
    q.then = (fn: (value: any) => any) => Promise.resolve(queue.shift()).then(fn);
    q.catch = (fn: (reason: any) => any) => Promise.resolve(undefined).catch(fn);
    q.where = () => q;
    q.whereIn = () => q;
    q.whereNot = () => q;
    q.first = vi.fn(() => q);
    q.select = () => q;
    q.insert = () => q;
    q.update = () => q;
    q.del = () => q;
    q.limit = () => q;
    q.offset = () => q;
    q.orderBy = () => q;
    q.clone = () => q;
    q.countDistinct = () => q;
    q.join = () => q;
    q.returning = vi.fn(() => q);
    return q;
  }

  const mainQueue: any[] = [];
  const trxQueue: any[] = [];
  makeQ(mainQueue);
  makeQ(trxQueue);

  const kn = (_table: string) => {
    const q = makeQ(mainQueue);
    return q;
  };
  kn.transaction = vi.fn().mockImplementation(async (cb: (t: Q) => void) => {
    const tq = makeQ(trxQueue);
    await cb(tq);
  });
  kn._reset = () => { mainQueue.length = 0; trxQueue.length = 0; };
  kn._push = (v: any) => mainQueue.push(v);
  kn._trxPush = (v: any) => trxQueue.push(v);

  return { default: kn };
});

vi.mock('../utils/accessControl.js', () => ({
  checkWorkspaceAccess: vi.fn().mockResolvedValue(true),
  checkExpenseAccess: vi.fn().mockResolvedValue(null),
  checkReviewerRole: vi.fn().mockResolvedValue(null),
}));

const { default: app } = await import('../app.js');
const accessControl = await import('../utils/accessControl.js');

const kn = (await import('../db/index.js')).default as any;
const token = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
const authHeader = { Authorization: `Bearer ${token}` };

const mockExpense = {
  id: 'exp-1',
  workspace_id: 'ws-1',
  submitter_id: 'user-1',
  merchant: 'Store',
  amount: 100,
  currency: 'USD',
  category: 'office',
  status: 'draft',
  expense_date: '2026-06-01',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => { vi.clearAllMocks(); kn._reset(); });

describe('POST /api/expenses', () => {
  it('creates a draft expense', async () => {
    vi.mocked(accessControl.checkWorkspaceAccess).mockResolvedValue(true);
    kn._push([mockExpense]); // insert result
    kn._push(undefined); // audit log

    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader)
      .send({ workspaceId: '550e8400-e29b-41d4-a716-446655440000', amount: 100, category: 'office' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
  });

  it('returns 403 if no workspace access', async () => {
    vi.mocked(accessControl.checkWorkspaceAccess).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader)
      .send({ workspaceId: '550e8400-e29b-41d4-a716-446655440000', amount: 100 });

    expect(res.status).toBe(403);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/expenses', () => {
  it('lists expenses with pagination', async () => {
    kn._push({ count: 1 });
    kn._push([mockExpense]);

    const res = await request(app).get('/api/expenses').set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('filters by workspaceId', async () => {
    kn._push({ count: 0 });
    kn._push([]);

    const res = await request(app)
      .get('/api/expenses?workspaceId=ws-1')
      .set(authHeader);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/expenses/:id', () => {
  it('returns expense if accessible', async () => {
    vi.mocked(accessControl.checkWorkspaceAccess).mockResolvedValue(true);
    // getById: expense query, members query (workspace_members), receipts, tags
    kn._push(mockExpense);
    kn._push([{ user_id: 'user-1', role: 'admin' }]); // member
    kn._push([]); // receipts
    kn._push([]); // tags

    const res = await request(app).get('/api/expenses/exp-1').set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.merchant).toBe('Store');
  });

  it('returns 403 if no workspace access', async () => {
    vi.mocked(accessControl.checkWorkspaceAccess).mockResolvedValue(false);
    kn._push(mockExpense);

    const res = await request(app).get('/api/expenses/exp-1').set(authHeader);

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/expenses/:id', () => {
  it('deletes draft expense as creator', async () => {
    vi.mocked(accessControl.checkExpenseAccess).mockResolvedValue(mockExpense);
    // trx: receipts, expense_tags.del, receipts.del, expenses.del, audit_log
    for (let i = 0; i < 5; i++) kn._trxPush([]);

    const res = await request(app).delete('/api/expenses/exp-1').set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Expense deleted');
  });

  it('returns 404 if expense not found', async () => {
    vi.mocked(accessControl.checkExpenseAccess).mockResolvedValue(null);

    const res = await request(app).delete('/api/expenses/exp-1').set(authHeader);

    expect(res.status).toBe(404);
  });

  it('returns 400 if not in draft status', async () => {
    vi.mocked(accessControl.checkExpenseAccess).mockResolvedValue({ ...mockExpense, status: 'submitted' });

    const res = await request(app).delete('/api/expenses/exp-1').set(authHeader);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('draft');
  });

  it('returns 403 if not the creator', async () => {
    vi.mocked(accessControl.checkExpenseAccess).mockResolvedValue({ ...mockExpense, submitter_id: 'other-user' });

    const res = await request(app).delete('/api/expenses/exp-1').set(authHeader);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/expenses/:id/submit', () => {
  it('submits a draft expense', async () => {
    vi.mocked(accessControl.checkExpenseAccess).mockResolvedValue(mockExpense);
    kn._push([{ ...mockExpense, status: 'submitted' }]);

    const res = await request(app).post('/api/expenses/exp-1/submit').set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('submitted');
  });

  it('returns 404 if expense not found', async () => {
    vi.mocked(accessControl.checkExpenseAccess).mockResolvedValue(null);

    const res = await request(app).post('/api/expenses/exp-1/submit').set(authHeader);

    expect(res.status).toBe(404);
  });

  it('returns 400 if already submitted', async () => {
    vi.mocked(accessControl.checkExpenseAccess).mockResolvedValue({ ...mockExpense, status: 'submitted' });

    const res = await request(app).post('/api/expenses/exp-1/submit').set(authHeader);

    expect(res.status).toBe(400);
  });

  it('returns 403 if not the creator', async () => {
    vi.mocked(accessControl.checkExpenseAccess).mockResolvedValue({ ...mockExpense, submitter_id: 'other-user' });

    const res = await request(app).post('/api/expenses/exp-1/submit').set(authHeader);

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/expenses/:id/review', () => {
  it('approves a submitted expense', async () => {
    vi.mocked(accessControl.checkReviewerRole).mockResolvedValue({ ...mockExpense, status: 'submitted' });
    kn._push([{ ...mockExpense, status: 'approved' }]);

    const res = await request(app)
      .patch('/api/expenses/exp-1/review')
      .set(authHeader)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('rejects with a note', async () => {
    vi.mocked(accessControl.checkReviewerRole).mockResolvedValue({ ...mockExpense, status: 'submitted' });
    kn._push([{ ...mockExpense, status: 'rejected', rejection_note: 'No receipt' }]);

    const res = await request(app)
      .patch('/api/expenses/exp-1/review')
      .set(authHeader)
      .send({ status: 'rejected', notes: 'No receipt' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
  });

  it('returns 400 if rejection lacks notes', async () => {
    vi.mocked(accessControl.checkReviewerRole).mockResolvedValue({ ...mockExpense, status: 'submitted' });

    const res = await request(app)
      .patch('/api/expenses/exp-1/review')
      .set(authHeader)
      .send({ status: 'rejected' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid transition', async () => {
    vi.mocked(accessControl.checkReviewerRole).mockResolvedValue({ ...mockExpense, status: 'draft' });

    const res = await request(app)
      .patch('/api/expenses/exp-1/review')
      .set(authHeader)
      .send({ status: 'approved' });

    expect(res.status).toBe(400);
  });

  it('returns 404 if not reviewer', async () => {
    vi.mocked(accessControl.checkReviewerRole).mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/expenses/exp-1/review')
      .set(authHeader)
      .send({ status: 'approved' });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/expenses/:id', () => {
  it('updates a draft expense', async () => {
    vi.mocked(accessControl.checkExpenseAccess).mockResolvedValue(mockExpense);
    kn._push([{ ...mockExpense, merchant: 'New Store' }]);

    const res = await request(app)
      .patch('/api/expenses/exp-1')
      .set(authHeader)
      .send({ merchant: 'New Store' });

    expect(res.status).toBe(200);
  });

  it('returns 400 if not draft or rejected', async () => {
    vi.mocked(accessControl.checkExpenseAccess).mockResolvedValue({ ...mockExpense, status: 'submitted' });

    const res = await request(app)
      .patch('/api/expenses/exp-1')
      .set(authHeader)
      .send({ merchant: 'New Store' });

    expect(res.status).toBe(400);
  });
});
