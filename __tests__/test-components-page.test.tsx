// @ts-nocheck
/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// This will fail initially because the page doesn't exist yet
import TestComponentsPage from '@/app/test-components/page'

describe('Test Components Page', () => {
  it('renders page with all component examples', () => {
    render(<TestComponentsPage />)

    // Should have page title
    expect(screen.getByText('Component Test Page')).toBeInTheDocument()

    // Should have button examples
    expect(screen.getByText('Primary Button')).toBeInTheDocument()
    expect(screen.getByText('Destructive Button')).toBeInTheDocument()

    // Should have card example
    expect(screen.getByText('Test Card Title')).toBeInTheDocument()

    // Should have input examples
    expect(screen.getByPlaceholderText('Text input')).toBeInTheDocument()

    // Should have textarea
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument()

    // Should have alert
    expect(screen.getByText('Test Alert - Default')).toBeInTheDocument()
    expect(screen.getByText('Destructive Alert')).toBeInTheDocument()

    // Should have tabs
    expect(screen.getByText('Tab One')).toBeInTheDocument()
    expect(screen.getByText('Tab Two')).toBeInTheDocument()
  })
})
