import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as settingsApi from '@/api/organization-settings'
import * as siteApi from '@/api/site'
import * as skillApi from '@/api/skill'
import * as rankApi from '@/api/rank'
import type { OrganizationSettings, OrganizationSettingsSaveInput } from '@/types/organization'
import type { Site } from '@/types/site'
import type { Skill } from '@/types/skill'
import type { Rank } from '@/types/rank'

/**
 * Organization Master Store
 * Manages settings, sites, skills, and ranks for the current organization.
 * Kept separate from organization.ts to prevent that store growing beyond 300 lines.
 */
export const useOrganizationMasterStore = defineStore('organization-master', () => {
  // State
  const settings = ref<OrganizationSettings | null>(null)
  const sites = ref<Site[]>([])
  const skills = ref<Skill[]>([])
  const ranks = ref<Rank[]>([])
  const loading = ref(false)

  // ─── Settings ────────────────────────────────────────────────────────────

  async function loadSettings(orgId: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    try {
      settings.value = await settingsApi.loadSettings(orgId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(
    orgId: string,
    data: OrganizationSettingsSaveInput
  ): Promise<{ success: boolean; error?: string }> {
    try {
      settings.value = await settingsApi.upsertSettings(orgId, data)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  // ─── Sites ───────────────────────────────────────────────────────────────

  async function loadSites(orgId: string): Promise<{ success: boolean; error?: string }> {
    try {
      sites.value = await siteApi.loadSites(orgId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  async function addSite(
    orgId: string,
    siteData: Omit<Site, 'id' | 'organizationId' | 'createdAt'>
  ): Promise<{ success: boolean; site?: Site; error?: string }> {
    try {
      const newSite = await siteApi.createSite(orgId, siteData)
      sites.value = [...sites.value, newSite]
      return { success: true, site: newSite }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  async function editSite(
    siteId: string,
    siteData: Partial<Omit<Site, 'id' | 'organizationId' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await siteApi.updateSite(siteId, siteData)
      sites.value = sites.value.map((s) => (s.id === siteId ? { ...s, ...siteData } : s))
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  async function removeSite(siteId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await siteApi.deleteSite(siteId)
      sites.value = sites.value.filter((s) => s.id !== siteId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  // ─── Skills ──────────────────────────────────────────────────────────────

  async function loadSkills(orgId: string): Promise<{ success: boolean; error?: string }> {
    try {
      skills.value = await skillApi.loadSkills(orgId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  async function addSkill(
    orgId: string,
    skillData: Omit<Skill, 'id' | 'organizationId' | 'createdAt'>
  ): Promise<{ success: boolean; skill?: Skill; error?: string }> {
    try {
      const newSkill = await skillApi.createSkill(orgId, skillData)
      skills.value = [...skills.value, newSkill]
      return { success: true, skill: newSkill }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  async function editSkill(
    skillId: string,
    skillData: Partial<Omit<Skill, 'id' | 'organizationId' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await skillApi.updateSkill(skillId, skillData)
      skills.value = skills.value.map((s) => (s.id === skillId ? { ...s, ...skillData } : s))
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  async function removeSkill(skillId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await skillApi.deleteSkill(skillId)
      skills.value = skills.value.filter((s) => s.id !== skillId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  // ─── Ranks ───────────────────────────────────────────────────────────────

  async function loadRanks(orgId: string): Promise<{ success: boolean; error?: string }> {
    try {
      ranks.value = await rankApi.loadRanks(orgId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  async function addRank(
    orgId: string,
    rankData: Omit<Rank, 'id' | 'organizationId' | 'createdAt'>
  ): Promise<{ success: boolean; rank?: Rank; error?: string }> {
    try {
      const newRank = await rankApi.createRank(orgId, rankData)
      ranks.value = [...ranks.value, newRank]
      return { success: true, rank: newRank }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  async function editRank(
    rankId: string,
    rankData: Partial<Omit<Rank, 'id' | 'organizationId' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await rankApi.updateRank(rankId, rankData)
      ranks.value = ranks.value.map((r) => (r.id === rankId ? { ...r, ...rankData } : r))
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  async function removeRank(rankId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await rankApi.deleteRank(rankId)
      ranks.value = ranks.value.filter((r) => r.id !== rankId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Load all master data for an organization in parallel. */
  async function loadAll(orgId: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true
    try {
      await Promise.all([
        loadSettings(orgId),
        loadSites(orgId),
        loadSkills(orgId),
        loadRanks(orgId),
      ])
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  function resetStore(): void {
    settings.value = null
    sites.value = []
    skills.value = []
    ranks.value = []
    loading.value = false
  }

  return {
    // State
    settings,
    sites,
    skills,
    ranks,
    loading,
    // Actions — Settings
    loadSettings,
    saveSettings,
    // Actions — Sites
    loadSites,
    addSite,
    editSite,
    removeSite,
    // Actions — Skills
    loadSkills,
    addSkill,
    editSkill,
    removeSkill,
    // Actions — Ranks
    loadRanks,
    addRank,
    editRank,
    removeRank,
    // Actions — Helpers
    loadAll,
    resetStore,
  }
})
