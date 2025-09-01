import { createContext, useContext, type ReactNode } from 'react';
import { db, notesCollection, projectsCollection, pinnedNotes, activeProjects } from '@/lib/db';

type DbContextType = {
  db: typeof db;
  notes: typeof notesCollection;
  projects: typeof projectsCollection;
  pinnedNotes: typeof pinnedNotes;
  activeProjects: typeof activeProjects;
};

const DbContext = createContext<DbContextType | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  return (
    <DbContext.Provider
      value={{
        db,
        notes: notesCollection,
        projects: projectsCollection,
        pinnedNotes,
        activeProjects,
      }}
    >
      {children}
    </DbContext.Provider>
  );
}

export function useDb() {
  const context = useContext(DbContext);
  if (!context) {
    throw new Error('useDb must be used within a DbProvider');
  }
  return context;
}
