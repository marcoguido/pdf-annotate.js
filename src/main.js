import twitter from 'twitter-text';
import PDFJSAnnotate from '../';
import initColorPicker from '../shared/initColorPicker';
import sync from './utils/syncAnnotations';

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

var test = JSON.parse('[{"type":"strikeout","color":"FF0000","rectangles":[{"y":351.984375,"x":343.30810546875,"width":212.34393310546875,"height":10},{"y":361.9375,"x":317,"width":239.114501953125,"height":8},{"y":361.9375,"x":317,"width":239.09930419921875,"height":10},{"y":371.90625,"x":317,"width":239.118896484375,"height":8},{"y":371.90625,"x":317,"width":239.10498046875,"height":10},{"y":381.859375,"x":317,"width":221.77508544921875,"height":8},{"y":381.859375,"x":317,"width":221.76092529296875,"height":10},{"y":391.828125,"x":328.96875,"width":227.14947509765625,"height":8},{"y":391.828125,"x":328.96875,"width":227.13482666015625,"height":10},{"y":401.796875,"x":317,"width":124.9637451171875,"height":10}],"class":"Annotation","uuid":"67c7aa11-096b-4b46-baf0-02ce275c3cc1","page":1},{"type":"strikeout","color":"FF0000","rectangles":[{"y":351.984375,"x":343.30810546875,"width":212.34393310546875,"height":10},{"y":361.9375,"x":317,"width":239.114501953125,"height":8},{"y":361.9375,"x":317,"width":239.09930419921875,"height":10},{"y":371.90625,"x":317,"width":239.118896484375,"height":8},{"y":371.90625,"x":317,"width":239.10498046875,"height":10},{"y":381.859375,"x":317,"width":221.77508544921875,"height":8},{"y":381.859375,"x":317,"width":221.76092529296875,"height":10},{"y":391.828125,"x":328.96875,"width":227.14947509765625,"height":8},{"y":391.828125,"x":328.96875,"width":227.13482666015625,"height":10},{"y":401.796875,"x":317,"width":124.9637451171875,"height":10}],"class":"Annotation","uuid":"ea298afe-3aff-44b0-b0ab-31d619b98f75","page":1},{"type":"area","x":309,"y":412,"width":248,"height":129,"class":"Annotation","uuid":"c827fedb-03d3-479b-a943-943c87bb7426","page":1},{"class":"Comment","uuid":"0e3b880b-01ac-4d06-ba71-f27bef9cfa0a","annotation":"c827fedb-03d3-479b-a943-943c87bb7426","content":"bduibcduil"},{"type":"drawing","width":8,"color":"#65499D","lines":[[73,650],[76,650],[86,650],[102,650],[121,650],[135,650],[143,650],[149,650],[150,650],[150,653],[142,661],[134,666],[118,671],[104,675],[94,676],[87,676],[84,676],[83,673],[89,668],[109,661],[123,659],[137,659],[146,660],[149,663],[151,666],[151,668],[150,669],[148,669],[146,669],[146,658],[154,645],[165,637],[189,629],[199,630],[209,642],[217,658],[221,671],[224,681],[226,689],[227,693],[228,694],[228,694],[232,694],[238,691],[248,688],[266,687],[280,687],[292,687],[300,688],[307,691],[311,692],[318,693],[323,693],[329,689],[336,671],[340,647],[342,615],[342,586],[340,563],[334,550],[327,542],[317,535],[302,531],[287,531],[261,535],[237,547],[215,564],[201,576],[190,587],[181,598],[175,609],[175,616],[179,624],[199,637],[232,654],[272,672],[309,689],[332,700],[356,715],[370,724],[382,733],[387,737],[392,740],[399,744],[406,745],[415,745],[428,742],[441,733],[454,721],[463,713],[471,707],[477,703],[480,701],[481,700],[482,700],[482,700],[482,700],[482,699],[482,699],[482,699],[482,698],[481,698]],"class":"Annotation","uuid":"04c82a1c-1d5f-41d4-8295-9878fb447a27","page":1},{"type":"drawing","width":8,"color":"#65499D","lines":[[260,419],[260,417],[268,406],[274,398],[296,372],[299,368],[300,367],[300,366],[300,365],[300,365],[295,368],[287,377],[280,391],[276,411],[276,443],[285,471],[304,499],[321,513],[338,524],[343,528],[350,531],[352,533],[347,535],[323,538],[279,541],[244,542],[215,542],[199,542],[187,540],[184,539],[184,537],[184,536],[186,536],[188,536],[188,536],[168,542],[134,554],[118,558],[96,561],[85,561],[80,554],[82,537],[96,511],[118,482],[133,464],[144,453],[156,445],[163,443],[166,443],[168,446],[170,451],[172,461],[173,475],[175,495],[179,511],[186,528],[198,542],[207,550],[219,557],[236,562],[240,562],[246,563],[247,563],[247,563],[245,564],[243,564],[240,565],[239,566],[241,566],[246,566],[259,560],[272,555],[285,548],[288,546],[292,544],[293,544],[293,545],[293,551],[294,559],[294,566],[294,572],[295,575]],"class":"Annotation","uuid":"3851fbe0-ad09-4176-93b1-85f4d87d030a","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[428,210],[428,217],[428,226],[428,238],[428,250],[428,272],[426,283],[419,297],[411,307],[400,312],[388,312],[377,312],[370,308],[362,299],[358,285],[358,277],[361,270],[367,266],[376,264],[391,264],[405,267],[426,280],[448,296],[472,315],[488,328],[508,344],[528,356],[538,360],[545,362],[550,362],[555,358],[560,351],[565,343],[570,331],[574,318],[576,310],[577,303],[578,300],[578,298]],"class":"Annotation","uuid":"ca8fea89-da57-408d-a36f-2420f16ef15a","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[180,393],[180,391],[180,387],[174,369],[169,348],[163,321],[163,280],[163,239],[168,213],[182,191],[204,172],[224,161],[250,153],[274,151],[291,152],[299,158],[306,169],[305,184],[284,203],[269,212],[258,217],[249,221],[245,222],[244,222],[244,220],[252,213],[260,208],[271,205],[281,204],[288,206],[293,214],[297,250],[291,268],[280,286],[271,295],[260,301],[255,302],[250,302],[247,302],[246,301],[246,298],[246,294],[247,292],[249,289],[250,288],[250,288],[251,288],[250,288],[249,287],[246,284],[245,283],[243,281],[242,280],[241,279],[240,278],[240,277],[240,277],[240,277],[240,276]],"class":"Annotation","uuid":"141c59b2-b45c-4ae3-a674-286a30bc787a","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[458,462],[458,467],[458,487],[458,519],[458,547],[458,564],[458,571],[458,573],[454,573],[427,544],[414,509],[403,454],[403,404],[412,366],[433,335],[462,308],[500,283],[527,270],[534,268],[544,264],[548,262],[549,262],[550,262],[550,262]],"class":"Annotation","uuid":"9ad2c479-08b3-43c5-91d5-c5e943d4d991","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[361,631],[359,637],[359,648],[359,658],[359,667],[359,673],[364,676],[372,677],[385,677],[399,677],[412,676],[431,672],[442,669],[455,667],[462,666],[468,666],[471,666],[473,668],[474,673],[474,674],[474,676],[473,676],[471,677],[466,677],[458,677],[447,677],[435,677],[424,677],[415,673],[409,660],[413,612],[425,585],[441,556],[453,537],[459,527],[467,516],[473,507],[479,500],[484,493],[488,488],[491,484],[493,481],[494,480],[495,479],[495,479],[495,479],[495,479],[495,479],[494,479]],"class":"Annotation","uuid":"421a3f36-1838-4bd7-a956-174670f54bf2","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[93,308],[99,304],[128,285],[169,254],[194,237],[224,215],[232,210],[241,202],[249,197],[251,194],[253,193]],"class":"Annotation","uuid":"bd422fb0-81d5-425f-be93-a9d02207f810","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[168,302],[172,301],[179,299],[186,295],[190,292],[197,288],[198,288],[199,288],[200,288],[200,288],[199,288]],"class":"Annotation","uuid":"43766510-3afd-4738-b2a1-4e1237a6d27e","page":3},{"type":"drawing","width":8,"color":"#65499D","lines":[[125,226],[128,226],[135,231],[148,240],[164,252],[172,260],[172,260],[180,268],[182,271],[184,275],[187,282],[192,288],[196,292],[198,295],[200,297],[201,298],[202,299],[202,299],[202,299],[202,300],[203,301],[204,303],[205,303],[205,304],[205,305],[206,305],[206,306],[207,308],[209,311],[213,316],[217,321],[219,324],[222,327],[224,330],[225,332],[227,334],[229,336],[230,337],[230,338],[231,338],[231,339]],"class":"Annotation","uuid":"e6a93e88-3c76-4983-899d-06d3aa2bd86e","page":3}]');
document.addEventListener('test', (e) => {
  console.log('Intercepted sync event trigger');
  sync(test);
});