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
  const branchesData = useQuery(api.branches.list, {
    limit: 1000, // Obtener todas las branches
    offset: 0,
  }) as { branches: Doc<"branches">[]; total: number } | undefined;
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

  const branches = useMemo(() => branchesData?.branches ?? [], [branchesData]);

  // Validar que el branchId del localStorage pertenezca a las branches del usuario actual
  // Esto previene ejecutar queries con branchIds de otros usuarios
  const validBranchId = useMemo(() => {
    if (!branchIdState || !branches || branches.length === 0) {
      return null;
    }
    const exists = branches.some((branch) => (branch._id as string) === branchIdState);
    return exists ? branchIdState : null;
  }, [branchIdState, branches]);

  // Limpiar branchId inválido del estado y localStorage
  useEffect(() => {
    if (!branches || branches.length === 0) {
      return;
    }

    if (branchIdState && !validBranchId) {
      // El branchId no pertenece al usuario actual, limpiarlo
      setBranchId("");
    }
  }, [branches, branchIdState, validBranchId, setBranchId]);

  // Solo ejecutar la query si el branchId es válido
  const activeShift = useQuery(
    api.shifts.active,
    validBranchId ? ({ branchId: validBranchId as Id<"branches"> } as const) : "skip"
  ) as ActiveShiftResult;

  const isLoadingShift = validBranchId !== null && validBranchId !== "" && activeShift === undefined;

  const summary = useMemo(() => {
    if (!activeShift || activeShift === undefined) {
      return null;
    }
    return activeShift;
  }, [activeShift]);

  const branch = useMemo(() => {
    if (!validBranchId) {
      return null;
    }
    return branches.find((item) => (item._id as string) === validBranchId) ?? null;
  }, [branches, validBranchId]);

  const isLoadingBranches = branchesData === undefined;

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

