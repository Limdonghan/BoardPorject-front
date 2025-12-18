import apiClient from "./axios";

export const postAPI = {
  // 게시글 목록 조회
  getPostList: async (page = 0, size = 10) => {
    const response = await apiClient.get("/api/post/lists", {
      params: { page, size },
    });
    return response.data;
  },

  // 카테고리별 게시글 목록
  getCategoryPostList: async (categoryId, page = 0, size = 10) => {
    const response = await apiClient.get(`/api/post/${categoryId}/lists`, {
      params: { page, size },
    });
    return response.data;
  },

  // 게시글 상세 조회
  getPost: async id => {
    const response = await apiClient.get(`/api/post/${id}`);
    return response.data;
  },

  // 게시글 작성
  createPost: async (title, category, context, imageUrls = []) => {
    const response = await apiClient.post("/api/post", {
      title,
      category,
      context,
      imageUrl: imageUrls,
    });
    return response.data;
  },

  // 게시글 수정
  updatePost: async (id, title, category, context, imageUrls = []) => {
    const response = await apiClient.patch(`/api/post/${id}`, {
      title,
      category,
      context,
      imageUrl: imageUrls,
    });
    return response.data;
  },

  // 게시글 삭제
  deletePost: async id => {
    const response = await apiClient.delete(`/api/post/${id}`);
    return response.data;
  },

  // 게시글 반응 (좋아요/싫어요)
  addReaction: async (id, reactionType) => {
    const response = await apiClient.post(`/api/post/${id}/reactions`, {
      reactionType: reactionType, // 백엔드 DTO 필드명이 rectionType
    });
    return response.data;
  },

  // 내 게시글 목록
  getMyPosts: async () => {
    const response = await apiClient.get("/api/post/my");
    return response.data;
  },

  // 게시글 검색
  searchPosts: async query => {
    const response = await apiClient.get("/api/post/search", {
      params: { query },
    });
    return response.data;
  },
};
