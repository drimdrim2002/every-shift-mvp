export interface Shift {
  id: string // UUID
  organizationId: string
  code: string // "D", "E", "N", "O"
  name: string // "Day", "Evening", "Night", "Off"
  colorCode: string // "#92D050", "#FFC000", "#4472C4", "#D9D9D9"
  startTime: string | null // "08:00:00" or null for Off
  endTime: string | null // "16:00:00" or null for Off
  createdAt?: string
}
