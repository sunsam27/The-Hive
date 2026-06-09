import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

type Q = { then: (fn: (value: any) => any) => Promise<any>; catch: (fn: (reason: any) => any) => Promise<any>; _queue: any[]; [key: string]: any };

vi.mock('../db/index.js', () => {
  function makeQ(queue: any[] = [], tag = ''): Q {
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
  const q = makeQ(mainQueue, 'MAIN');
  const trx = makeQ(trxQueue, 'TRX');

  const kn = (_table: string) => q;
  kn.transaction = vi.fn().mockImplementation(async (cb: (t: Q) => void) => cb(trx));
  kn._reset = () => { mainQueue.length = 0; trxQueue.length = 0; };
  kn._push = (v: any) => mainQueue.push(v);
  kn._trxPush = (v: any) => trxQueue.push(v);

  return { default: kn };
});

vi.mock('../utils/accessControl.js', () => ({
  checkWorkspaceAccess: vi.fn().mockResolvedValue(true),
  checkExpenseAccess: vi.fn(),
  checkReviewerRole: vi.fn(),
}));

const { default: app } = await import('../app.js');
const db = (await import('../db/index.js')).default;
const accessControl = await import('../utils/accessControl.js');

const kn = db as any;
const token = jwt.sign({ userId: 'test-user-id' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
const authHeader = { Authorization: `Bearer ${token}` };

const ws = {
  id: 'ws-1', name: 'Test', description: '', owner_id: 'test-user-id',
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

beforeEach(() => { vi.clearAllMocks(); kn._reset(); });

describe('GET /api/workspaces', () => {
  it('lists workspaces with pagination', async () => {
    kn._push({ count: 1 });
    kn._push([ws]);

    const res = await request(app).get('/api/workspaces').set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(50);
  });
});

describe('POST /api/workspaces', () => {
  it('creates a workspace', async () => {
    kn._trxPush([{ ...ws, name: 'New' }]);

    const res = await request(app)
      .post('/api/workspaces').set(authHeader)
      .send({ name: 'New', description: 'desc' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('New');
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app).post('/api/workspaces').set(authHeader).send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/workspaces/:id', () => {
  it('returns workspace if member', async () => {
    kn._push(ws);
    kn._push([]);

    const res = await request(app).get('/api/workspaces/ws-1').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test');
  });

  it('returns 404 if workspace missing', async () => {
    kn._push(undefined);

    const res = await request(app).get('/api/workspaces/nonexistent').set(authHeader);
    expect(res.status).toBe(404);
  });

  it('returns 403 if not a member', async () => {
    kn._push(ws);
    vi.mocked(accessControl.checkWorkspaceAccess).mockResolvedValueOnce(false);

    const res = await request(app).get('/api/workspaces/ws-1').set(authHeader);
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/workspaces/:id', () => {
  it('deletes workspace as owner', async () => {
    kn._push(ws);
    for (let i = 0; i < 8; i++) kn._trxPush([]);

    const res = await request(app).delete('/api/workspaces/ws-1').set(authHeader);
    expect(res.status).toBe(200);
  });

  it('returns 404 if workspace missing', async () => {
    kn._push(undefined);

    const res = await request(app).delete('/api/workspaces/nonexistent').set(authHeader);
    expect(res.status).toBe(404);
  });

  it('returns 403 if not owner', async () => {
    kn._push({ ...ws, owner_id: 'other-user' });

    const res = await request(app).delete('/api/workspaces/ws-1').set(authHeader);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/workspaces/:id/members', () => {
  it('adds a member', async () => {
    kn._push(ws);
    kn._push({ role: 'admin' });
    kn._push({ id: 'u2', email: 'a@b.com' });
    kn._push(undefined); // not already a member
    kn._push([{ workspace_id: 'ws-1', user_id: 'u2', role: 'member' }]); // insert result
    kn._push(undefined); // audit log insert

    const res = await request(app)
      .post('/api/workspaces/ws-1/members').set(authHeader)
      .send({ email: 'a@b.com' });

    expect(res.status).toBe(201);
  });

  it('rejects if workspace not found', async () => {
    kn._push(undefined);

    const res = await request(app)
      .post('/api/workspaces/ws-1/members').set(authHeader)
      .send({ email: 'a@b.com' });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/workspaces/:id', () => {
  it('updates workspace as owner', async () => {
    kn._push(ws);
    kn._push([{ ...ws, name: 'Updated' }]);

    const res = await request(app)
      .patch('/api/workspaces/ws-1').set(authHeader)
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
  });

  it('returns 403 if not owner', async () => {
    kn._push({ ...ws, owner_id: 'other-user' });

    const res = await request(app)
      .patch('/api/workspaces/ws-1').set(authHeader)
      .send({ name: 'Updated' });

    expect(res.status).toBe(403);
  });
});
