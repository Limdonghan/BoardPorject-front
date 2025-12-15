import apiClient from "./axios";

export const awsAPI = {
  // 이미지 업로드
  uploadImages: async (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("file", file);
    });
    
    const response = await apiClient.post("/api/file/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // 이미지 삭제
  deleteImages: async (imageUrls) => {
    const response = await apiClient.delete("/api/file/delete", {
      data: {
        imageUrls: imageUrls,
      },
    });
    return response.data;
  },
};

