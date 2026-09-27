import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  getPublicRoadmapsService,
  getStudentRoadmapDetailService,
} from '../../services/roadmap.student.service';

export const getPublicRoadmaps = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getPublicRoadmapsService();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách lộ trình', error });
  }
};

export const getStudentRoadmapDetail = async (
  req: AuthRequest,
  res: Response
) => {

  try {

    const userId = req.user?.userId;

    const roadmapId = req.params.id as string;

const roadmap =
  await getStudentRoadmapDetailService(
    roadmapId,
    userId
  );


    return res.json({
      success:true,
      data: roadmap
    });


  } catch(error){

    console.error(error);

    return res.status(500).json({
      success:false,
      message:"Lỗi lấy roadmap"
    });

  }
};