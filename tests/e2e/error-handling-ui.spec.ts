import { test, expect } from '@playwright/test'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { uploadTestDocument, generateTestDocument } from './fixtures/test-helpers'

test.describe('Error Handling UI', () => {
  test('shows toast notification on invalid file upload', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const invalidXml = 'invalid {{{ xml'
    const tempPath = join(process.cwd(), 'invalid-test.xml')
    writeFileSync(tempPath, invalidXml)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(tempPath)

    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText('Invalid TEI format', { timeout: 3000 })

    unlinkSync(tempPath)
  })

  test('toast auto-dismisses after 5 seconds', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const invalidXml = 'invalid {{{ xml'
    const tempPath = join(process.cwd(), 'invalid-auto.xml')
    writeFileSync(tempPath, invalidXml)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(tempPath)

    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible()
    await page.waitForTimeout(6000)
    await expect(toast).not.toBeVisible()

    unlinkSync(tempPath)
  })

  test('shows success toast on valid document upload', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const validXml = generateTestDocument({
      speakers: ['speaker1'],
      passages: 2
    })

    await uploadTestDocument(page, {
      name: 'valid-test.tei.xml',
      content: validXml
    })

    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText('uploaded successfully')
  })

  test('dismissible toasts can be closed manually', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const invalidXml = 'invalid {{{ xml'
    const tempPath = join(process.cwd(), 'invalid-close.xml')
    writeFileSync(tempPath, invalidXml)

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(tempPath)

    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible()

    const closeButton = toast.locator('button[aria-label="close"]')
    await closeButton.click()
    await expect(toast).not.toBeVisible()

    unlinkSync(tempPath)
  })

  test('multiple toasts stack correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const fileInput = page.locator('input[type="file"]')

    for (let i = 0; i < 3; i++) {
      const tempPath = join(process.cwd(), `invalid-stack-${i}.xml`)
      writeFileSync(tempPath, 'invalid {{{ xml')

      await fileInput.setInputFiles(tempPath)
      await page.waitForTimeout(500)

      unlinkSync(tempPath)
    }

    const toasts = page.locator('[data-sonner-toast]')
    await expect(toasts).toHaveCount(3)
  })
})
