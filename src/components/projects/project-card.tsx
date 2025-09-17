import type { Project } from "@/collections/projects";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ColorValue } from "@/lib/colors";
import { motion } from "motion/react";
import { useCallback, useMemo } from "react";

type ProjectCardProps = {
  project: Project;
  noteCount?: number;
  onClick?: (projectId: string) => void;
};

export function ProjectCard({
  project,
  noteCount = 0,
  onClick,
}: ProjectCardProps) {
  const createdDate = useMemo(() => {
    try {
      return new Date(project.createdAt).toLocaleDateString();
    } catch {
      return "";
    }
  }, [project.createdAt]);

  const handleClick = useCallback(() => {
    onClick?.(project.id);
  }, [onClick, project.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card
        className="relative cursor-pointer hover:shadow-lg transition"
        onClick={handleClick}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
          style={{
            background:
              "radial-gradient(120px 80px at 80% 0%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 70%)",
          }}
          aria-hidden
        />
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {project.color && (
                <span
                  className="inline-block h-3 w-3 rounded-full border"
                  style={{ backgroundColor: project.color as ColorValue }}
                  aria-hidden
                />
              )}
              <CardTitle className="text-base line-clamp-1">
                {project.name}
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">{createdDate}</span>
          </div>
          {project.excerpt && (
            <CardDescription className="line-clamp-3">
              {project.excerpt}
            </CardDescription>
          )}
          <div className="text-xs text-muted-foreground">{noteCount} notes</div>
        </CardHeader>
      </Card>
    </motion.div>
  );
}
