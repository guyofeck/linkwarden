import { prisma } from "@linkwarden/prisma";
import getPermission from "@/lib/api/getPermission";
import { z } from "zod";

const ReadStatusSchema = z.object({ isRead: z.boolean() });

export default async function setLinkRead(
  userId: number,
  linkId: number,
  body: unknown
) {
  const parsed = ReadStatusSchema.safeParse(body);
  if (!Number.isInteger(linkId) || linkId <= 0 || !parsed.success) {
    return { response: "Invalid link or read status.", status: 400 };
  }

  const collection = await getPermission({ userId, linkId });
  if (
    !collection ||
    (collection.ownerId !== userId &&
      !collection.members.some((member) => member.userId === userId))
  ) {
    return { response: "Collection is not accessible.", status: 401 };
  }

  const link = await prisma.link.update({
    where: { id: linkId },
    data: {
      readBy: parsed.data.isRead
        ? { connect: { id: userId } }
        : { disconnect: { id: userId } },
    },
    select: {
      id: true,
      readBy: { where: { id: userId }, select: { id: true } },
    },
  });

  return { response: link, status: 200 };
}
