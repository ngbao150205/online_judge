import prisma from '../dist/src/config/db.js';
import { verifyToken } from '../dist/src/utils/auth.js';

// Routing/controller tests isolate database-backed authentication at its delegate.
// Session security is exercised separately against real PostgreSQL in Docker.
export function installAuthFixture(t, tokens) {
  const sessions = new Map(tokens.map(token => {
    const claims = verifyToken(token);
    return [claims.jti, { tokenVersion: claims.tokenVersion, user: {
      id: claims.userId, role: claims.role, tokenVersion: claims.tokenVersion, deletedAt: null,
    } }];
  }));
  const original = prisma.authSession.findFirst;
  prisma.authSession.findFirst = async query => sessions.get(query.where.id) ?? null;
  t.after(() => { prisma.authSession.findFirst = original; });
}
