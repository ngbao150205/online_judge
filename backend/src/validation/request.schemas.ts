import { z } from 'zod';

const uuid = z.uuid();
const name = z.string().trim().min(1).max(200);
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const password = z.string().min(1).max(1024);
const newPassword = z.string().min(6).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Mật khẩu tối đa 72 byte UTF-8');
const role = z.enum(['STUDENT', 'ADMIN']);
const difficulty = z.enum(['EASY', 'MEDIUM', 'HARD']);
const sourceCode = z.string().refine(value => value.trim().length > 0, 'Mã nguồn không được để trống')
  .refine(value => Buffer.byteLength(value, 'utf8') <= 65536, 'Mã nguồn tối đa 64 KiB');
const inputText = z.string().refine(value => Buffer.byteLength(value, 'utf8') <= 65536, 'Nội dung tối đa 64 KiB');
const language = z.enum(['python', 'cpp']);
const optionalProblemId = uuid.nullish();

export const idParams = z.object({ id: uuid });
export const runIdParams = z.object({ runId: z.string().regex(/^run-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) });
export const slugParams = z.object({ slug: z.string().min(1).max(250) });

export const registerBody = z.object({ name, email, password: newPassword, acceptedTerms: z.literal(true) });
export const loginBody = z.object({ email, password });
export const googleBody = z.object({ credential: z.string().min(1).max(16384), acceptedTerms: z.literal(true) });
export const forgotPasswordBody = z.object({ email });
const otp = z.string().regex(/^\d{6}$/, 'Mã xác nhận phải gồm 6 chữ số');
export const resetPasswordBody = z.object({
  email, token: otp.optional(), otp: otp.optional(), newPassword,
}).refine(data => Boolean(data.otp || data.token), 'Thiếu mã xác nhận')
  .refine(data => !data.otp || !data.token || data.otp === data.token, 'otp và token không được khác nhau');
export const profileBody = z.object({ name });
export const changePasswordBody = z.object({
  currentPassword: password.optional(), oldPassword: password.optional(), newPassword,
}).refine(data => Boolean(data.currentPassword || data.oldPassword), 'Thiếu mật khẩu hiện tại')
  .refine(data => !data.currentPassword || !data.oldPassword || data.currentPassword === data.oldPassword, 'Hai trường mật khẩu hiện tại không được khác nhau');

const execution = { language, sourceCode };
export const runBody = z.object({ ...execution, problemId: optionalProblemId, customInput: inputText.nullish() });
export const problemExecutionBody = z.object({ ...execution, problemId: uuid });
export const explainBody = z.object({ ...execution, errorMessage: inputText.optional() });

// Query values are strings; accept only scalar positive integers before controllers parse them.
const positiveQuery = (max: number) => z.string().regex(/^[1-9]\d*$/)
  .refine(value => Number.isSafeInteger(Number(value)) && Number(value) <= max, `Giá trị tối đa ${max}`);
export const historyQuery = z.object({ page: positiveQuery(1000000).optional() });
export const problemQuery = z.object({
  page: positiveQuery(1000000).optional(), limit: positiveQuery(100).optional(),
  search: z.string().max(200).optional(), categoryId: uuid.optional(), difficulty: difficulty.optional(),
});

export const categoryBody = z.object({ name });
const optionalPwd = z.union([newPassword, z.literal('')]).optional();
const userFields = { name, email, pwd: optionalPwd, password: optionalPwd, role: role.optional() };
function normalizeUserPassword(data: { pwd?: string; password?: string }) {
  const { password, ...rest } = data;
  return { ...rest, ...(password !== undefined && data.pwd === undefined ? { pwd: password } : {}) };
}
const aliasesAgree = (data: { pwd?: string; password?: string }) => data.pwd === undefined || data.password === undefined || data.pwd === data.password;
export const createUserBody = z.object(userFields)
  .refine(data => Boolean(data.pwd || data.password), 'Cần cấp mật khẩu riêng cho tài khoản mới')
  .refine(aliasesAgree, 'pwd và password không được khác nhau').transform(normalizeUserPassword);
export const updateUserBody = z.object(userFields).partial()
  .refine(data => Object.keys(data).length > 0, 'Thiếu dữ liệu cập nhật')
  .refine(aliasesAgree, 'pwd và password không được khác nhau').transform(normalizeUserPassword);

const testcase = z.object({
  inputData: inputText, expectedOutput: inputText,
  isHidden: z.boolean().optional(), orderIndex: z.number().int().nonnegative().optional(),
});
const categoryIds = z.array(uuid).min(1).max(100).refine(ids => new Set(ids).size === ids.length, 'Danh mục không được trùng');
const problemFields = {
  title: z.string().trim().min(1).max(250), description: z.string().min(1).max(100000),
  difficulty: difficulty.optional(), timeLimit: z.number().int().positive().max(60000).optional(),
  memoryLimit: z.number().int().positive().max(1024).optional(), isActive: z.boolean().optional(),
  categoryIds, testcases: z.array(testcase).max(1000).optional(),
};
export const createProblemBody = z.object(problemFields);
export const updateProblemBody = z.object(problemFields).partial()
  .refine(data => Object.keys(data).length > 0, 'Thiếu dữ liệu cập nhật');

const roadmapProblems = z.array(z.object({ problemId: uuid, orderIndex: z.number().int().nonnegative().optional() }))
  .max(1000).refine(items => new Set(items.map(item => item.problemId)).size === items.length, 'Bài trong lộ trình không được trùng');
const roadmapFields = {
  title: z.string().trim().min(1).max(250), description: z.string().max(100000).optional(),
  isActive: z.boolean().optional(), problems: roadmapProblems.optional(),
};
export const createRoadmapBody = z.object(roadmapFields);
export const updateRoadmapBody = z.object(roadmapFields).partial()
  .refine(data => Object.keys(data).length > 0, 'Thiếu dữ liệu cập nhật');

export const leaderboardQuery = z.object({ limit: positiveQuery(100).optional(), page: positiveQuery(1000000).optional() });
