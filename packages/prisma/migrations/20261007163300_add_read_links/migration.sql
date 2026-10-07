-- Personal read status, independent of collection edit permissions.
CREATE TABLE "_ReadLinks" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

CREATE UNIQUE INDEX "_ReadLinks_AB_unique" ON "_ReadLinks"("A", "B");
CREATE INDEX "_ReadLinks_B_index" ON "_ReadLinks"("B");

ALTER TABLE "_ReadLinks" ADD CONSTRAINT "_ReadLinks_A_fkey" FOREIGN KEY ("A") REFERENCES "Link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ReadLinks" ADD CONSTRAINT "_ReadLinks_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
