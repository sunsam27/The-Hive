import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

vi.mock('../db/index.js', () => {
  const buildQuery = () => {
    const q = vi.fn();
    Object.assign(q, {
      where: vi.fn().mockReturnThis(),
      whereIn: vi.fn().mockReturnThis(),
      whereNot: vi.fn().mockReturnThis(),
      first: vi.fn(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      del: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      clone: vi.fn().mockReturnThis(),
      countDistinct: vi.fn().mockReturnThis(),
      join: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
    });
    return q;
  };

  const queryBuilder = buildQuery();
  const trxBuilder = buildQuery();

  const mockKnex = Object.assign(
    (table: string) => queryBuilder,
    {
      transaction: vi.fn().mockImplementation(async (cb: (trx: any) => void) => {
        await cb(trxBuilder);
      }),
    }
  );

  return { default: mockKnex };
});

vi.mock('../services/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendResetEmail: vi.fn().mockResolvedValue(undefined),
}));

const { default: app } = await import('../app.js');
const db = (await import('../db/index.js')).default;
const email = await import('../services/email.js');

function getQuery() {
  return (db as any)() as ReturnType<typeof vi.fn> & Record<string, any>;
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a user and sends verification email', async () => {
    const q = getQuery();
    q.first.mockResolvedValueOnce(undefined);
    q.insert.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Test', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Account created');
    expect(email.sendVerificationEmail).toHaveBeenCalledWith('test@example.com', 'Test', expect.any(String));
  });

  it('returns 409 if email already exists', async () => {
    const q = getQuery();
    q.first.mockResolvedValueOnce({ id: '1', email: 'test@example.com' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Test', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already in use');
  });

  it('returns 400 for invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'bad', password: '12' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});

describe('POST /api/auth/login', () => {
  const mockUser = {
    id: '1',
    name: 'Test',
    email: 'test@example.com',
    password_hash: bcrypt.hashSync('password123', 10),
    verified: true,
    role: 'freelancer',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns token for valid credentials', async () => {
    const q = getQuery();
    q.first.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('returns 401 for wrong password', async () => {
    const q = getQuery();
    q.first.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 403 if email not verified', async () => {
    const q = getQuery();
    q.first.mockResolvedValueOnce({ ...mockUser, verified: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('verify your email');
  });
});

describe('GET /api/auth/verify-email/:token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies email with valid token', async () => {
    const q = getQuery();
    q.returning.mockResolvedValueOnce([{ id: '1', name: 'Test', email: 'test@example.com' }]);

    const res = await request(app).get('/api/auth/verify-email/validtoken');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Email verified');
  });

  it('returns 400 for invalid token', async () => {
    const q = getQuery();
    q.returning.mockResolvedValueOnce([]);

    const res = await request(app).get('/api/auth/verify-email/invalidtoken');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid or expired token');
  });
});

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns generic message even if email not found', async () => {
    const q = getQuery();
    q.first.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('If the email exists');
  });

  it('sends reset email if user exists (but hides it from response)', async () => {
    const q = getQuery();
    q.first.mockResolvedValueOnce({ id: '1', name: 'Test', email: 'test@example.com' });
    q.update.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('If the email exists');
    expect(email.sendResetEmail).toHaveBeenCalled();
  });
});
