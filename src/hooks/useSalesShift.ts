import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

export type ShiftSummary = {
  shift: Doc<"shifts">;
  cashSalesTotal: number;
  expectedCash: number;
};

type ActiveShiftResult = ShiftSummary | null | undefined;

export const AREA_STORAGE_KEY = "invento:lastArea";
export const BRANCH_STORAGE_KEY = "sales:lastBranchId";

const getStoredBranchId = () => {
  if (typeof window === "undefined") {
    return "";
  }
  const lastArea = window.localStorage.getItem(AREA_STORAGE_KEY);
  if (lastArea !== "sales") {
    return "";
  }
  return window.localStorage.getItem(BRANCH_STORAGE_KEY) ?? "";
};

let branchIdStore = getStoredBranchId();
const branchSubscribers = new Set<(value: string) => void>();

const notifyBranchSubscribers = () => {
  branchSubscribers.forEach((callback) => callback(branchIdStore));
};

const updateBranchStore = (value: string) => {
  branchIdStore = value;
  if (typeof window !== "undefined") {
    if (value) {
      window.localStorage.setItem(BRANCH_STORAGE_KEY, value);
      window.localStorage.setItem(AREA_STORAGE_KEY, "sales");
    } else {
      window.localStorage.removeItem(BRANCH_STORAGE_KEY);
    }
  }
  notifyBranchSubscribers();
};

export const clearBranchSelection = () => updateBranchStore("");

export const useSalesShift = () => {
  const branchesQuery = useQuery(api.branches.list) as Doc<"branches">[] | undefined;
  const [branchIdState, setBranchIdState] = useState<string>(branchIdStore);

  useEffect(() => {
    const listener = (value: string) => setBranchIdState(value);
    branchSubscribers.add(listener);
    return () => {
      branchSubscribers.delete(listener);
    };
  }, []);

  const setBranchId = useCallback((id: string) => {
    updateBranchStore(id ?? "");
  }, []);

  useEffect(() => {
    if (branchIdStore !== branchIdState) {
      setBranchId(branchIdState);
    }
  }, [branchIdState, setBranchId]);

  useEffect(() => {
    if (!branchesQuery || branchesQuery.length === 0 || !branchIdState) {
      return;
    }

    const exists = branchesQuery.some((branch) => (branch._id as string) === branchIdState);
    if (!exists) {
      setBranchId("");
    }
  }, [branchesQuery, branchIdState, setBranchId]);

  const activeShift = useQuery(
    api.shifts.active,
    branchIdState ? ({ branchId: branchIdState as Id<"branches"> } as const) : "skip"
  ) as ActiveShiftResult;

  const isLoadingShift = branchIdState !== "" && activeShift === undefined;

  const summary = useMemo(() => {
    if (!activeShift || activeShift === undefined) {
      return null;
    }
    return activeShift;
  }, [activeShift]);

  const branches = useMemo(() => branchesQuery ?? [], [branchesQuery]);
  const branch = useMemo(() => {
    if (!branchIdState) {
      return null;
    }
    return branches.find((item) => (item._id as string) === branchIdState) ?? null;
  }, [branches, branchIdState]);

  const isLoadingBranches = branchesQuery === undefined;

  return {
    branches,
    isLoadingBranches,
    branchId: branchIdState,
    setBranchId,
    branch,
    activeShift: summary,
    isLoadingShift,
  };
};

