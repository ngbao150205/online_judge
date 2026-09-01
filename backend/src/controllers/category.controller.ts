import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../utils/prisma';

// 🟢 1. LẤY DANH SÁCH DANH MỤC (Public / Admin đều dùng được)
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { problems: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách danh mục', error });
  }
};

// 🟢 2. TẠO DANH MỤC MỚI (Admin)
export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() },
    });

    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Danh mục này đã tồn tại' });
    }

    const category = await prisma.category.create({
      data: { name: name.trim() },
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công',
      data: category,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi server khi tạo danh mục', error });
  }
};

// 🟢 3. CẬP NHẬT DANH MỤC (Admin)
export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name: name.trim() },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công',
      data: category,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật danh mục hoặc không tìm thấy ID', error });
  }
};

// 🟢 4. XÓA DANH MỤC (Admin)
export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.category.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Xóa danh mục thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi xóa danh mục hoặc không tìm thấy ID', error });
  }
};