import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateSystemConfigFn } from "@/features/config/api/config.api";
import { CONFIG_KEYS, systemConfigQuery } from "@/features/config/queries";
import { m } from "@/paraglide/messages";

export function useSystemSetting() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(systemConfigQuery);

  const saveMutation = useMutation({
    mutationFn: updateSystemConfigFn,
    onSuccess: (result) => {
      if (result.error) {
        toast.error(m.settings_toast_save_error());
        return;
      }

      Promise.all([
        queryClient.invalidateQueries({ queryKey: CONFIG_KEYS.system }),
        queryClient.invalidateQueries({ queryKey: CONFIG_KEYS.site }),
      ]);
    },
  });

  return {
    settings: data,
    isLoading,
    saveSettings: saveMutation.mutateAsync,
  };
}
