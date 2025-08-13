import { BaseApiService, ApiResponse } from "./base";
import type { Tag } from "@/types/tag";

export interface TagsResponse {
  data: Tag[];
  count: number;
}

export class TagsApiService extends BaseApiService {
  private readonly basePath = "/tags";

  async getTags(): Promise<ApiResponse<TagsResponse>> {
    return this.get<TagsResponse>(this.basePath);
  }
}

export const tagsApi = new TagsApiService();
