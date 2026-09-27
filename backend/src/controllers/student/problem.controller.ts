import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { Difficulty } from '@prisma/client';
import { ProblemStudentService } from '../../services/problem.student.service';


/**
 * Lấy danh sách bài tập công khai
 * Có kiểm tra bài đã giải của user hiện tại
 */
export const getPublicProblems = async (
  req: AuthRequest,
  res: Response
) => {
  try {

    const page =
      parseInt(req.query.page as string) || 1;

    const limit =
      parseInt(req.query.limit as string) || 10;

    const search =
      req.query.search as string;

    const categoryId =
      req.query.categoryId as string;

    const difficulty =
      req.query.difficulty as Difficulty;


    // Lấy user hiện tại từ JWT
    const userId =
      req.user?.userId;


    const result =
      await ProblemStudentService.getPublicProblems(
        {
          page,
          limit,
          search,
          categoryId,
          difficulty,
        },
        userId
      );


    return res.status(200).json({
      success: true,
      data: result.problems,
      pagination: result.pagination,
    });


  } catch (error) {

    console.error(
      'getPublicProblems error:',
      error
    );


    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách bài tập',
      error,
    });

  }
};



/**
 * Lấy chi tiết bài tập theo slug
 */
export const getPublicProblemDetail = async (
  req: AuthRequest,
  res: Response
) => {

  try {

    const slug =
      req.params.slug as string;


    const problem =
      await ProblemStudentService.getPublicProblemDetail(
        slug
      );


    if (!problem) {

      return res.status(404).json({
        success: false,
        message:
          'Bài tập không tồn tại hoặc đã dừng mở',
      });

    }


    return res.status(200).json({
      success: true,
      data: problem,
    });


  } catch (error) {

    console.error(
      'getPublicProblemDetail error:',
      error
    );


    return res.status(500).json({
      success: false,
      message:
        'Lỗi server khi lấy chi tiết bài tập',
      error,
    });

  }

};