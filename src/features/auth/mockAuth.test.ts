// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value.toString(); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  key: (index: number) => Object.keys(store)[index] || null,
  get length() { return Object.keys(store).length; },
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

import {
  createLocalMockProfile,
  getMockAuthHeaders,
  getMockSession,
  loginWithMockRole,
  logoutMock,
  mockUsers,
} from './mockAuth'

afterEach(() => {
  logoutMock()
})

describe('mockAuth', () => {
  it('stores the selected role in localStorage and exposes the session', () => {
    const selected = loginWithMockRole('SUPERVISOR')

    expect(selected.role).toBe('SUPERVISOR')
    expect(getMockSession()?.role).toBe('SUPERVISOR')
  })

  it('builds auth headers from the active mock session', () => {
    loginWithMockRole('ADMIN')

    expect(getMockAuthHeaders()).toEqual({
      'x-identity-user-id': 'mock-admin',
      'x-mock-role': 'ADMIN',
    })
  })

  it('creates a local profile without network access', () => {
    const profile = createLocalMockProfile(mockUsers[1])

    expect(profile).toEqual({
      id: 'mock-profesional',
      identityUserId: 'mock-profesional',
      nombres: 'Usuario',
      apellidos: 'Profesional',
      email: 'profesional@mock.local',
      rol: 'PROFESIONAL',
      activo: true,
    })
  })
})
