import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = '7d';

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post<{
    Body: { email: string; password: string; displayName: string };
  }>('/auth/register', async (request, reply) => {
    const { email, password, displayName } = request.body;

    // Validate
    if (!email || !password || !displayName) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    if (password.length < 6) {
      return reply.status(400).send({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'User already exists' });
    }

    // Check if displayName is taken
    const existingProfile = await prisma.profile.findUnique({
      where: { displayName },
    });

    if (existingProfile) {
      return reply.status(400).send({ error: 'Display name already taken' });
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Create user and profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            displayName,
            avatarJson: {
              skinTone: 'default',
              hairStyle: 'default',
              shirtColor: '#4A90E2',
              pantsColor: '#2C3E50',
            },
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Set httpOnly cookie
    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
    };
  });

  // Login
  fastify.post<{
    Body: { email: string; password: string };
  }>('/auth/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Missing email or password' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const isValid = await argon2.verify(user.passwordHash, password);

    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        profile: user.profile,
      },
    };
  });

  // Me (get current user)
  fastify.get('/auth/me', async (request, reply) => {
    const token = request.cookies.token;

    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { profile: true },
      });

      if (!user || !user.profile) {
        return reply.status(401).send({ error: 'User not found' });
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          profile: user.profile,
        },
      };
    } catch (error) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });

  // Logout
  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { success: true };
  });
}
