# Current mockup runtime

Open `index.html` or `prototype.html` from a local static server.

`prototype.html` owns the bundled layout, landing interactions and presentation controls. It loads `assets/model.js` (fictional records and calculations) and `assets/app.js` (current product screens/workflows), plus its existing logo assets. These are the editable runtime sources.

Do not regenerate this prototype with `_gen/build-prototype.js`: the legacy generator/artboards are older than the actual runtime and would overwrite confirmed changes. They remain as historical design material, not authoritative sources. No historical source files were deleted.

All mockup changes stay in browser demo storage; production records require the database described by the SRS. The assistant is a clearly labeled, record-grounded demo preview, not a connected AI service. Production documentation is specified separately; this help screen is a preview.

The sample catalog uses distinct demo codes for the two thesis requirements. Academic course codes and full official curricula must be supplied as real institutional data in production.

School terms now store an explicit actual end date. The historical sample calendar dates initialize fictional demo terms; the term editor requires an actual end date, and new INC defaults use one calendar year after it. Editing the date does not rewrite existing INC deadlines.
