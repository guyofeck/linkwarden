import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@linkwarden/prisma";
import setLinkReadStatus from "./setLinkReadStatus";
import searchLinks from "../../search/searchLinks";

vi.mock("@linkwarden/lib/meilisearchClient", () => ({ meiliClient: null }));

const users: number[] = [];
let ownerId: number;
let viewerId: number;
let strangerId: number;
let collectionId: number;
let linkId: number;

beforeAll(async () => {
  for (let i = 0; i < 3; i++) {
    const user = await prisma.user.create({ data: {} });
    users.push(user.id);
  }
  [ownerId, viewerId, strangerId] = users;
  const collection = await prisma.collection.create({
    data: {
      name: "Read status test",
      ownerId,
      members: {
        create: {
          userId: viewerId,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
        },
      },
      links: {
        create: Array.from({ length: 4 }, (_, i) => ({
          name: `Link ${i}`,
          url: `https://example.com/${i}`,
        })),
      },
    },
    include: { links: { orderBy: { id: "desc" } } },
  });
  collectionId = collection.id;
  linkId = collection.links[0].id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  vi.unstubAllEnvs();
  await prisma.$disconnect();
});

describe.sequential("personal read status", () => {
  it("rejects malformed requests and inaccessible links", async () => {
    expect((await setLinkReadStatus(ownerId, linkId, "true")).status).toBe(400);
    expect((await setLinkReadStatus(ownerId, NaN, true)).status).toBe(400);
    expect((await setLinkReadStatus(strangerId, linkId, true)).status).toBe(
      401
    );
    expect((await setLinkReadStatus(ownerId, 2147483647, true)).status).toBe(
      401
    );
  });

  it("allows viewers to mark read without changing another user's status", async () => {
    expect((await setLinkReadStatus(viewerId, linkId, true)).status).toBe(200);
    expect((await setLinkReadStatus(viewerId, linkId, true)).status).toBe(200);
    const owner = await searchLinks({
      userId: ownerId,
      query: { collectionId },
    });
    const viewer = await searchLinks({
      userId: viewerId,
      query: { collectionId },
    });
    expect(
      (owner.data as any).links.find((link: any) => link.id === linkId).readBy
    ).toEqual([]);
    expect(
      (viewer.data as any).links.find((link: any) => link.id === linkId).readBy
    ).toEqual([{ id: viewerId }]);
  });

  it("filters before pagination so unread links fill each page", async () => {
    vi.stubEnv("PAGINATION_TAKE_COUNT", "2");
    const first = await searchLinks({
      userId: viewerId,
      query: { collectionId, hideRead: true },
    });
    const data = first.data as any;
    expect(data.links).toHaveLength(2);
    expect(data.links.every((link: any) => link.id !== linkId)).toBe(true);
    const second = await searchLinks({
      userId: viewerId,
      query: { collectionId, hideRead: true, cursor: data.nextCursor },
    });
    expect((second.data as any).links).toHaveLength(1);
    expect((second.data as any).nextCursor).toBeNull();
    const owner = await searchLinks({
      userId: ownerId,
      query: { collectionId, hideRead: true },
    });
    expect((owner.data as any).links[0].id).toBe(linkId);
  });

  it("can mark unread again and restores the link to filtered results", async () => {
    expect((await setLinkReadStatus(viewerId, linkId, false)).status).toBe(200);
    expect((await setLinkReadStatus(viewerId, linkId, false)).status).toBe(200);
    const result = await searchLinks({
      userId: viewerId,
      query: { collectionId, hideRead: true },
    });
    expect((result.data as any).links[0].id).toBe(linkId);
    expect((result.data as any).links[0].readBy).toEqual([]);
  });
});
