import apiClient from "./axios";

export const commentAPI = {
  // 댓글 목록 조회
  getComments: async postId => {
    const response = await apiClient.get(`/api/post/${postId}/comment`);
    return response.data;
  },

  // 댓글 작성
  createComment: async (postId, content) => {
    const response = await apiClient.post(`/api/post/${postId}/comment`, {
      comment: content, // 백엔드 DTO 필드명이 comment
    });
    return response.data;
  },

  // 댓글 수정
  updateComment: async (postId, commentId, content) => {
    const response = await apiClient.patch(
      `/api/post/${postId}/comment/${commentId}`,
      {
        comment: content, // 백엔드 DTO 필드명이 comment
      }
    );
    return response.data;
  },

  // 댓글 삭제
  deleteComment: async (postId, commentId) => {
    const response = await apiClient.delete(
      `/api/post/${postId}/comment/${commentId}`
    );
    return response.data;
  },
};
