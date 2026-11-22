import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCatalogCourse,
  createCurriculumSlot,
  createCurriculumTerm,
  createCurriculumVersion,
  deleteCurriculumSlot,
  deleteCurriculumTerm,
  deleteCurriculumVersion,
  updateCurriculumSlot,
  updateCurriculumTerm,
  updateCurriculumVersion,
} from "./curricula-api";

const KEY = ["department-head", "curricula"] as const;

export function useCurriculaActions() {
  const client = useQueryClient();
  const onSuccess = () => client.invalidateQueries({ queryKey: KEY });
  const createVersion = useMutation({
    mutationFn: createCurriculumVersion,
    onSuccess,
  });
  const updateVersion = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateCurriculumVersion>[1];
    }) => updateCurriculumVersion(id, input),
    onSuccess,
  });
  const deleteVersion = useMutation({
    mutationFn: deleteCurriculumVersion,
    onSuccess,
  });
  const createTerm = useMutation({
    mutationFn: ({
      versionId,
      year,
      sem,
    }: {
      versionId: string;
      year: number;
      sem: Parameters<typeof createCurriculumTerm>[2];
    }) => createCurriculumTerm(versionId, year, sem),
    onSuccess,
  });
  const updateTerm = useMutation({
    mutationFn: ({
      id,
      year,
      sem,
    }: {
      id: string;
      year: number;
      sem: Parameters<typeof updateCurriculumTerm>[2];
    }) => updateCurriculumTerm(id, year, sem),
    onSuccess,
  });
  const deleteTerm = useMutation({
    mutationFn: deleteCurriculumTerm,
    onSuccess,
  });
  const createSlot = useMutation({
    mutationFn: ({
      termId,
      name,
      units,
      type,
    }: {
      termId: string;
      name: string;
      units: number;
      type: Parameters<typeof createCurriculumSlot>[3];
    }) => createCurriculumSlot(termId, name, units, type),
    onSuccess,
  });
  const updateSlot = useMutation({
    mutationFn: ({
      id,
      name,
      units,
      type,
    }: {
      id: string;
      name: string;
      units: number;
      type: Parameters<typeof updateCurriculumSlot>[3];
    }) => updateCurriculumSlot(id, name, units, type),
    onSuccess,
  });
  const deleteSlot = useMutation({
    mutationFn: deleteCurriculumSlot,
    onSuccess,
  });
  const createCourse = useMutation({
    mutationFn: createCatalogCourse,
    onSuccess,
  });

  return {
    createVersion: (input: Parameters<typeof createCurriculumVersion>[0]) =>
      createVersion.mutateAsync(input),
    updateVersion: (
      id: string,
      input: Parameters<typeof updateCurriculumVersion>[1],
    ) => updateVersion.mutateAsync({ id, input }),
    deleteVersion: (id: string) => deleteVersion.mutateAsync(id),
    createTerm: (
      versionId: string,
      year: number,
      sem: Parameters<typeof createCurriculumTerm>[2],
    ) => createTerm.mutateAsync({ versionId, year, sem }),
    updateTerm: (
      id: string,
      year: number,
      sem: Parameters<typeof updateCurriculumTerm>[2],
    ) => updateTerm.mutateAsync({ id, year, sem }),
    deleteTerm: (id: string) => deleteTerm.mutateAsync(id),
    createSlot: (
      termId: string,
      name: string,
      units: number,
      type: Parameters<typeof createCurriculumSlot>[3],
    ) => createSlot.mutateAsync({ termId, name, units, type }),
    updateSlot: (
      id: string,
      name: string,
      units: number,
      type: Parameters<typeof updateCurriculumSlot>[3],
    ) => updateSlot.mutateAsync({ id, name, units, type }),
    deleteSlot: (id: string) => deleteSlot.mutateAsync(id),
    createCourse: (input: Parameters<typeof createCatalogCourse>[0]) =>
      createCourse.mutateAsync(input),
  };
}
