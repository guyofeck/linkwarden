import { prisma } from "@linkwarden/prisma";
import getPermission from "@/lib/api/getPermission";

export default async function setLinkReadStatus(
  userId: number,
  linkId: number,
  isRead: unknown
) {
  if (
    !Number.isSafeInteger(linkId) ||
    linkId <= 0 ||
    typeof isRead !== "boolean"
  ) {
    return {
      response: "A valid link and boolean isRead are required.",
      status: 400,
    };
  }

  const collection = await getPermission({ userId, linkId });
  if (
    !collection ||
    (collection.ownerId !== userId &&
      !collection.members.some((member) => member.userId === userId))
  ) {
    return { response: "Collection is not accessible.", status: 401 };
  }

  // Reading is personal; even a viewer can update their own read status.
  const link = await prisma.link.update({
    where: { id: linkId },
    data: {
      readBy: isRead
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
