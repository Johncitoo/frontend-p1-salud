// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

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
