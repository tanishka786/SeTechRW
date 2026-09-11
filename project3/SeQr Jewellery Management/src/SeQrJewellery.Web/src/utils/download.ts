import { apiClient } from '../api/client'

/**
 * Downloads a binary API response (e.g. an .xlsx or .pdf export endpoint) and saves it
 * client-side using an anchor + blob URL, honouring the filename passed in.
 */
export async function downloadFile(url: string, params: Record<string, unknown> | undefined, fallbackFileName: string) {
  const response = await apiClient.get(url, { params, responseType: 'blob' })
  const disposition = response.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const fileName = match?.[1] ?? fallbackFileName

  const blobUrl = window.URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}
