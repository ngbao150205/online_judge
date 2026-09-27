import { Request, Response } from 'express';
import {
  getAllRoadmapsAdminService,
  createRoadmapAdminService,
  updateRoadmapAdminService,
  deleteRoadmapAdminService,
} from '../../services/roadmap.admin.service';

export const getAllRoadmapsForAdmin = async (req: Request, res: Response) => {
  try {
    const data = await getAllRoadmapsAdminService();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi lấy lộ trình', error });
  }
};

export const createRoadmap = async (req: Request, res: Response) => {
  try {
    const { title, description, problems } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Tên lộ trình không được để trống' });
    }
    const data = await createRoadmapAdminService({ title, description, problems });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi tạo lộ trình', error });
  }
};

export const updateRoadmap = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const roadmapId = req.params.id;
    const data = await updateRoadmapAdminService(roadmapId, req.body);
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    if (error.message === 'ROADMAP_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Lộ trình không tồn tại' });
    }
    return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật lộ trình', error });
  }
};

export const deleteRoadmap = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const roadmapId = req.params.id;
    await deleteRoadmapAdminService(roadmapId);
    return res.status(200).json({ success: true, message: 'Xóa lộ trình thành công' });
  } catch (error: any) {
    if (error.message === 'ROADMAP_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Lộ trình không tồn tại' });
    }
    return res.status(500).json({ success: false, message: 'Lỗi server khi xóa lộ trình', error });
  }
};