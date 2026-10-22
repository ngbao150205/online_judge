import type { Response } from 'express';
import { sendSuccess } from '../controller.utils.js';
import type { ControllerRequest } from '../controller.utils.js';
import { explainErrorService } from '../../services/ai.service.js';
import type { ExplainErrorInput } from '../../services/ai.service.js';

export async function explainErrorWithAI(req: ControllerRequest<ExplainErrorInput>, res: Response): Promise<void> {
  const data = await explainErrorService(req.body);
  sendSuccess(res, { data });
}
