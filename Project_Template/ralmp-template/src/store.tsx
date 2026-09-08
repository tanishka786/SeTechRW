import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { blankProject, defaultMeta, demoProject } from "./seed";
import { applyDocumentTheme } from "./themes";
import type { PersistShape, ProjectData, ProjectMeta } from "./types";

const KEY = "template-io-v1";

const StoreContext = createContext<Store | null>(null);

export type Store = {
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  projects: ProjectData[];
  active: ProjectData;
  setActive: (id: string) => void;
  createProject: (meta: Omit<ProjectMeta, "id" | "createdAt">) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  patch: (fn: (p: ProjectData) => ProjectData) => void;
};

function withThemeDefaults(meta: ProjectMeta): ProjectMeta {
  return {
    ...meta,
    daisyTheme: meta.daisyTheme || "templateio",
    primary: meta.primary || meta.accent || "#7d9a70",
    secondary: meta.secondary || "#3d5a80",
    accent: meta.accent || "#d7c49a",
  };
}

function load(): PersistShape {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem("ralmp-template-v1");
    if (raw) {
      const parsed = JSON.parse(raw) as PersistShape;
      if (parsed.projects?.length) {
        return {
          ...parsed,
          projects: parsed.projects.map((p) => ({ ...p, meta: withThemeDefaults(p.meta) })),
        };
      }
    }
  } catch {
    /* ignore */
  }
  const demo = demoProject(defaultMeta());
  return { activeId: demo.meta.id, projects: [demo], theme: "dark" };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistShape>(() => load());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const active = state.projects.find((p) => p.meta.id === state.activeId) ?? state.projects[0];

  useEffect(() => {
    const m = withThemeDefaults(active.meta);
    applyDocumentTheme({
      mode: state.theme,
      daisyTheme: m.daisyTheme,
      primary: m.primary,
      secondary: m.secondary,
      accent: m.accent,
    });
  }, [state.theme, active]);

  const setTheme = useCallback((theme: "dark" | "light") => {
    setState((s) => ({ ...s, theme }));
  }, []);

  const setActive = useCallback((id: string) => {
    setState((s) => ({ ...s, activeId: id }));
  }, []);

  const createProject = useCallback((meta: Omit<ProjectMeta, "id" | "createdAt">) => {
    const full = withThemeDefaults({
      ...meta,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    const data = meta.seedDemo ? demoProject(full) : blankProject(full);
    data.meta = full;
    setState((s) => ({ ...s, projects: [...s.projects, data], activeId: full.id }));
  }, []);

  const duplicateProject = useCallback((id: string) => {
    setState((s) => {
      const src = s.projects.find((p) => p.meta.id === id);
      if (!src) return s;
      const copy: ProjectData = structuredClone(src);
      copy.meta = {
        ...copy.meta,
        id: crypto.randomUUID(),
        name: `${copy.meta.name} COPY`,
        shortName: `${copy.meta.shortName} Copy`,
        createdAt: new Date().toISOString(),
      };
      return { ...s, projects: [...s.projects, copy], activeId: copy.meta.id };
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setState((s) => {
      const projects = s.projects.filter((p) => p.meta.id !== id);
      if (!projects.length) {
        const demo = demoProject(defaultMeta());
        return { ...s, projects: [demo], activeId: demo.meta.id };
      }
      return { ...s, projects, activeId: s.activeId === id ? projects[0].meta.id : s.activeId };
    });
  }, []);

  const patch = useCallback((fn: (p: ProjectData) => ProjectData) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.meta.id === s.activeId ? fn(p) : p)),
    }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      theme: state.theme,
      setTheme,
      projects: state.projects,
      active,
      setActive,
      createProject,
      duplicateProject,
      deleteProject,
      patch,
    }),
    [state.theme, state.projects, active, setTheme, setActive, createProject, duplicateProject, deleteProject, patch],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
