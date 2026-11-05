import type * as React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { SignInForm } from "./sign-in-form"

afterEach(cleanup)

function renderForm(props: Partial<React.ComponentProps<typeof SignInForm>> = {}) {
  const onSubmit = vi.fn()
  render(
    <MemoryRouter>
      <SignInForm onSubmit={onSubmit} {...props} />
    </MemoryRouter>
  )
  const email = screen.getByLabelText("Institutional email")
  const password = screen.getByLabelText("Password")
  const submit = () => fireEvent.click(screen.getByRole("button", { name: "Sign in" }))
  return { onSubmit, email, password, submit }
}

describe("SignInForm", () => {
  it("shows field errors and does not submit when empty", async () => {
    const { onSubmit, email, submit } = renderForm()
    submit()
    expect(await screen.findByText("Enter your institutional email.")).toBeTruthy()
    expect(screen.getByText("Enter your password.")).toBeTruthy()
    expect(email.getAttribute("aria-invalid")).toBe("true")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("rejects a malformed email", async () => {
    const { onSubmit, email, password, submit } = renderForm()
    fireEvent.change(email, { target: { value: "not-an-email" } })
    fireEvent.change(password, { target: { value: "secret" } })
    submit()
    expect(await screen.findByText("Enter a valid email address.")).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits trimmed values when valid", async () => {
    const { onSubmit, email, password, submit } = renderForm()
    fireEvent.change(email, { target: { value: "  student@school.edu " } })
    fireEvent.change(password, { target: { value: "secret" } })
    fireEvent.click(screen.getByRole("checkbox"))
    submit()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      email: "student@school.edu",
      password: "secret",
      keep: true,
    })
  })

  it("links to the SRS forgot-password route by default", () => {
    renderForm()
    expect(screen.getByRole("link", { name: "Forgot password?" }).getAttribute("href")).toBe(
      "/forgot-password"
    )
  })
})
