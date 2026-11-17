import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express, { type NextFunction, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase } from './server/db';
import {
  createNotification,
  getApplications,
  getCategories,
  getFreelancers,
  getJobs,
  getNotifications,
  getPayments,
  getProjects,
  getRevenueAnalytics,
  getReviews,
  getServices,
  getTransactions,
  getUserById,
  getWebsiteSettings,
  mapUserRow,
} from './server/queries';
import {
  type AuthenticatedRequest,
  generateCsrfToken,
  hashPassword,
  isValidEmail,
  sanitizePlain,
  sanitizeText,
  signSessionToken,
  verifyCsrfMiddleware,
  verifyPassword,
  verifySessionToken,
} from './server/security';
import type { UserRole } from './src/types/marketplace';

dotenv.config();
initDatabase();

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  function isHttpsRequest(req: express.Request): boolean {
    return req.secure || req.get('x-forwarded-proto') === 'https';
  }

  function getCookieOptions(req: express.Request, maxAge: number, httpOnly: boolean) {
    const https = isHttpsRequest(req);
    return {
      httpOnly,
      sameSite: (https ? 'none' : 'lax') as 'none' | 'lax',
      secure: https,
      path: '/',
      maxAge,
    };
  }

  // Ensure CSRF cookie is issued on GET/bootstrap and verified on state-changing requests
  app.use('/api', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let csrfToken = req.cookies?.fh_csrf as string | undefined;
    if (!csrfToken) {
      csrfToken = generateCsrfToken();
      res.cookie('fh_csrf', csrfToken, getCookieOptions(req, 7 * 24 * 60 * 60 * 1000, false));
    }
    res.locals.csrfToken = csrfToken;

    const authHeader = req.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const sessionCookie = (req.cookies?.fh_session as string | undefined) || bearerToken;
    const payload = verifySessionToken(sessionCookie);
    if (payload) {
      const dbUser = db
        .prepare('SELECT id, username, role, status FROM users WHERE id = ?')
        .get(payload.userId) as { id: number; username: string; role: UserRole; status: string } | undefined;
      if (dbUser && dbUser.status === 'active') {
        req.auth = {
          userId: dbUser.id,
          username: dbUser.username,
          role: dbUser.role,
          exp: payload.exp,
        };
      }
    }
    next();
  });

  app.use('/api', verifyCsrfMiddleware);

  function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    next();
  }

  function requireRole(...roles: UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.auth) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      if (!roles.includes(req.auth.role)) {
        res.status(403).json({ error: 'Access denied for your account role.' });
        return;
      }
      if (roles.includes('admin') && req.auth.role === 'admin' && req.auth.username !== 'joy') {
        res.status(403).json({ error: 'Only JOY is authorized as Super Administrator.' });
        return;
      }
      next();
    };
  }

  function issueSessionCookie(
    req: express.Request,
    res: Response,
    user: { id: number; username: string; role: UserRole },
    rememberMe: boolean
  ): string {
    const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const token = signSessionToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      exp: Date.now() + ttlMs,
    });
    res.cookie('fh_session', token, getCookieOptions(req, ttlMs, true));
    return token;
  }

  // ==================== BOOTSTRAP & PUBLIC MARKETPLACE ====================

  app.get('/api/bootstrap', (req: AuthenticatedRequest, res: Response) => {
    const user = req.auth ? getUserById(req.auth.userId) : null;
    const settings = getWebsiteSettings();
    const categories = getCategories(false);
    const jobs = getJobs({ status: 'open' });
    const freelancers = getFreelancers();
    const services = getServices();
    const stats = {
      openJobs: jobs.length,
      verifiedFreelancers: freelancers.length,
      completedProjects: Number(
        (db.prepare("SELECT COUNT(*) AS c FROM projects WHERE status = 'completed'").get() as { c: number }).c
      ),
      totalVolume: Number(
        (db.prepare("SELECT COALESCE(SUM(gross_amount), 0) AS s FROM payments WHERE status = 'completed'").get() as { s: number }).s
      ),
    };
    const unreadNotifications = user
      ? Number(
          (db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id) as { c: number }).c
        )
      : 0;
    const unreadMessages = user
      ? Number(
          (db.prepare('SELECT COUNT(*) AS c FROM messages WHERE receiver_id = ? AND is_read = 0').get(user.id) as { c: number }).c
        )
      : 0;

    res.json({
      csrfToken: res.locals.csrfToken,
      user,
      settings,
      categories,
      jobs,
      freelancers,
      services,
      stats,
      unreadNotifications,
      unreadMessages,
    });
  });

  app.get('/api/jobs', (req: AuthenticatedRequest, res: Response) => {
    const search = sanitizePlain(req.query.search, 120);
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const jobType = sanitizePlain(req.query.jobType, 20);
    const status = sanitizePlain(req.query.status, 20) || 'open';
    res.json({ jobs: getJobs({ search, categoryId, jobType, status }) });
  });

  app.get('/api/freelancers', (req: AuthenticatedRequest, res: Response) => {
    const search = sanitizePlain(req.query.search, 120);
    res.json({ freelancers: getFreelancers(search) });
  });

  app.get('/api/services', (req: AuthenticatedRequest, res: Response) => {
    const search = sanitizePlain(req.query.search, 120);
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    res.json({ services: getServices({ search, categoryId }) });
  });

  app.get('/api/users/:id/profile', (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'Invalid user ID.' });
      return;
    }
    const user = getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (user.role === 'freelancer') {
      const freelancer = getFreelancers().find((f) => f.userId === id) || null;
      const services = getServices({ freelancerId: id });
      const reviews = getReviews({ freelancerId: id });
      res.json({ user, freelancer, services, reviews });
      return;
    }
    const jobs = getJobs({ clientId: id });
    const reviews = getReviews({ clientId: id });
    res.json({ user, freelancer: null, jobs, reviews });
  });

  // ==================== AUTHENTICATION ====================

  app.post('/api/auth/login', (req: AuthenticatedRequest, res: Response) => {
    const identifier = sanitizePlain(req.body?.identifier, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const rememberMe = Boolean(req.body?.rememberMe);
    const expectedRole = sanitizePlain(req.body?.expectedRole, 20);

    if (!identifier || !password) {
      res.status(400).json({ error: 'Username or email and password are required.' });
      return;
    }

    const row = db
      .prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?')
      .get(identifier, identifier) as Record<string, unknown> | undefined;

    if (!row || !verifyPassword(password, String(row.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials. Please check your username and password.' });
      return;
    }
    if (String(row.status) === 'suspended') {
      res.status(403).json({ error: 'This account has been suspended by the Super Administrator.' });
      return;
    }

    const role = String(row.role) as UserRole;
    if (expectedRole === 'admin' && (role !== 'admin' || String(row.username) !== 'joy')) {
      res.status(403).json({ error: 'Super Administrator portal is restricted to JOY.' });
      return;
    }

    const sessionToken = issueSessionCookie(
      req,
      res,
      { id: Number(row.id), username: String(row.username), role },
      rememberMe
    );
    res.json({ user: mapUserRow(row), sessionToken });
  });

  app.post('/api/auth/register', (req: AuthenticatedRequest, res: Response) => {
    const name = sanitizeText(req.body?.name, 80);
    const username = sanitizePlain(req.body?.username, 40).toLowerCase().replace(/[^a-z0-9_]/g, '');
    const email = sanitizePlain(req.body?.email, 120).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const role = sanitizePlain(req.body?.role, 20);
    const companyName = sanitizeText(req.body?.companyName, 80);
    const location = sanitizeText(req.body?.location, 80) || 'Dhaka, Bangladesh';
    const headline = sanitizeText(req.body?.headline, 120) || 'Independent Specialist';
    const hourlyRate = Math.max(5, Math.min(500, Number(req.body?.hourlyRate || 30)));
    const skillsInput = sanitizeText(req.body?.skills, 250);

    if (role !== 'client' && role !== 'freelancer') {
      res.status(400).json({ error: 'Registration role must be Client or Freelancer. Admin registration is disabled.' });
      return;
    }
    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!username || username.length < 3 || username === 'joy') {
      res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters.' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const exists = db
      .prepare('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?')
      .get(username, email);
    if (exists) {
      res.status(409).json({ error: 'Username or email is already registered.' });
      return;
    }

    const palette = ['#0ea5e9', '#38bdf8', '#6366f1', '#14b8a6', '#818cf8'];
    const avatarColor = palette[Math.floor(Math.random() * palette.length)];
    const pwHash = hashPassword(password);

    const tx = db.transaction(() => {
      const resUser = db
        .prepare(
          `INSERT INTO users (name, username, email, password_hash, role, status, company_name, location, avatar_color)
           VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`
        )
        .run(name, username, email, pwHash, role, role === 'client' ? companyName || name : null, location, avatarColor);
      const userId = Number(resUser.lastInsertRowid);

      if (role === 'freelancer') {
        const skills = skillsInput
          ? skillsInput.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12)
          : ['Web Development', 'UI Design'];
        db.prepare(
          `INSERT INTO freelancer_profiles (user_id, headline, bio, hourly_rate, skills_json, experience_json, availability, verified)
           VALUES (?, ?, ?, ?, ?, '[]', 'available', 0)`
        ).run(userId, headline, `Verified ${headline} based in ${location}.`, hourlyRate, JSON.stringify(skills));
      }

      createNotification(
        userId,
        'Welcome to FREELANCING HUB',
        role === 'client'
          ? 'Your client workspace is ready. Post a job or book a specialist service package.'
          : 'Your freelancer workspace is ready. Complete your profile and apply for open projects.',
        'system'
      );
      return userId;
    });

    const newUserId = tx();
    const user = getUserById(newUserId)!;
    const sessionToken = issueSessionCookie(req, res, { id: user.id, username: user.username, role: user.role }, false);
    res.status(201).json({ user, sessionToken });
  });

  app.post('/api/auth/logout', (req: AuthenticatedRequest, res: Response) => {
    const https = isHttpsRequest(req);
    res.clearCookie('fh_session', {
      path: '/',
      sameSite: https ? 'none' : 'lax',
      secure: https,
    });
    res.json({ ok: true });
  });

  app.post('/api/auth/forgot-password', (req: AuthenticatedRequest, res: Response) => {
    const emailOrUser = sanitizePlain(req.body?.identifier, 120).toLowerCase();
    if (!emailOrUser) {
      res.status(400).json({ error: 'Please enter your email or username.' });
      return;
    }
    const row = db
      .prepare('SELECT id, email FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?')
      .get(emailOrUser, emailOrUser) as { id: number; email: string } | undefined;

    if (!row) {
      res.status(404).json({ error: 'No account found matching that email or username.' });
      return;
    }

    const token = crypto.randomBytes(12).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(
      row.id,
      token,
      expiresAt
    );

    res.json({
      message: 'Password reset token generated. Enter this code below to set a new password.',
      resetToken: token,
      expiresAt,
    });
  });

  app.post('/api/auth/reset-password', (req: AuthenticatedRequest, res: Response) => {
    const token = sanitizePlain(req.body?.token, 64).toUpperCase();
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!token || newPassword.length < 6) {
      res.status(400).json({ error: 'Valid reset code and a password of at least 6 characters are required.' });
      return;
    }

    const resetRow = db
      .prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0 ORDER BY id DESC LIMIT 1')
      .get(token) as { id: number; user_id: number; expires_at: string } | undefined;

    if (!resetRow || new Date(resetRow.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Invalid or expired reset code.' });
      return;
    }

    const newHash = hashPassword(newPassword);
    db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, resetRow.user_id);
      db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRow.id);
    })();

    res.json({ ok: true, message: 'Password updated successfully. You may now sign in.' });
  });

  // ==================== CLIENT FEATURES ====================

  app.get('/api/client/overview', requireRole('client'), (req: AuthenticatedRequest, res: Response) => {
    const clientId = req.auth!.userId;
    const jobs = getJobs({ clientId });
    const applications = getApplications({ clientId });
    const projects = getProjects({ clientId });
    const payments = getPayments({ clientId });
    const reviews = getReviews({ clientId });
    const totalSpent = payments.reduce((sum, p) => sum + p.grossAmount, 0);

    res.json({
      jobs,
      applications,
      projects,
      payments,
      reviews,
      metrics: {
        activeJobs: jobs.filter((j) => j.status === 'open').length,
        pendingApplications: applications.filter((a) => a.status === 'pending' || a.status === 'shortlisted').length,
        activeProjects: projects.filter((p) => p.status === 'active' || p.status === 'in_review').length,
        totalSpent,
      },
    });
  });

  app.post('/api/jobs', requireRole('client', 'admin'), (req: AuthenticatedRequest, res: Response) => {
    const clientId = req.auth!.userId;
    const categoryId = Number(req.body?.categoryId);
    const title = sanitizeText(req.body?.title, 140);
    const description = sanitizeText(req.body?.description, 3000);
    const budgetMin = Number(req.body?.budgetMin);
    const budgetMax = Number(req.body?.budgetMax);
    const jobType = req.body?.jobType === 'hourly' ? 'hourly' : 'fixed';
    const experienceLevel = ['entry', 'intermediate', 'expert'].includes(req.body?.experienceLevel)
      ? req.body.experienceLevel
      : 'intermediate';
    const deadline = sanitizePlain(req.body?.deadline, 20) || '2026-12-30';
    const skillsRaw = sanitizeText(req.body?.skills, 300);
    const skills = skillsRaw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10);

    if (!title || title.length < 5 || !description || description.length < 20) {
      res.status(400).json({ error: 'Provide a descriptive title (min 5 chars) and scope description (min 20 chars).' });
      return;
    }
    if (!Number.isFinite(budgetMin) || !Number.isFinite(budgetMax) || budgetMin <= 0 || budgetMax < budgetMin) {
      res.status(400).json({ error: 'Budget maximum must be greater than or equal to budget minimum.' });
      return;
    }

    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId);
    if (!cat) {
      res.status(400).json({ error: 'Select a valid job category.' });
      return;
    }

    const insert = db
      .prepare(
        `INSERT INTO jobs (client_id, category_id, title, description, budget_min, budget_max, job_type, experience_level, skills_json, deadline, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 0)`
      )
      .run(clientId, categoryId, title, description, budgetMin, budgetMax, jobType, experienceLevel, JSON.stringify(skills), deadline);

    const job = getJobs({ status: 'all' }).find((j) => j.id === Number(insert.lastInsertRowid));
    res.status(201).json({ job });
  });

  app.patch('/api/jobs/:id', requireRole('client', 'admin'), (req: AuthenticatedRequest, res: Response) => {
    const jobId = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as { id: number; client_id: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    if (req.auth!.role !== 'admin' && existing.client_id !== req.auth!.userId) {
      res.status(403).json({ error: 'You can only manage your own job postings.' });
      return;
    }
    const status = req.body?.status;
    if (status && ['open', 'in_progress', 'completed', 'closed'].includes(status)) {
      db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, jobId);
    }
    if (typeof req.body?.featured === 'boolean' && req.auth!.role === 'admin') {
      db.prepare('UPDATE jobs SET featured = ? WHERE id = ?').run(req.body.featured ? 1 : 0, jobId);
    }
    res.json({ ok: true });
  });

  app.delete('/api/jobs/:id', requireRole('client', 'admin'), (req: AuthenticatedRequest, res: Response) => {
    const jobId = Number(req.params.id);
    const existing = db.prepare('SELECT client_id FROM jobs WHERE id = ?').get(jobId) as { client_id: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    if (req.auth!.role !== 'admin' && existing.client_id !== req.auth!.userId) {
      res.status(403).json({ error: 'Cannot delete another client job.' });
      return;
    }
    db.prepare('DELETE FROM jobs WHERE id = ?').run(jobId);
    res.json({ ok: true });
  });

  app.patch('/api/applications/:id/status', requireRole('client'), (req: AuthenticatedRequest, res: Response) => {
    const appId = Number(req.params.id);
    const nextStatus = sanitizePlain(req.body?.status, 20);
    if (!['shortlisted', 'rejected'].includes(nextStatus)) {
      res.status(400).json({ error: 'Invalid status update.' });
      return;
    }
    const appRow = db
      .prepare('SELECT a.*, j.client_id, j.title FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?')
      .get(appId) as { id: number; freelancer_id: number; client_id: number; title: string } | undefined;

    if (!appRow || appRow.client_id !== req.auth!.userId) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(nextStatus, appId);
    createNotification(
      appRow.freelancer_id,
      `Application ${nextStatus === 'shortlisted' ? 'Shortlisted' : 'Updated'}`,
      `Your proposal for "${appRow.title}" was marked as ${nextStatus}.`,
      'job'
    );
    res.json({ ok: true });
  });

  app.post('/api/applications/:id/hire', requireRole('client'), (req: AuthenticatedRequest, res: Response) => {
    const appId = Number(req.params.id);
    const appRow = db
      .prepare(
        `SELECT a.*, j.client_id, j.title, j.description, j.deadline
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.id = ?`
      )
      .get(appId) as {
        id: number;
        job_id: number;
        freelancer_id: number;
        client_id: number;
        title: string;
        description: string;
        bid_amount: number;
        delivery_days: number;
        deadline: string;
        status: string;
      } | undefined;

    if (!appRow || appRow.client_id !== req.auth!.userId) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (appRow.status === 'hired') {
      res.status(400).json({ error: 'Freelancer has already been hired for this application.' });
      return;
    }

    const orderCode = `ORD-${Math.floor(26200 + Math.random() * 70000)}`;
    const projectId = db.transaction(() => {
      db.prepare("UPDATE applications SET status = 'hired' WHERE id = ?").run(appId);
      db.prepare("UPDATE applications SET status = 'rejected' WHERE job_id = ? AND id != ? AND status = 'pending'").run(
        appRow.job_id,
        appId
      );
      db.prepare("UPDATE jobs SET status = 'in_progress' WHERE id = ?").run(appRow.job_id);

      const ins = db
        .prepare(
          `INSERT INTO projects (order_code, job_id, client_id, freelancer_id, title, description, agreed_amount, progress, payment_status, status, due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, 10, 'unpaid', 'active', ?)`
        )
        .run(
          orderCode,
          appRow.job_id,
          appRow.client_id,
          appRow.freelancer_id,
          appRow.title,
          appRow.description,
          appRow.bid_amount,
          appRow.deadline
        );

      const pid = Number(ins.lastInsertRowid);
      db.prepare('INSERT INTO messages (sender_id, receiver_id, project_id, body) VALUES (?, ?, ?, ?)').run(
        appRow.client_id,
        appRow.freelancer_id,
        pid,
        `Contract ${orderCode} started for "${appRow.title}" ($${appRow.bid_amount}). Looking forward to collaborating!`
      );
      createNotification(
        appRow.freelancer_id,
        'You Were Hired!',
        `Contract ${orderCode} was created for "${appRow.title}".`,
        'project'
      );
      return pid;
    })();

    const project = getProjects({ clientId: req.auth!.userId }).find((p) => p.id === projectId);
    res.status(201).json({ project });
  });

  app.post('/api/services/:id/order', requireRole('client'), (req: AuthenticatedRequest, res: Response) => {
    const serviceId = Number(req.params.id);
    const service = db
      .prepare("SELECT * FROM services WHERE id = ? AND status = 'active'")
      .get(serviceId) as {
        id: number;
        freelancer_id: number;
        title: string;
        description: string;
        price: number;
        delivery_days: number;
      } | undefined;

    if (!service) {
      res.status(404).json({ error: 'Service package not found or paused.' });
      return;
    }

    const notes = sanitizeText(req.body?.notes, 1000) || service.description;
    const dueDate = new Date(Date.now() + service.delivery_days * 86400000).toISOString().slice(0, 10);
    const orderCode = `ORD-${Math.floor(26200 + Math.random() * 70000)}`;

    const pid = db.transaction(() => {
      const ins = db
        .prepare(
          `INSERT INTO projects (order_code, service_id, client_id, freelancer_id, title, description, agreed_amount, progress, payment_status, status, due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, 15, 'unpaid', 'active', ?)`
        )
        .run(
          orderCode,
          service.id,
          req.auth!.userId,
          service.freelancer_id,
          service.title,
          notes,
          service.price,
          dueDate
        );
      const newPid = Number(ins.lastInsertRowid);
      createNotification(
        service.freelancer_id,
        'New Service Order Received',
        `Order ${orderCode} placed for "${service.title}" ($${service.price}).`,
        'project'
      );
      return newPid;
    })();

    const project = getProjects({ clientId: req.auth!.userId }).find((p) => p.id === pid);
    res.status(201).json({ project });
  });

  app.post('/api/projects/:id/pay', requireRole('client'), (req: AuthenticatedRequest, res: Response) => {
    const projectId = Number(req.params.id);
    const method = sanitizeText(req.body?.paymentMethod, 60) || 'Corporate Visa';
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as {
      id: number;
      order_code: string;
      title: string;
      client_id: number;
      freelancer_id: number;
      agreed_amount: number;
      payment_status: string;
    } | undefined;

    if (!project || project.client_id !== req.auth!.userId) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    if (project.payment_status !== 'unpaid') {
      res.status(400).json({ error: 'Payment has already been funded for this project.' });
      return;
    }

    const settings = getWebsiteSettings();
    const gross = Number(project.agreed_amount);
    const fee = Number(((gross * settings.commissionPercent) / 100).toFixed(2));
    const net = Number((gross - fee).toFixed(2));
    const refCode = `PAY-${Date.now().toString().slice(-6)}`;
    const joyRow = db.prepare("SELECT id FROM users WHERE username = 'joy'").get() as { id: number } | undefined;

    db.transaction(() => {
      db.prepare("UPDATE projects SET payment_status = 'released', updated_at = datetime('now') WHERE id = ?").run(projectId);
      db.prepare(
        `INSERT INTO payments (project_id, client_id, freelancer_id, gross_amount, platform_fee, net_amount, payment_method, status, reference_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)`
      ).run(projectId, project.client_id, project.freelancer_id, gross, fee, net, method, refCode);

      db.prepare(
        `INSERT INTO transactions (user_id, project_id, type, amount, direction, description)
         VALUES (?, ?, 'escrow_deposit', ?, 'debit', ?)`
      ).run(project.client_id, projectId, gross, `Payment ${refCode} for ${project.order_code}`);

      db.prepare(
        `INSERT INTO transactions (user_id, project_id, type, amount, direction, description)
         VALUES (?, ?, 'freelancer_payout', ?, 'credit', ?)`
      ).run(project.freelancer_id, projectId, net, `Settlement ${refCode} for ${project.order_code}`);

      if (joyRow) {
        db.prepare(
          `INSERT INTO transactions (user_id, project_id, type, amount, direction, description)
           VALUES (?, ?, 'platform_commission', ?, 'credit', ?)`
        ).run(joyRow.id, projectId, fee, `Commission (${settings.commissionPercent}%) on ${project.order_code}`);
      }

      createNotification(
        project.freelancer_id,
        'Payment Cleared',
        `$${net.toFixed(2)} net payout settled for "${project.title}" (${refCode}).`,
        'payment'
      );
    })();

    res.json({ ok: true, referenceCode: refCode });
  });

  app.post('/api/projects/:id/complete', requireRole('client'), (req: AuthenticatedRequest, res: Response) => {
    const projectId = Number(req.params.id);
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as {
      id: number;
      job_id: number | null;
      client_id: number;
      freelancer_id: number;
      title: string;
      status: string;
    } | undefined;

    if (!project || project.client_id !== req.auth!.userId) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    db.transaction(() => {
      db.prepare("UPDATE projects SET status = 'completed', progress = 100, updated_at = datetime('now') WHERE id = ?").run(
        projectId
      );
      if (project.job_id) {
        db.prepare("UPDATE jobs SET status = 'completed' WHERE id = ?").run(project.job_id);
      }
      db.prepare('UPDATE freelancer_profiles SET completed_projects = completed_projects + 1 WHERE user_id = ?').run(
        project.freelancer_id
      );
      createNotification(
        project.freelancer_id,
        'Project Marked Complete',
        `"${project.title}" was approved and marked completed by the client.`,
        'project'
      );
    })();

    res.json({ ok: true });
  });

  app.post('/api/reviews', requireRole('client'), (req: AuthenticatedRequest, res: Response) => {
    const projectId = Number(req.body?.projectId);
    const rating = Math.max(1, Math.min(5, Math.round(Number(req.body?.rating))));
    const comment = sanitizeText(req.body?.comment, 1000);

    if (!comment || comment.length < 5) {
      res.status(400).json({ error: 'Please write a brief review comment.' });
      return;
    }

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as {
      id: number;
      client_id: number;
      freelancer_id: number;
      title: string;
      status: string;
    } | undefined;

    if (!project || project.client_id !== req.auth!.userId) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    if (project.status !== 'completed') {
      res.status(400).json({ error: 'You can review a project once it is marked completed.' });
      return;
    }

    const existing = db.prepare('SELECT id FROM reviews WHERE project_id = ?').get(projectId);
    if (existing) {
      res.status(409).json({ error: 'Review already submitted for this project.' });
      return;
    }

    db.transaction(() => {
      db.prepare('INSERT INTO reviews (project_id, client_id, freelancer_id, rating, comment) VALUES (?, ?, ?, ?, ?)').run(
        projectId,
        project.client_id,
        project.freelancer_id,
        rating,
        comment
      );
      const stats = db
        .prepare('SELECT AVG(rating) AS avg_r, COUNT(*) AS cnt FROM reviews WHERE freelancer_id = ?')
        .get(project.freelancer_id) as { avg_r: number; cnt: number };
      db.prepare('UPDATE freelancer_profiles SET rating = ?, review_count = ? WHERE user_id = ?').run(
        Number((stats.avg_r || 5).toFixed(1)),
        Number(stats.cnt),
        project.freelancer_id
      );
      createNotification(
        project.freelancer_id,
        `New ${rating}-Star Review`,
        `You received a ${rating}/5 review on "${project.title}".`,
        'review'
      );
    })();

    res.status(201).json({ ok: true });
  });

  // ==================== FREELANCER FEATURES ====================

  app.get('/api/freelancer/overview', requireRole('freelancer'), (req: AuthenticatedRequest, res: Response) => {
    const freelancerId = req.auth!.userId;
    const profile = getFreelancers().find((f) => f.userId === freelancerId) || null;
    const applications = getApplications({ freelancerId });
    const services = getServices({ freelancerId, includePaused: true });
    const projects = getProjects({ freelancerId });
    const payments = getPayments({ freelancerId });
    const transactions = getTransactions(freelancerId);
    const reviews = getReviews({ freelancerId });
    const totalEarned = payments.reduce((sum, p) => sum + p.netAmount, 0);
    const withdrawn = transactions
      .filter((t) => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      profile,
      applications,
      services,
      projects,
      payments,
      transactions,
      reviews,
      metrics: {
        activeApplications: applications.filter((a) => a.status === 'pending' || a.status === 'shortlisted').length,
        activeProjects: projects.filter((p) => p.status === 'active' || p.status === 'in_review').length,
        totalEarned,
        availableBalance: Math.max(0, Number((totalEarned - withdrawn).toFixed(2))),
      },
    });
  });

  app.put('/api/freelancer/profile', requireRole('freelancer'), (req: AuthenticatedRequest, res: Response) => {
    const userId = req.auth!.userId;
    const name = sanitizeText(req.body?.name, 80);
    const location = sanitizeText(req.body?.location, 80);
    const headline = sanitizeText(req.body?.headline, 140);
    const bio = sanitizeText(req.body?.bio, 2000);
    const hourlyRate = Math.max(5, Math.min(500, Number(req.body?.hourlyRate || 30)));
    const portfolioUrl = sanitizePlain(req.body?.portfolioUrl, 240);
    const availability = ['available', 'busy', 'unavailable'].includes(req.body?.availability)
      ? req.body.availability
      : 'available';
    const skills = Array.isArray(req.body?.skills)
      ? req.body.skills.map((s: unknown) => sanitizeText(s, 40)).filter(Boolean).slice(0, 15)
      : [];
    const experience = Array.isArray(req.body?.experience) ? req.body.experience.slice(0, 8) : [];

    db.transaction(() => {
      if (name) {
        db.prepare('UPDATE users SET name = ?, location = ? WHERE id = ?').run(name, location || 'Dhaka, Bangladesh', userId);
      }
      db.prepare(
        `UPDATE freelancer_profiles
         SET headline = ?, bio = ?, hourly_rate = ?, skills_json = ?, experience_json = ?, portfolio_url = ?, availability = ?
         WHERE user_id = ?`
      ).run(headline, bio, hourlyRate, JSON.stringify(skills), JSON.stringify(experience), portfolioUrl, availability, userId);
    })();

    res.json({ ok: true, profile: getFreelancers().find((f) => f.userId === userId) });
  });

  app.post('/api/jobs/:id/apply', requireRole('freelancer'), (req: AuthenticatedRequest, res: Response) => {
    const jobId = Number(req.params.id);
    const freelancerId = req.auth!.userId;
    const coverLetter = sanitizeText(req.body?.coverLetter, 2000);
    const bidAmount = Number(req.body?.bidAmount);
    const deliveryDays = Math.max(1, Math.min(365, Math.round(Number(req.body?.deliveryDays || 14))));

    if (!coverLetter || coverLetter.length < 15) {
      res.status(400).json({ error: 'Cover letter must be at least 15 characters.' });
      return;
    }
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      res.status(400).json({ error: 'Enter a valid bid amount.' });
      return;
    }

    const job = db.prepare('SELECT id, client_id, title, status FROM jobs WHERE id = ?').get(jobId) as
      | { id: number; client_id: number; title: string; status: string }
      | undefined;

    if (!job || job.status !== 'open') {
      res.status(404).json({ error: 'This job is no longer accepting proposals.' });
      return;
    }

    const dup = db
      .prepare('SELECT id FROM applications WHERE job_id = ? AND freelancer_id = ?')
      .get(jobId, freelancerId);
    if (dup) {
      res.status(409).json({ error: 'You have already applied to this job.' });
      return;
    }

    db.prepare(
      `INSERT INTO applications (job_id, freelancer_id, cover_letter, bid_amount, delivery_days, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    ).run(jobId, freelancerId, coverLetter, bidAmount, deliveryDays);

    const me = getUserById(freelancerId);
    createNotification(
      job.client_id,
      'New Job Proposal',
      `${me?.name ?? 'A freelancer'} submitted a $${bidAmount} proposal for "${job.title}".`,
      'job'
    );
    res.status(201).json({ ok: true });
  });

  app.post('/api/services', requireRole('freelancer'), (req: AuthenticatedRequest, res: Response) => {
    const freelancerId = req.auth!.userId;
    const categoryId = Number(req.body?.categoryId);
    const title = sanitizeText(req.body?.title, 120);
    const description = sanitizeText(req.body?.description, 1500);
    const price = Number(req.body?.price);
    const deliveryDays = Math.max(1, Math.min(180, Math.round(Number(req.body?.deliveryDays || 7))));
    const revisions = Math.max(1, Math.min(20, Math.round(Number(req.body?.revisions || 2))));
    const featuresRaw = sanitizeText(req.body?.features, 400);
    const features = featuresRaw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);

    if (!title || title.length < 5 || !description || !Number.isFinite(price) || price < 10) {
      res.status(400).json({ error: 'Provide service title, description, and price (min $10).' });
      return;
    }

    const ins = db
      .prepare(
        `INSERT INTO services (freelancer_id, category_id, title, description, price, delivery_days, revisions, features_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`
      )
      .run(freelancerId, categoryId, title, description, price, deliveryDays, revisions, JSON.stringify(features));

    const service = getServices({ freelancerId, includePaused: true }).find((s) => s.id === Number(ins.lastInsertRowid));
    res.status(201).json({ service });
  });

  app.patch('/api/services/:id', requireRole('freelancer'), (req: AuthenticatedRequest, res: Response) => {
    const serviceId = Number(req.params.id);
    const existing = db.prepare('SELECT freelancer_id FROM services WHERE id = ?').get(serviceId) as
      | { freelancer_id: number }
      | undefined;
    if (!existing || existing.freelancer_id !== req.auth!.userId) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }
    const status = req.body?.status === 'paused' ? 'paused' : 'active';
    db.prepare('UPDATE services SET status = ? WHERE id = ?').run(status, serviceId);
    res.json({ ok: true });
  });

  app.delete('/api/services/:id', requireRole('freelancer'), (req: AuthenticatedRequest, res: Response) => {
    const serviceId = Number(req.params.id);
    const existing = db.prepare('SELECT freelancer_id FROM services WHERE id = ?').get(serviceId) as
      | { freelancer_id: number }
      | undefined;
    if (!existing || existing.freelancer_id !== req.auth!.userId) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }
    db.prepare('DELETE FROM services WHERE id = ?').run(serviceId);
    res.json({ ok: true });
  });

  app.patch('/api/projects/:id/progress', requireRole('freelancer'), (req: AuthenticatedRequest, res: Response) => {
    const projectId = Number(req.params.id);
    const progress = Math.max(0, Math.min(100, Math.round(Number(req.body?.progress))));
    const deliverableNotes = sanitizeText(req.body?.deliverableNotes, 1200);
    const deliverableUrl = sanitizePlain(req.body?.deliverableUrl, 240);
    const readyForReview = Boolean(req.body?.readyForReview);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as {
      id: number;
      client_id: number;
      freelancer_id: number;
      title: string;
      status: string;
    } | undefined;

    if (!project || project.freelancer_id !== req.auth!.userId) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    const nextStatus = readyForReview && project.status === 'active' ? 'in_review' : project.status;
    db.prepare(
      `UPDATE projects
       SET progress = ?, deliverable_notes = ?, deliverable_url = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(progress, deliverableNotes, deliverableUrl, nextStatus, projectId);

    if (readyForReview) {
      createNotification(
        project.client_id,
        'Deliverable Ready for Review',
        `Milestone update (${progress}%) submitted for "${project.title}".`,
        'project'
      );
    }
    res.json({ ok: true });
  });

  app.post('/api/freelancer/withdraw', requireRole('freelancer'), (req: AuthenticatedRequest, res: Response) => {
    const amount = Number(req.body?.amount);
    const method = sanitizeText(req.body?.method, 80) || 'bKash / Bank Payout';
    if (!Number.isFinite(amount) || amount < 10) {
      res.status(400).json({ error: 'Minimum payout withdrawal is $10.' });
      return;
    }
    const payments = getPayments({ freelancerId: req.auth!.userId });
    const earned = payments.reduce((sum, p) => sum + p.netAmount, 0);
    const withdrawn = getTransactions(req.auth!.userId)
      .filter((t) => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    const available = earned - withdrawn;

    if (amount > available) {
      res.status(400).json({ error: `Insufficient cleared balance ($${available.toFixed(2)} available).` });
      return;
    }

    db.prepare(
      `INSERT INTO transactions (user_id, type, amount, direction, description, status)
       VALUES (?, 'withdrawal', ?, 'debit', ?, 'completed')`
    ).run(req.auth!.userId, amount, `Payout withdrawal via ${method}`);

    res.status(201).json({ ok: true });
  });

  // ==================== MESSAGING & NOTIFICATIONS ====================

  app.get('/api/messages/threads', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const myId = req.auth!.userId;
    const users = db
      .prepare(
        `SELECT id, name, username, role, avatar_color FROM users WHERE id != ? AND status = 'active' ORDER BY name ASC`
      )
      .all(myId) as Array<{ id: number; name: string; username: string; role: UserRole; avatar_color: string }>;

    const threads = users.map((u) => {
      const last = db
        .prepare(
          `SELECT body, created_at FROM messages
           WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
           ORDER BY created_at DESC LIMIT 1`
        )
        .get(myId, u.id, u.id, myId) as { body: string; created_at: string } | undefined;

      const unread = db
        .prepare('SELECT COUNT(*) AS c FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_read = 0')
        .get(u.id, myId) as { c: number };

      return {
        partnerId: u.id,
        partnerName: u.name,
        partnerUsername: u.username,
        partnerRole: u.role,
        partnerAvatarColor: u.avatar_color,
        lastMessage: last?.body ?? '',
        lastMessageAt: last?.created_at ?? '',
        unreadCount: Number(unread.c),
      };
    });

    threads.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
    res.json({ threads });
  });

  app.get('/api/messages/:partnerId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const myId = req.auth!.userId;
    const partnerId = Number(req.params.partnerId);
    db.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0').run(
      partnerId,
      myId
    );
    const rows = db
      .prepare(
        `SELECT * FROM messages
         WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_at ASC`
      )
      .all(myId, partnerId, partnerId, myId) as Array<Record<string, unknown>>;

    res.json({
      messages: rows.map((r) => ({
        id: Number(r.id),
        senderId: Number(r.sender_id),
        receiverId: Number(r.receiver_id),
        projectId: r.project_id ? Number(r.project_id) : null,
        body: String(r.body),
        isRead: Boolean(r.is_read),
        createdAt: String(r.created_at),
      })),
    });
  });

  app.post('/api/messages', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const senderId = req.auth!.userId;
    const receiverId = Number(req.body?.receiverId);
    const body = sanitizeText(req.body?.body, 2000);
    if (!Number.isInteger(receiverId) || receiverId === senderId || !body) {
      res.status(400).json({ error: 'Valid recipient and message body are required.' });
      return;
    }

    const ins = db
      .prepare('INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)')
      .run(senderId, receiverId, body);

    const me = getUserById(senderId);
    createNotification(receiverId, `Message from ${me?.name ?? 'User'}`, body.slice(0, 90), 'message');

    res.status(201).json({
      message: {
        id: Number(ins.lastInsertRowid),
        senderId,
        receiverId,
        projectId: null,
        body,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });
  });

  app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ notifications: getNotifications(req.auth!.userId) });
  });

  app.patch('/api/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.auth!.userId);
    res.json({ ok: true });
  });

  app.patch('/api/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(
      Number(req.params.id),
      req.auth!.userId
    );
    res.json({ ok: true });
  });

  // ==================== ADMIN PANEL (JOY ONLY) ====================

  app.get('/api/admin/overview', requireRole('admin'), (_req: AuthenticatedRequest, res: Response) => {
    const users = (
      db
        .prepare('SELECT id, name, username, email, role, status, company_name, location, avatar_color, created_at FROM users ORDER BY id ASC')
        .all() as Array<Record<string, unknown>>
    ).map(mapUserRow);

    const freelancers = getFreelancers();
    const jobs = getJobs({ status: 'all' });
    const projects = getProjects();
    const payments = getPayments();
    const transactions = getTransactions();
    const reviews = getReviews();
    const categories = getCategories(true);
    const settings = getWebsiteSettings();
    const revenue = getRevenueAnalytics();

    const grossRevenue = payments.reduce((s, p) => s + p.grossAmount, 0);
    const netCommission = payments.reduce((s, p) => s + p.platformFee, 0);

    res.json({
      users,
      freelancers,
      jobs,
      projects,
      payments,
      transactions,
      reviews,
      categories,
      settings,
      revenue,
      metrics: {
        totalUsers: users.length,
        totalClients: users.filter((u) => u.role === 'client').length,
        totalFreelancers: users.filter((u) => u.role === 'freelancer').length,
        openJobs: jobs.filter((j) => j.status === 'open').length,
        activeProjects: projects.filter((p) => p.status === 'active' || p.status === 'in_review').length,
        grossRevenue,
        netCommission,
      },
    });
  });

  app.patch('/api/admin/users/:id', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    const target = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as
      | { id: number; username: string; role: UserRole }
      | undefined;

    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (target.username === 'joy' || target.role === 'admin') {
      res.status(403).json({ error: 'Super Administrator JOY cannot be suspended or demoted.' });
      return;
    }

    if (req.body?.status && ['active', 'suspended'].includes(req.body.status)) {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(req.body.status, id);
    }
    if (typeof req.body?.verified === 'boolean' && target.role === 'freelancer') {
      db.prepare('UPDATE freelancer_profiles SET verified = ? WHERE user_id = ?').run(req.body.verified ? 1 : 0, id);
    }
    res.json({ ok: true });
  });

  app.delete('/api/admin/users/:id', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    const target = db.prepare('SELECT username, role FROM users WHERE id = ?').get(id) as
      | { username: string; role: UserRole }
      | undefined;
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (target.username === 'joy' || target.role === 'admin') {
      res.status(403).json({ error: 'Super Administrator JOY cannot be deleted.' });
      return;
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  app.patch('/api/admin/projects/:id', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    const status = sanitizePlain(req.body?.status, 20);
    if (!['active', 'in_review', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid project status.' });
      return;
    }
    db.prepare("UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    res.json({ ok: true });
  });

  app.patch('/api/admin/payments/:id', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    const status = sanitizePlain(req.body?.status, 20);
    if (!['completed', 'pending', 'refunded'].includes(status)) {
      res.status(400).json({ error: 'Invalid payment status.' });
      return;
    }
    db.prepare('UPDATE payments SET status = ? WHERE id = ?').run(status, id);
    res.json({ ok: true });
  });

  app.delete('/api/admin/reviews/:id', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    const review = db.prepare('SELECT freelancer_id FROM reviews WHERE id = ?').get(id) as
      | { freelancer_id: number }
      | undefined;
    if (!review) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }
    db.transaction(() => {
      db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
      const stats = db
        .prepare('SELECT COALESCE(AVG(rating), 5) AS avg_r, COUNT(*) AS cnt FROM reviews WHERE freelancer_id = ?')
        .get(review.freelancer_id) as { avg_r: number; cnt: number };
      db.prepare('UPDATE freelancer_profiles SET rating = ?, review_count = ? WHERE user_id = ?').run(
        Number(stats.avg_r.toFixed(1)),
        Number(stats.cnt),
        review.freelancer_id
      );
    })();
    res.json({ ok: true });
  });

  app.post('/api/admin/categories', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const name = sanitizeText(req.body?.name, 60);
    const description = sanitizeText(req.body?.description, 200);
    const iconName = sanitizePlain(req.body?.iconName, 40) || 'Briefcase';
    if (!name || name.length < 2) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      db.prepare('INSERT INTO categories (name, slug, description, icon_name, is_active) VALUES (?, ?, ?, ?, 1)').run(
        name,
        slug,
        description || `${name} specialist projects.`,
        iconName
      );
      res.status(201).json({ categories: getCategories(true) });
    } catch {
      res.status(409).json({ error: 'A category with this name already exists.' });
    }
  });

  app.patch('/api/admin/categories/:id', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    const isActive = Boolean(req.body?.isActive);
    db.prepare('UPDATE categories SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
    res.json({ categories: getCategories(true) });
  });

  app.delete('/api/admin/categories/:id', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    const used = db.prepare('SELECT COUNT(*) AS c FROM jobs WHERE category_id = ?').get(id) as { c: number };
    if (used.c > 0) {
      res.status(400).json({ error: 'Cannot delete a category that has active jobs. Deactivate it instead.' });
      return;
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ categories: getCategories(true) });
  });

  app.put('/api/admin/settings', requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const siteName = sanitizeText(req.body?.siteName, 80) || 'FREELANCING HUB';
    const tagline = sanitizeText(req.body?.tagline, 240);
    const supportEmail = sanitizePlain(req.body?.supportEmail, 120);
    const commissionPercent = Math.max(1, Math.min(30, Number(req.body?.commissionPercent || 10)));
    const currencySymbol = sanitizePlain(req.body?.currencySymbol, 6) || '$';
    const maintenanceMode = req.body?.maintenanceMode ? 1 : 0;
    const announcementText = sanitizeText(req.body?.announcementText, 240);

    // Owner Name is always JOY
    db.prepare(
      `UPDATE website_settings
       SET site_name = ?, owner_name = 'JOY', tagline = ?, support_email = ?, commission_percent = ?, currency_symbol = ?, maintenance_mode = ?, announcement_text = ?
       WHERE id = 1`
    ).run(siteName, tagline, supportEmail, commissionPercent, currencySymbol, maintenanceMode, announcementText);

    res.json({ settings: getWebsiteSettings() });
  });

  // ==================== VITE / STATIC SERVING ====================

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FREELANCING HUB server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
