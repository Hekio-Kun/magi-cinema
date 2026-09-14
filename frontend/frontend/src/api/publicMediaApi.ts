import apiClient from "./api";

export interface PublicAudioTrack {
  title: string;
  artist: string;
  url: string;
}

export const publicMediaService = {
  getAudioTracks: async (): Promise<PublicAudioTrack[]> => {
    const response = await apiClient.get("/public/audio");
    return Array.isArray(response.data?.result) ? response.data.result : [];
  },
};
