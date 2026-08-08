import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the Ascend project home scaffold', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Ascend' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Open Project' })
    ).toBeInTheDocument()
  })
})
