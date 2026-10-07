import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@linkwarden/prisma";
import getPermission from "@/lib/api/getPermission";
import setLinkRead from "./setLinkRead";

vi.mock("@linkwarden/prisma", () => ({
  prisma: { link: { update: vi.fn() } },
}));
vi.mock("@/lib/api/getPermission", () => ({ default: vi.fn() }));

describe("personal link read status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPermission).mockResolvedValue({
      ownerId: 7,
      members: [],
    } as any);
    vi.mocked(prisma.link.update).mockResolvedValue({
      id: 12,
      readBy: [{ id: 7 }],
    } as any);
  });

  it("marks a link read only for the authenticated user", async () => {
    const result = await setLinkRead(7, 12, { isRead: true, userId: 99 });
    expect(result.status).toBe(200);
    expect(prisma.link.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { readBy: { connect: { id: 7 } } },
      select: { id: true, readBy: { where: { id: 7 }, select: { id: true } } },
    });
  });

  it("marks a link unread without disconnecting other readers", async () => {
    await setLinkRead(7, 12, { isRead: false });
    expect(prisma.link.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { readBy: { disconnect: { id: 7 } } },
      })
    );
  });

  it("allows read-only collection members to track their own reading", async () => {
    vi.mocked(getPermission).mockResolvedValue({
      ownerId: 1,
      members: [{ userId: 7, canUpdate: false }],
    } as any);
    expect((await setLinkRead(7, 12, { isRead: true })).status).toBe(200);
  });

  it.each([null, { ownerId: 1, members: [] }])(
    "rejects inaccessible links",
    async (collection) => {
      vi.mocked(getPermission).mockResolvedValue(collection as any);
      expect((await setLinkRead(7, 12, { isRead: true })).status).toBe(401);
      expect(prisma.link.update).not.toHaveBeenCalled();
    }
  );

  it.each([{}, { isRead: "true" }, { isRead: null }])(
    "rejects invalid statuses",
    async (body) => {
      expect((await setLinkRead(7, 12, body)).status).toBe(400);
      expect(prisma.link.update).not.toHaveBeenCalled();
    }
  );

  it.each([0, -1, NaN, 1.5])("rejects invalid link IDs", async (id) => {
    expect((await setLinkRead(7, id, { isRead: true })).status).toBe(400);
    expect(prisma.link.update).not.toHaveBeenCalled();
  });
});
