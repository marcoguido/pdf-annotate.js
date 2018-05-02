# pdf-annotate.js

Annotation layer for [pdf.js](https://github.com/mozilla/pdf.js)

## Objectives

- Provide a low level annotation layer for [pdf.js](https://github.com/mozilla/pdf.js).
- Optional high level UI for managing annotations.
- Agnostic of backend, just supply your own `StoreAdapter` to fetch/store data.
- Prescribe annotation format.

## Example

```js
import __pdfjs from 'pdfjs-dist/build/pdf';
import PDFJSAnnotate from 'pdfjs-annotate';
import MyStoreAdapter from './myStoreAdapter';

const { UI } = PDFJSAnnotate;
const VIEWER = document.getElementById('viewer');
const RENDER_OPTIONS = {
  documentId: 'MyPDF.pdf',
  pdfDocument: null,
  scale: 1,
  rotate: 0
};

PDFJS.workerSrc = 'pdf.worker.js';
PDFJSAnnotate.setStoreAdapter(MyStoreAdapter);

PDFJS.getDocument(RENDER_OPTIONS.documentId).then((pdf) => {
  RENDER_OPTIONS.pdfDocument = pdf;
  VIEWER.appendChild(UI.createPage(1));
  UI.renderPage(1, RENDER_OPTIONS);
});
```

## Documentation

[View the docs](https://github.com/marcoguido/pdf-annotate.js/blob/master/docs/README.md).
Run the last built [DEMO](https://marcoguido.github.io/pdf-annotate.js/demo/).

## Developing

```bash
# clone the repo
$ git clone https://github.com/marcoguido/pdf-annotate.js.git
$ cd pdf-annotate.js

# install dependencies
$ npm install

# start example server
$ npm start
$ open http://localhost:8080

# only build the demo application
$ npm run build-demo

```
## License

MIT

## Additional information 
Project forked from Instructure's [pdf-annotate.js](https://github.com/instructure/pdf-annotate.js) repository.
