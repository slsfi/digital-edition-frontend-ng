export interface CommentsApiResponse {
  content: string;
  id: string;
}

export interface Comments {
  html: string;
  id: string;
}

export const toComments = (c: CommentsApiResponse): Comments => ({
  html: c.content,
  id: c.id,
});
