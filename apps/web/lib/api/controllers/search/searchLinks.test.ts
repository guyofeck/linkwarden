import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@linkwarden/prisma";
import searchLinks from "./searchLinks";

const mocks = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@linkwarden/prisma", () => ({
  prisma: { link: { findMany: vi.fn() } },
}));
vi.mock("@linkwarden/lib/meilisearchClient", () => ({
  meiliClient: { index: () => ({ search: mocks.search }) },
}));
vi.mock("@/lib/api/getAccessibleCollectionIds", () => ({
  default: vi
    .fn()
    .mockResolvedValue({
      accessibleCollectionIds: [3],
      memberCollectionIds: [],
    }),
}));

describe("hide read links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.link.findMany).mockResolvedValue([]);
  });

  it("filters by this reader before database pagination", async () => {
    await searchLinks({
      userId: 7,
      query: { collectionId: 3, hideRead: true },
    });
    expect(prisma.link.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            { collectionId: { in: [3] } },
            { readBy: { none: { id: 7 } } },
            { collection: { id: 3 } },
          ]),
        },
        include: expect.objectContaining({
          readBy: { where: { id: 7 }, select: { id: true } },
        }),
      })
    );
  });

  it("returns all links when the filter is off", async () => {
    await searchLinks({ userId: 7, query: { hideRead: false } });
    const args = vi.mocked(prisma.link.findMany).mock.calls[0][0] as any;
    expect(args.where.AND).not.toContainEqual({ readBy: { none: { id: 7 } } });
  });

  it("excludes read search matches before search pagination", async () => {
    vi.mocked(prisma.link.findMany)
      .mockResolvedValueOnce([{ id: 12 }] as any)
      .mockResolvedValueOnce([{ id: 13 }] as any);
    mocks.search.mockResolvedValue({ hits: [{ id: 13 }] });
    const result = await searchLinks({
      userId: 7,
      query: { hideRead: true, searchQueryString: "article" },
    });
    expect(mocks.search).toHaveBeenCalledWith(
      "article",
      expect.objectContaining({
        filter: expect.arrayContaining(["id NOT IN [12]"]),
      })
    );
    expect(result.data).toEqual({ links: [{ id: 13 }], nextCursor: null });
  });

  it("doesn't expose personal read status on public searches", async () => {
    await searchLinks({ publicOnly: true, query: { hideRead: true } });
    const args = vi.mocked(prisma.link.findMany).mock.calls[0][0] as any;
    expect(args.include.readBy).toBeUndefined();
    expect(args.where.AND).not.toContainEqual({ readBy: { none: { id: 7 } } });
  });
});
