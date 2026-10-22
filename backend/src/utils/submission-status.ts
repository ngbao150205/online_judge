import { SubmissionStatus, TestcaseStatus } from '@prisma/client';

const aliases: Record<string, TestcaseStatus> = {
  AC: TestcaseStatus.AC, ACCEPTED: TestcaseStatus.AC,
  WA: TestcaseStatus.WA, WRONG_ANSWER: TestcaseStatus.WA,
  TLE: TestcaseStatus.TLE, TIME_LIMIT_EXCEEDED: TestcaseStatus.TLE,
  MLE: TestcaseStatus.MLE, MEMORY_LIMIT_EXCEEDED: TestcaseStatus.MLE,
  RE: TestcaseStatus.RE, RTE: TestcaseStatus.RE, RUNTIME_ERROR: TestcaseStatus.RE,
  CE: TestcaseStatus.CE, COMPILE_ERROR: TestcaseStatus.CE,
};
export function mapToTestcaseStatus(raw: string): TestcaseStatus {
  return Object.hasOwn(aliases, raw) ? aliases[raw] : TestcaseStatus.SYSTEM_ERROR;
}

export function aggregateOfficialStatus(statuses: TestcaseStatus[]): SubmissionStatus {
  const priority: Array<[TestcaseStatus, SubmissionStatus]> = [
    [TestcaseStatus.SYSTEM_ERROR, SubmissionStatus.SYSTEM_ERROR],
    [TestcaseStatus.CE, SubmissionStatus.COMPILE_ERROR], [TestcaseStatus.RE, SubmissionStatus.RUNTIME_ERROR],
    [TestcaseStatus.MLE, SubmissionStatus.MEMORY_LIMIT_EXCEEDED], [TestcaseStatus.TLE, SubmissionStatus.TIME_LIMIT_EXCEEDED],
    [TestcaseStatus.WA, SubmissionStatus.WRONG_ANSWER],
  ];
  for (const [testcase, submission] of priority) if (statuses.includes(testcase)) return submission;
  return statuses.length > 0 && statuses.every(status => status === TestcaseStatus.AC)
    ? SubmissionStatus.ACCEPTED : SubmissionStatus.SYSTEM_ERROR;
}

export function elapsedMilliseconds(value?: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 2147483647 ? Math.floor(value) : 0;
}
