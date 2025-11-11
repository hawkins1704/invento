import type { Doc, Id } from "../../convex/_generated/dataModel";

export type ProductListItem = Doc<"products"> & {
  imageUrl: string | null;
  categoryName: string;
  totalStock: number;
  stockByBranch: {
    branchId: Id<"branches">;
    branchName: string;
    stock: number;
  }[];
};

