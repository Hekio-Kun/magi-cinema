import apiClient from "./api";

export const cloudinaryService = {
  uploadAudio: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/upload/audio", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.result;
  },
};
