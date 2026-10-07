import type { NextApiRequest, NextApiResponse } from "next";
import verifyUser from "@/lib/api/verifyUser";
import setLinkReadStatus from "@/lib/api/controllers/links/linkId/setLinkReadStatus";

export default async function read(req: NextApiRequest, res: NextApiResponse) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ response: "Method not allowed." });
  }
  if (process.env.NEXT_PUBLIC_DEMO === "true") {
    return res.status(400).json({
      response:
        "This action is disabled because this is a read-only demo of Linkwarden.",
    });
  }

  const result = await setLinkReadStatus(
    user.id,
    Number(req.query.id),
    req.body?.isRead
  );
  return res.status(result.status).json({ response: result.response });
}
