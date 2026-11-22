import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAuditEvents,
  getDepartmentAdvisers,
  getDirectoryStudents,
  getLastEncodingClosure,
  getSettings,
  recordBackup,
  reassignStudents,
  saveSenderEmail,
  saveThresholds,
} from "./dh-api";

const keys = {
  students: ["department-head", "students"],
  advisers: ["department-head", "advisers"],
  audit: ["department-head", "audit"],
  settings: ["department-head", "settings"],
  closure: ["department-head", "encoding-closure"],
} as const;

export const useDirectoryStudents = () =>
  useQuery({ queryKey: keys.students, queryFn: getDirectoryStudents });
export const useDepartmentAdvisers = () =>
  useQuery({ queryKey: keys.advisers, queryFn: getDepartmentAdvisers });
export const useAuditEvents = () =>
  useQuery({ queryKey: keys.audit, queryFn: () => getAuditEvents() });
export const useStudentAuditEvents = (studentId: string) =>
  useQuery({
    queryKey: [...keys.audit, studentId],
    queryFn: () => getAuditEvents(studentId),
  });
export const useDepartmentSettings = () =>
  useQuery({ queryKey: keys.settings, queryFn: getSettings });
export const useLastEncodingClosure = () =>
  useQuery({ queryKey: keys.closure, queryFn: getLastEncodingClosure });

export function useReassignStudents() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: reassignStudents,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: keys.students }),
        client.invalidateQueries({ queryKey: keys.audit }),
      ]),
  });
}

function useSettingsMutation<T>(
  fn: (value: T) => ReturnType<typeof getSettings>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (settings) => {
      client.setQueryData(keys.settings, settings);
      return client.invalidateQueries({ queryKey: keys.audit });
    },
  });
}

export const useSaveThresholds = () => useSettingsMutation(saveThresholds);
export const useSaveSenderEmail = () => useSettingsMutation(saveSenderEmail);
export const useRecordBackup = () => useSettingsMutation(recordBackup);
