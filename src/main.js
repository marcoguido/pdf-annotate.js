import twitter from 'twitter-text';
import PDFJSAnnotate from '../';
import initColorPicker from '../shared/initColorPicker';
import { sync, broadcastVariations} from './utils/syncAnnotations';
import { addEventListener } from './UI/event';

const { UI } = PDFJSAnnotate;
const documentId = 'example.pdf';
let PAGE_HEIGHT;
let RENDER_OPTIONS = {
  documentId,
  pdfDocument: null,
  scale: parseFloat(localStorage.getItem(`${documentId}/scale`), 10) || 1.33,
  rotate: parseInt(localStorage.getItem(`${documentId}/rotate`), 10) || 0
};

PDFJSAnnotate.setStoreAdapter(new PDFJSAnnotate.LocalStoreAdapter());
PDFJS.workerSrc = './shared/pdf.worker.js';

// Render stuff
let NUM_PAGES = 0;
let renderedPages = {};
document.getElementById('content-wrapper').addEventListener('scroll', function (e) {
  let visiblePageNum = Math.round(e.target.scrollTop / PAGE_HEIGHT) + 1;
  let visiblePage = document.querySelector(`.page[data-page-number="${visiblePageNum}"][data-loaded="false"]`);
  if (visiblePage) {
    // Prevent invoking UI.renderPage on the same page more than once.
    if (!renderedPages[visiblePageNum]) {
      renderedPages[visiblePageNum] = true;
      setTimeout(function () {
        UI.renderPage(visiblePageNum, RENDER_OPTIONS);
      });
    }
  }
});

function render() {
  PDFJS.getDocument(RENDER_OPTIONS.documentId).then((pdf) => {
    RENDER_OPTIONS.pdfDocument = pdf;

    let viewer = document.getElementById('viewer');
    viewer.innerHTML = '';
    NUM_PAGES = pdf.pdfInfo.numPages;
    for (let i = 0; i < NUM_PAGES; i++) {
      let page = UI.createPage(i + 1);
      viewer.appendChild(page);
    }

    UI.renderPage(1, RENDER_OPTIONS).then(([pdfPage, annotations]) => {
      let viewport = pdfPage.getViewport(RENDER_OPTIONS.scale, RENDER_OPTIONS.rotate);
      PAGE_HEIGHT = viewport.height;
    });
  });
}
render();

// Text stuff
(function () {
  let textSize;
  let textColor;

  function initText() {
    let size = document.querySelector('.toolbar .text-size');
    [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96].forEach((s) => {
      size.appendChild(new Option(s, s));
    });

    setText(
      localStorage.getItem(`${RENDER_OPTIONS.documentId}/text/size`) || 10,
      localStorage.getItem(`${RENDER_OPTIONS.documentId}/text/color`) || '#000000'
    );

    initColorPicker(document.querySelector('.text-color'), textColor, function (value) {
      setText(textSize, value);
    });
  }

  function setText(size, color) {
    let modified = false;

    if (textSize !== size) {
      modified = true;
      textSize = size;
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/text/size`, textSize);
      document.querySelector('.toolbar .text-size').value = textSize;
    }

    if (textColor !== color) {
      modified = true;
      textColor = color;
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/text/color`, textColor);

      let selected = document.querySelector('.toolbar .text-color.color-selected');
      if (selected) {
        selected.classList.remove('color-selected');
        selected.removeAttribute('aria-selected');
      }

      selected = document.querySelector(`.toolbar .text-color[data-color="${color}"]`);
      if (selected) {
        selected.classList.add('color-selected');
        selected.setAttribute('aria-selected', true);
      }

    }

    if (modified) {
      UI.setText(textSize, textColor);
    }
  }

  function handleTextSizeChange(e) {
    setText(e.target.value, textColor);
  }

  document.querySelector('.toolbar .text-size').addEventListener('change', handleTextSizeChange);

  initText();
})();

// Pen stuff
(function () {
  let penSize;
  let penColor;

  function initPen() {
    let size = document.querySelector('.toolbar .pen-size');
    for (let i = 0; i < 20; i++) {
      size.appendChild(new Option(i + 1, i + 1));
    }

    setPen(
      localStorage.getItem(`${RENDER_OPTIONS.documentId}/pen/size`) || 1,
      localStorage.getItem(`${RENDER_OPTIONS.documentId}/pen/color`) || '#000000'
    );

    initColorPicker(document.querySelector('.pen-color'), penColor, function (value) {
      setPen(penSize, value);
    });
  }

  function setPen(size, color) {
    let modified = false;

    if (penSize !== size) {
      modified = true;
      penSize = size;
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/pen/size`, penSize);
      document.querySelector('.toolbar .pen-size').value = penSize;
    }

    if (penColor !== color) {
      modified = true;
      penColor = color;
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/pen/color`, penColor);

      let selected = document.querySelector('.toolbar .pen-color.color-selected');
      if (selected) {
        selected.classList.remove('color-selected');
        selected.removeAttribute('aria-selected');
      }

      selected = document.querySelector(`.toolbar .pen-color[data-color="${color}"]`);
      if (selected) {
        selected.classList.add('color-selected');
        selected.setAttribute('aria-selected', true);
      }
    }

    if (modified) {
      UI.setPen(penSize, penColor);
    }
  }

  function handlePenSizeChange(e) {
    setPen(e.target.value, penColor);
  }

  document.querySelector('.toolbar .pen-size').addEventListener('change', handlePenSizeChange);

  initPen();
})();

