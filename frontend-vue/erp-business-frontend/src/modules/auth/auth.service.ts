import apiClient from '@/api/axios-client';

import type { LoginPayload, LoginResponse } from './interfaces/auth.interface';
import { toLoginResponse, type LoginResponseDto } from './interfaces/auth.mapper';

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponseDto>('/auth/login', payload);
  return toLoginResponse(data);
}
