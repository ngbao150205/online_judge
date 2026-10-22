import prisma from '../config/db.js';
import { AppError } from '../errors/app-error.js';
export async function getCategoriesService() {
    return prisma.category.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, _count: { select: { problems: { where: { problem: { deletedAt: null } } } } } }, orderBy: { name: 'asc' },
    });
}
export async function createCategoryService(name: string) {
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing)
        throw new AppError(409, 'Danh mục này đã tồn tại', 'CATEGORY_ALREADY_EXISTS');
    return prisma.category.create({ data: { name } });
}
export async function updateCategoryService(id: string, name: string) {
    return prisma.category.update({ where: { id, deletedAt: null }, data: { name } });
}
export async function deleteCategoryService(id: string): Promise<void> {
    await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
}
