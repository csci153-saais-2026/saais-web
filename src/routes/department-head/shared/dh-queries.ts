import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDepartmentHeadQueryKey } from "./use-dh-query-key";
import { useHeadDepartmentIds } from "./use-head-department-ids";
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
  useQuery({
    queryKey: useDepartmentHeadQueryKey(keys.students),
    queryFn: getDirectoryStudents,
  });
export const useDepartmentAdvisers = () => {
  const departmentIds = useHeadDepartmentIds();
  return useQuery({
    queryKey: useDepartmentHeadQueryKey(keys.advisers),
    queryFn: () => getDepartmentAdvisers(departmentIds),
  });
};
export const useAuditEvents = () =>
  useQuery({
    queryKey: useDepartmentHeadQueryKey(keys.audit),
    queryFn: () => getAuditEvents(),
  });
export const useStudentAuditEvents = (studentId: string) =>
  useQuery({
    queryKey: [...useDepartmentHeadQueryKey(keys.audit), studentId],
    queryFn: () => getAuditEvents(studentId),
  });
export const useDepartmentSettings = () =>
  useQuery({
    queryKey: useDepartmentHeadQueryKey(keys.settings),
    queryFn: getSettings,
  });
export const useLastEncodingClosure = () =>
  useQuery({
    queryKey: useDepartmentHeadQueryKey(keys.closure),
    queryFn: getLastEncodingClosure,
  });

export function useReassignStudents() {
  const client = useQueryClient();
  const studentKey = useDepartmentHeadQueryKey(keys.students);
  const auditKey = useDepartmentHeadQueryKey(keys.audit);
  return useMutation({
    mutationFn: reassignStudents,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: studentKey }),
        client.invalidateQueries({ queryKey: auditKey }),
      ]),
  });
}

function useSettingsMutation<T>(
  fn: (value: T) => ReturnType<typeof getSettings>,
) {
  const client = useQueryClient();
  const settingsKey = useDepartmentHeadQueryKey(keys.settings);
  const auditKey = useDepartmentHeadQueryKey(keys.audit);
  return useMutation({
    mutationFn: fn,
    onSuccess: (settings) => {
      client.setQueryData(settingsKey, settings);
      return client.invalidateQueries({ queryKey: auditKey });
    },
  });
}

export const useSaveThresholds = () => useSettingsMutation(saveThresholds);
export const useSaveSenderEmail = () => useSettingsMutation(saveSenderEmail);
export const useRecordBackup = () => useSettingsMutation(recordBackup);
