The role folders are the source screens for `prototype.html`. The presentation loads those exact pages in a frame so filters, dialogs, grade tools, downloads, and role-specific navigation keep their own behavior. Sidebar links update the presentation URL; browser history and direct links select the same source page. This remains a local mockup with fictional records, not an authentication or authorization boundary.

Run `node mockup/_gen/build-prototype.js` from the repository root after changing a role page or running a role generator. It refreshes all 97 screen routes, the seven role entry points, the screen map, account menus, and the shared stylesheet/script references in the role folders. Do not edit generated `prototype-routes.js` by hand.

Preview with `npm run dev`, then open `http://localhost:5173/mockup/prototype.html`. Serving the prototype gives its role frames a shared origin for navigation and history. Run `node mockup/_gen/test-portals.cjs` for the DOM and routing checks; these do not replace browser visual verification.

`DesignSystem.dc.html` is the visual authority. `portal-ui.css` applies its 250px sidebar, 32px gutters, Syne headings, IBM Plex body text, 6px cards, 8px buttons, 4px fields, 1.6 icon strokes, and 768px drawer/table breakpoint to every role. `portal-ui.js` supplies the same accessible drawer controls and table labels across the portals. Original page workflows and role-specific profile options remain in their source files.

The presentation toolbar offers Student, Adviser, Department Head, Department Staff, System Admin, Dean Adviser, and Dean DH. The Dean sidebar always says **Dean portal**. Multi-role sections retain their native collapsible controls.
