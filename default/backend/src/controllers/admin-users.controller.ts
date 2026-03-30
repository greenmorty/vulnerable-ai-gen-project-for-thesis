/**
 * Responsibility: Implements admin-only user listing and soft deletion workflows.
 */
import { Prisma, UserStatus } from "@prisma/client";
import type { RequestHandler } from "express";

import { AppError } from "../lib/app-error";
import { prisma } from "../lib/prisma";
import { adminUserListSelect } from "../lib/user-selects";

export const listUsers: RequestHandler = async (request, response) => {
  const { page, pageSize, search, status } = request.query as {
    page: number;
    pageSize: number;
    search?: string;
    status?: UserStatus;
  };

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: adminUserListSelect,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  response.json({
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  });
};

export const softDeleteUser: RequestHandler = async (request, response) => {
  if (!request.auth) {
    throw new AppError("Authentication is required.", 401);
  }

  const { id } = request.params;

  if (id === request.auth.id) {
    throw new AppError("Admins cannot soft delete their own account.", 400);
  }

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      deletedAt: true,
    },
  });

  if (!targetUser || targetUser.deletedAt) {
    throw new AppError("User not found.", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: UserStatus.SUSPENDED,
      },
    });

    await tx.refreshToken.updateMany({
      where: {
        userId: id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: "admin_soft_delete",
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actorUserId: request.auth!.id,
        action: "soft_delete_user",
        entityType: "User",
        entityId: id,
        metadata: {
          source: "admin.users.delete",
        },
      },
    });
  });

  response.status(204).send();
};
