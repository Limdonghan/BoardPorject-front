import apiClient from "./axios";

export const reportAPI = {
  // 게시글 신고
  reportPost: async (postId, reasonId) => {
    const response = await apiClient.post(`/api/report/posts/${postId}`, {
      reasonId,
    });
    return response.data;
  },

  // 댓글 신고
  reportComment: async (commentId, reasonId) => {
    const response = await apiClient.post(`/api/report/comments/${commentId}`, {
      reasonId,
    });
    return response.data;
  },
};
