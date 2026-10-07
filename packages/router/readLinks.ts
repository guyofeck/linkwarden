import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSetLinkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      linkId,
      isRead,
    }: {
      linkId: number;
      isRead: boolean;
    }) => {
      const response = await fetch(`/api/v1/links/${linkId}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.response);
      return data.response;
    },
    onSuccess: async (_data, { linkId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["links"] }),
        queryClient.invalidateQueries({ queryKey: ["link", linkId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] }),
      ]);
    },
  });
}