// Toolbar buttons
(function () {
  let tooltype = localStorage.getItem(`${RENDER_OPTIONS.documentId}/tooltype`) || 'cursor';
  if (tooltype) {
    setActiveToolbarItem(tooltype, document.querySelector(`.toolbar button[data-tooltype=${tooltype}]`));
  }

  function setActiveToolbarItem(type, button) {
    let active = document.querySelector('.toolbar button.active');
    if (active) {
      active.classList.remove('active');

      switch (tooltype) {
        case 'cursor':
          UI.disableEdit();
          break;
        case 'draw':
          UI.disablePen();
          break;
        case 'text':
          UI.disableText();
          break;
        case 'point':
          UI.disablePoint();
          break;
        case 'area':
        case 'highlight':
        case 'strikeout':
          UI.disableRect();
          break;
      }
    }

    if (button) {
      button.classList.add('active');
    }
    if (tooltype !== type) {
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/tooltype`, type);
    }
    tooltype = type;

    switch (type) {
      case 'cursor':
        UI.enableEdit();
        break;
      case 'draw':
        UI.enablePen();
        break;
      case 'text':
        UI.enableText();
        break;
      case 'point':
        UI.enablePoint();
        break;
      case 'area':
      case 'highlight':
      case 'strikeout':
        UI.enableRect(type);
        break;
    }
  }

  function handleToolbarClick(e) {
    if (e.target.nodeName === 'BUTTON') {
      setActiveToolbarItem(e.target.getAttribute('data-tooltype'), e.target);
    }
  }

  document.querySelector('.toolbar').addEventListener('click', handleToolbarClick);
})();

// Scale/rotate
(function () {
  function setScaleRotate(scale, rotate) {
    scale = parseFloat(scale, 10);
    rotate = parseInt(rotate, 10);

    if (RENDER_OPTIONS.scale !== scale || RENDER_OPTIONS.rotate !== rotate) {
      RENDER_OPTIONS.scale = scale;
      RENDER_OPTIONS.rotate = rotate;

      localStorage.setItem(`${RENDER_OPTIONS.documentId}/scale`, RENDER_OPTIONS.scale);
      localStorage.setItem(`${RENDER_OPTIONS.documentId}/rotate`, RENDER_OPTIONS.rotate % 360);

      render();
    }
  }

  function handleScaleChange(e) {
    setScaleRotate(e.target.value, RENDER_OPTIONS.rotate);
  }

  function handleRotateCWClick() {
    setScaleRotate(RENDER_OPTIONS.scale, RENDER_OPTIONS.rotate + 90);
  }

  function handleRotateCCWClick() {
    setScaleRotate(RENDER_OPTIONS.scale, RENDER_OPTIONS.rotate - 90);
  }

  document.querySelector('.toolbar select.scale').value = RENDER_OPTIONS.scale;
  document.querySelector('.toolbar select.scale').addEventListener('change', handleScaleChange);
  document.querySelector('.toolbar .rotate-ccw').addEventListener('click', handleRotateCCWClick);
  document.querySelector('.toolbar .rotate-cw').addEventListener('click', handleRotateCWClick);
})();

// Clear toolbar button
(function () {
  function handleClearClick(e) {
    if (confirm('Are you sure you want to clear annotations?')) {
      for (let i = 0; i < NUM_PAGES; i++) {
        document.querySelector(`div#pageContainer${i + 1} svg.annotationLayer`).innerHTML = '';
      }

      localStorage.removeItem(`${RENDER_OPTIONS.documentId}/annotations`);
    }
  }
  document.querySelector('a.clear').addEventListener('click', handleClearClick);
})();

