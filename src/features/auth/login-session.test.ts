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

import { getMockProfileFromStorage, loginWithMockRole, logoutMock } from './mockAuth'

afterEach(() => {
  logoutMock()
})

describe('login session resolution', () => {
  it('resolves a profile locally from the stored mock session', () => {
    loginWithMockRole('COORDINADOR')

    const profile = getMockProfileFromStorage()

    expect(profile).toMatchObject({
      identityUserId: 'mock-coordinador',
      apellidos: 'Coordinador',
      rol: 'COORDINADOR',
      email: 'coordinador@mock.local',
    })
  })

  it('returns null when there is no mock session', () => {
    expect(getMockProfileFromStorage()).toBeNull()
  })
})
