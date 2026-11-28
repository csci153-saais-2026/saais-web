import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Adviser from "./Adviser";

vi.mock("./AdviserLayout", () => ({ AdviserLayout: () => <Outlet /> }));
vi.mock("./record-grades/AdviserEncodeGrades", () => ({
  default: () => <Location />,
}));
vi.mock("./advisees/grades/AdviseeGradesPage", () => ({
  default: () => <Location />,
}));
vi.mock("./advisees/checklist/AdviseeChecklist", () => ({
  default: () => <Location />,
}));

function Location() {
  const { pathname, search } = useLocation();
  return <p>{`at ${pathname}${search}`}</p>;
}

afterEach(cleanup);

const id = "11111111-1111-4111-8111-111111111111";

it.each([
  [`advisees/${id}/record-grades`, `encode-grades?student=${id}`],
  ["enrollment/new", "encode-grades"],
  [`advisees/${id}/grades`, `advisee/${id}/grades`],
  [`advisees/${id}`, `advisee/${id}`],
])("redirects /adviser/%s", async (from, to) => {
  render(
    <MemoryRouter initialEntries={[`/adviser/${from}`]}>
      <Routes>
        <Route path="/adviser/*" element={<Adviser />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(`at /adviser/${to}`)).toBeTruthy();
});