// Comment stuff
(function (window, document) {
  let commentList = document.querySelector('#comment-wrapper .comment-list-container');
  let commentForm = document.querySelector('#comment-wrapper .comment-list-form');
  let commentText = commentForm.querySelector('input[type="text"]');

  function supportsComments(target) {
    let type = target.getAttribute('data-pdf-annotate-type');
    return ['point', 'highlight', 'area'].indexOf(type) > -1;
  }

  function insertComment(comment) {
    let child = document.createElement('div');
    child.className = 'comment-list-item';
    child.innerHTML = twitter.autoLink(twitter.htmlEscape(comment.content));

    commentList.appendChild(child);
  }

  function handleAnnotationClick(target) {
    if (supportsComments(target)) {
      let documentId = target.parentNode.getAttribute('data-pdf-annotate-document');
      let annotationId = target.getAttribute('data-pdf-annotate-id');

      PDFJSAnnotate.getStoreAdapter().getComments(documentId, annotationId).then((comments) => {
        commentList.innerHTML = '';
        commentForm.style.display = '';
        commentText.focus();

        commentForm.onsubmit = function () {
          PDFJSAnnotate.getStoreAdapter().addComment(documentId, annotationId, commentText.value.trim())
            .then(insertComment)
            .then(() => {
              commentText.value = '';
              commentText.focus();
            });

          return false;
        };

        comments.forEach(insertComment);
      });
    }
  }

  function handleAnnotationBlur(target) {
    if (supportsComments(target)) {
      commentList.innerHTML = '';
      commentForm.style.display = 'none';
      commentForm.onsubmit = null;

      insertComment({ content: 'No comments' });
    }
  }

  UI.addEventListener('annotation:click', handleAnnotationClick);
  UI.addEventListener('annotation:blur', handleAnnotationBlur);
})(window, document);

// Socket server sync listeners
addEventListener('annotation:add', (...args) => {
  console.log('Added annotation');

  const socketObj = {
    syncType: 'add',
    class: 'annotation',
    data: args,
  };
  broadcastVariations(socketObj);
});

addEventListener('annotation:edit', (...args) => {
  console.log('Edited annotation');

  const socketObj = {
    syncType: 'edit',
    class: 'annotation',
    data: args,
  };
  broadcastVariations(socketObj);
});

addEventListener('annotation:delete', (...args) => {
  console.log('Deleted annotation');

  const socketObj = {
    syncType: 'delete',
    class: 'annotation',
    data: args,
  };
  broadcastVariations(socketObj);
});

addEventListener('comment:add', (...args) => {
  console.log('Added comment to annotation');

  const socketObj = {
    syncType: 'add',
    class: 'comment',
    data: args,
  };
  broadcastVariations(socketObj);
});

// FIXME: emitted by no one, yet
addEventListener('comment:delete', (...args) => {
  console.log('Deleted comment');

  const socketObj = {
    syncType: 'add',
    class: 'annotation',
    data: args,
  };
  broadcastVariations(socketObj);
});

// TEST stuff:

document.addEventListener('test', (e) => {
  console.log('Intercepted sync event trigger');
  sync(e.detail, RENDER_OPTIONS, true);
});

/*
 * Trigger event with following sequence:
 *
 * var obj = JSON.parse('[{"type":"strikeout","color":"FF0000","rectangles":[{"y":351.984375,"x":343.30810546875,"width":212.34393310546875,"height":10},{"y":361.9375,"x":317,"width":239.114501953125,"height":8},{"y":361.9375,"x":317,"width":239.09930419921875,"height":10},{"y":371.90625,"x":317,"width":239.118896484375,"height":8},{"y":371.90625,"x":317,"width":239.10498046875,"height":10},{"y":381.859375,"x":317,"width":221.77508544921875,"height":8},{"y":381.859375,"x":317,"width":221.76092529296875,"height":10},{"y":391.828125,"x":328.96875,"width":227.14947509765625,"height":8},{"y":391.828125,"x":328.96875,"width":227.13482666015625,"height":10},{"y":401.796875,"x":317,"width":124.9637451171875,"height":10}],"class":"Annotation","uuid":"67c7aa11-096b-4b46-baf0-02ce275c3cc1","page":1},{"type":"strikeout","color":"FF0000","rectangles":[{"y":351.984375,"x":343.30810546875,"width":212.34393310546875,"height":10},{"y":361.9375,"x":317,"width":239.114501953125,"height":8},{"y":361.9375,"x":317,"width":239.09930419921875,"height":10},{"y":371.90625,"x":317,"width":239.118896484375,"height":8},{"y":371.90625,"x":317,"width":239.10498046875,"height":10},{"y":381.859375,"x":317,"width":221.77508544921875,"height":8},{"y":381.859375,"x":317,"width":221.76092529296875,"height":10},{"y":391.828125,"x":328.96875,"width":227.14947509765625,"height":8},{"y":391.828125,"x":328.96875,"width":227.13482666015625,"height":10},{"y":401.796875,"x":317,"width":124.9637451171875,"height":10}],"class":"Annotation","uuid":"ea298afe-3aff-44b0-b0ab-31d619b98f75","page":1},{"type":"area","x":309,"y":412,"width":248,"height":129,"class":"Annotation","uuid":"c827fedb-03d3-479b-a943-943c87bb7426","page":1},{"class":"Comment","uuid":"0e3b880b-01ac-4d06-ba71-f27bef9cfa0a","annotation":"c827fedb-03d3-479b-a943-943c87bb7426","content":"bduibcduil"}]');
 * document.dispatchEvent(new CustomEvent('test', { detail: obj }));
 *
 */