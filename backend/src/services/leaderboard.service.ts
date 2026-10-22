import prisma from '../config/db.js';

type RankingRow = { id: string; name: string; solvedProblems: bigint; acceptedSubmissions: bigint; totalSubmissions: bigint };
export async function getLeaderboardService(limit = 100, page = 1) {
  const rows = await prisma.$queryRaw<RankingRow[]>`
    SELECT u.id, u.name,
      COUNT(DISTINCT s."problemId") FILTER (WHERE s.status = 'ACCEPTED' AND p."deletedAt" IS NULL) AS "solvedProblems",
      COUNT(s.id) FILTER (WHERE s.status = 'ACCEPTED') AS "acceptedSubmissions",
      COUNT(s.id) AS "totalSubmissions"
    FROM users u LEFT JOIN submissions s ON s."userId" = u.id
    LEFT JOIN problems p ON p.id = s."problemId"
    WHERE u.role = 'STUDENT' AND u."deletedAt" IS NULL
    GROUP BY u.id, u.name ORDER BY "solvedProblems" DESC, "totalSubmissions" ASC, u.id
    LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
  return rows.map((row, index) => ({ id: row.id, name: row.name, username: row.name.toLowerCase().replace(/\s+/g, ''), avatar: null,
    rank: (page - 1) * limit + index + 1, solvedProblems: Number(row.solvedProblems),
    successfulSubmissions: Number(row.solvedProblems), acceptedSubmissions: Number(row.acceptedSubmissions), totalSubmissions: Number(row.totalSubmissions),
    accuracy: row.totalSubmissions > 0n ? Math.round(Number(row.acceptedSubmissions) / Number(row.totalSubmissions) * 100) : 0,
  }));
}
